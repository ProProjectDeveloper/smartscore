import { SKILLS, type Skill } from './skills';
import { STOPWORDS, escapeRegExp, normalizeText, stem, tokenize } from './text';

/** One regex per skill, alternating its aliases longest-first. */
const SKILL_PATTERNS: ReadonlyArray<{ skill: Skill; pattern: RegExp }> = SKILLS.map((skill) => {
  const alternation = [...skill.aliases]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return {
    skill,
    pattern: new RegExp(`(?<![a-z0-9+#.])(?:${alternation})(?!\\.?[a-z0-9+#])`, 'g'),
  };
});

/** Returns canonical skill id -> number of mentions in `text`. */
export function findSkills(text: string): Map<string, number> {
  const norm = normalizeText(text);
  const found = new Map<string, number>();
  if (!norm) return found;
  for (const { skill, pattern } of SKILL_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = norm.match(pattern);
    if (matches && matches.length > 0) found.set(skill.id, matches.length);
  }
  return found;
}

const PREFERRED_HEADING =
  /\b(preferred|nice[\s-]to[\s-]haves?|bonus(?:\s+points)?|pluses|desired|desirable|good[\s-]to[\s-]have|extra credit)\b/i;
const REQUIRED_HEADING =
  /\b(requirements?|required|qualifications|must[\s-]haves?|what you('|’)ll need|what you bring|what we('|’)re looking for|who you are|about you|responsibilities|what you('|’)ll do|skills)\b/i;
const PREFERRED_INLINE = /\b(preferred|nice[\s-]to[\s-]have|a plus|is a plus|bonus|desirable|ideally|not required)\b/i;

function isHeading(line: string): boolean {
  const trimmed = line.trim().replace(/^[#*\-\s]+/, '');
  if (!trimmed || trimmed.length > 60) return false;
  if (/:\s*$/.test(trimmed)) return true;
  return trimmed.split(/\s+/).length <= 6 && !/[.!?]$/.test(trimmed);
}

export interface JobSkills {
  /** skill id -> mentions within required context */
  required: Map<string, number>;
  /** skill id -> mentions within preferred context (never overlaps `required`) */
  preferred: Map<string, number>;
}

/**
 * Splits the skills in a job description into required vs. preferred, using
 * section headings ("Preferred qualifications", "Nice to have") and inline
 * cues ("... is a plus"). Anything not clearly preferred counts as required.
 */
export function extractJobSkills(jobText: string): JobSkills {
  const required = new Map<string, number>();
  const preferred = new Map<string, number>();
  let section: 'required' | 'preferred' = 'required';

  for (const line of jobText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (isHeading(line)) {
      if (PREFERRED_HEADING.test(line)) section = 'preferred';
      else if (REQUIRED_HEADING.test(line)) section = 'required';
    }
    // A heading line can also carry content ("Nice to have: Kafka, Redis").
    // Inline cues ("... is a plus") apply per sentence, not to the whole line.
    for (const sentence of line.split(/(?<=[.;!?])\s+/)) {
      const bucket = section === 'preferred' || PREFERRED_INLINE.test(sentence) ? preferred : required;
      for (const [id, count] of findSkills(sentence)) {
        bucket.set(id, (bucket.get(id) ?? 0) + count);
      }
    }
  }

  for (const [id, count] of preferred) {
    if (required.has(id)) {
      required.set(id, (required.get(id) ?? 0) + count);
      preferred.delete(id);
    }
  }
  return { required, preferred };
}

const YEARS_REQUIRED =
  /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b/g;

/** Minimum years of experience a job description asks for, or null. */
export function extractRequiredYears(jobText: string): number | null {
  let best: number | null = null;
  for (const sentence of jobText.toLowerCase().split(/[\n.;]+/)) {
    if (!/experience|professional|industry|background/.test(sentence)) continue;
    for (const m of sentence.matchAll(YEARS_REQUIRED)) {
      const years = Number(m[1]);
      if (years > 0 && years <= 30 && (best === null || years > best)) best = years;
    }
  }
  return best;
}

const EXPLICIT_YEARS =
  /(\d{1,2})\s*(?:\+|plus)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|industry\s+|hands[\s-]on\s+|relevant\s+|total\s+)?experience/g;
const DATE_RANGE =
  /\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:[a-z]{3,9}\.?\s+)?(?:\d{1,2}\/)?((?:19|20)\d{2}|present|current|now|today)\b/g;

/**
 * Estimates years of experience in a resume: the larger of any explicit
 * claim ("7 years of experience") and the union of dated role ranges
 * ("2018 - Present"). Overlapping ranges are merged, not double counted.
 */
export function estimateResumeYears(resumeText: string, now: Date = new Date()): number | null {
  const text = resumeText.toLowerCase();
  const currentYear = now.getFullYear();

  let explicit: number | null = null;
  for (const m of text.matchAll(EXPLICIT_YEARS)) {
    const years = Number(m[1]);
    if (years > 0 && years <= 50 && (explicit === null || years > explicit)) explicit = years;
  }

  const ranges: Array<[number, number]> = [];
  for (const m of text.matchAll(DATE_RANGE)) {
    const start = Number(m[1]);
    const end = /^\d/.test(m[2]) ? Number(m[2]) : currentYear;
    if (start <= end && end <= currentYear + 1) ranges.push([start, end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let fromRanges = 0;
  let cur: [number, number] | null = null;
  for (const r of ranges) {
    if (cur && r[0] <= cur[1]) {
      cur[1] = Math.max(cur[1], r[1]);
    } else {
      if (cur) fromRanges += cur[1] - cur[0];
      cur = [r[0], r[1]];
    }
  }
  if (cur) fromRanges += cur[1] - cur[0];

  if (explicit === null && ranges.length === 0) return null;
  return Math.max(explicit ?? 0, fromRanges);
}

function aliasTokens(skillIds: Iterable<string>): Set<string> {
  const ids = new Set(skillIds);
  const out = new Set<string>();
  for (const skill of SKILLS) {
    if (!ids.has(skill.id)) continue;
    for (const alias of skill.aliases) for (const t of alias.split(' ')) out.add(stem(t));
  }
  return out;
}

function isKeywordCandidate(token: string): boolean {
  return token.length >= 3 && !STOPWORDS.has(token) && /[a-z]/.test(token) && !/^\d/.test(token);
}

export interface Keyword {
  /** stemmed form used for matching */
  stem: string;
  /** most frequent surface form, for display */
  word: string;
  count: number;
}

/**
 * Lowercased words that look like proper nouns (company or product names):
 * every occurrence is capitalized and at least one is mid-sentence.
 */
export function properNouns(text: string): Set<string> {
  const capitalizedMid = new Set<string>();
  const seenLower = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((raw, i) => {
      const word = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
      if (!word) return;
      const lower = word.toLowerCase();
      if (/^[a-z]/.test(word)) {
        seenLower.add(lower);
        return;
      }
      const prev = i === 0 ? '' : words[i - 1];
      const sentenceStart = i === 0 || (i === 1 && /^[-*\u2022]+$/.test(prev)) || /[.!?:]$/.test(prev);
      if (!sentenceStart) capitalizedMid.add(lower);
    });
  }
  return new Set([...capitalizedMid].filter((w) => !seenLower.has(w)));
}

/**
 * Most frequent meaningful terms in a job description, excluding words that
 * are already covered by detected skills and likely proper nouns (such as the
 * employer's name). Ties keep first-appearance order.
 */
export function extractKeywords(jobText: string, limit = 15): Keyword[] {
  const skillTokens = aliasTokens(findSkills(jobText).keys());
  const names = properNouns(jobText);
  const byStem = new Map<string, { count: number; forms: Map<string, number>; first: number }>();
  tokenize(jobText).forEach((token, index) => {
    if (!isKeywordCandidate(token) || names.has(token)) return;
    const st = stem(token);
    if (skillTokens.has(st) || STOPWORDS.has(st)) return;
    const entry = byStem.get(st) ?? { count: 0, forms: new Map<string, number>(), first: index };
    entry.count += 1;
    entry.forms.set(token, (entry.forms.get(token) ?? 0) + 1);
    byStem.set(st, entry);
  });
  return [...byStem.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, limit)
    .map(([st, e]) => ({
      stem: st,
      word: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: e.count,
    }));
}

/** Set of stemmed tokens in a text, for keyword lookups. */
export function stemSet(text: string): Set<string> {
  return new Set(tokenize(text).map(stem));
}
