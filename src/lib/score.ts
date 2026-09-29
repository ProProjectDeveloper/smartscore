import {
  estimateResumeYears,
  extractJobSkills,
  extractKeywords,
  extractRequiredYears,
  findSkills,
  stemSet,
} from './extract';
import { SKILL_BY_ID, type SkillCategory } from './skills';
import { countWords } from './text';

export interface SkillMatch {
  id: string;
  label: string;
  category: SkillCategory;
  jobMentions: number;
  resumeMentions: number;
}

export type ComponentKey = 'required' | 'preferred' | 'keywords' | 'experience';

export interface ComponentScore {
  key: ComponentKey;
  label: string;
  /** 0..1, or null when the job description gives nothing to score against */
  score: number | null;
  /** share of the overall score, 0..1 (0 when score is null) */
  weight: number;
  detail: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Suggestion {
  priority: Priority;
  text: string;
}

export interface MatchResult {
  /** 0..100 */
  score: number;
  verdict: string;
  components: ComponentScore[];
  required: { matched: SkillMatch[]; missing: SkillMatch[] };
  preferred: { matched: SkillMatch[]; missing: SkillMatch[] };
  /** skills in the resume the posting never mentions */
  extraSkills: SkillMatch[];
  keywords: { matched: string[]; missing: string[] };
  experience: { requiredYears: number | null; resumeYears: number | null };
  suggestions: Suggestion[];
  stats: { resumeWords: number; jobWords: number };
}

/** Base weights; components with nothing to measure are dropped and the rest renormalized. */
export const BASE_WEIGHTS: Record<ComponentKey, number> = {
  required: 50,
  preferred: 15,
  keywords: 25,
  experience: 10,
};

export type Band = 'strong' | 'good' | 'partial' | 'weak';

export function bandFor(score: number): Band {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'partial';
  return 'weak';
}

const VERDICTS: Record<Band, string> = {
  strong: 'Strong match',
  good: 'Good match',
  partial: 'Partial match',
  weak: 'Weak match',
};

export function verdictFor(score: number): string {
  return VERDICTS[bandFor(score)];
}

function toMatch(id: string, jobMentions: number, resumeMentions: number): SkillMatch {
  const skill = SKILL_BY_ID.get(id);
  if (!skill) throw new Error(`Unknown skill id: ${id}`);
  return { id, label: skill.label, category: skill.category, jobMentions, resumeMentions };
}

function bySalience(a: SkillMatch, b: SkillMatch): number {
  return b.jobMentions - a.jobMentions || a.label.localeCompare(b.label);
}

function splitSkills(jobSkills: Map<string, number>, resumeSkills: Map<string, number>) {
  const matched: SkillMatch[] = [];
  const missing: SkillMatch[] = [];
  for (const [id, jobCount] of jobSkills) {
    const resumeCount = resumeSkills.get(id) ?? 0;
    (resumeCount > 0 ? matched : missing).push(toMatch(id, jobCount, resumeCount));
  }
  return { matched: matched.sort(bySalience), missing: missing.sort(bySalience) };
}

const ratio = (hit: number, total: number): number | null => (total === 0 ? null : hit / total);
const list = (items: string[], max = 5): string =>
  items.slice(0, max).join(', ') + (items.length > max ? `, and ${items.length - max} more` : '');

export interface ScoreOptions {
  /** Reference date for "Present" in resume date ranges. */
  now?: Date;
  keywordLimit?: number;
}

/**
 * Scores how well a resume matches a job description. Fully deterministic:
 * the same inputs (and `now`) always produce the same result.
 */
export function scoreMatch(resumeText: string, jobText: string, options: ScoreOptions = {}): MatchResult {
  const resumeSkills = findSkills(resumeText);
  const jobSkills = extractJobSkills(jobText);
  const required = splitSkills(jobSkills.required, resumeSkills);
  const preferred = splitSkills(jobSkills.preferred, resumeSkills);

  const extraSkills = [...resumeSkills.entries()]
    .filter(([id]) => !jobSkills.required.has(id) && !jobSkills.preferred.has(id))
    .map(([id, n]) => toMatch(id, 0, n))
    .sort((a, b) => b.resumeMentions - a.resumeMentions || a.label.localeCompare(b.label));

  const resumeStems = stemSet(resumeText);
  const keywords = { matched: [] as string[], missing: [] as string[] };
  for (const kw of extractKeywords(jobText, options.keywordLimit ?? 15)) {
    (resumeStems.has(kw.stem) ? keywords.matched : keywords.missing).push(kw.word);
  }

  const requiredYears = extractRequiredYears(jobText);
  const resumeYears = estimateResumeYears(resumeText, options.now);
  let experienceScore: number | null = null;
  let experienceDetail = 'No years-of-experience requirement found in the posting.';
  if (requiredYears !== null) {
    if (resumeYears === null) {
      experienceScore = 0.5;
      experienceDetail = `Posting asks for ${requiredYears}+ years; no dates or year counts found in the resume.`;
    } else {
      experienceScore = Math.min(1, resumeYears / requiredYears);
      experienceDetail = `Posting asks for ${requiredYears}+ years; resume shows about ${resumeYears}.`;
    }
  }

  const reqTotal = required.matched.length + required.missing.length;
  const prefTotal = preferred.matched.length + preferred.missing.length;
  const kwTotal = keywords.matched.length + keywords.missing.length;
  const raw: Array<Omit<ComponentScore, 'weight'>> = [
    {
      key: 'required',
      label: 'Required skills',
      score: ratio(required.matched.length, reqTotal),
      detail: reqTotal ? `${required.matched.length} of ${reqTotal} required skills found.` : 'No required skills detected.',
    },
    {
      key: 'preferred',
      label: 'Preferred skills',
      score: ratio(preferred.matched.length, prefTotal),
      detail: prefTotal ? `${preferred.matched.length} of ${prefTotal} nice-to-have skills found.` : 'No nice-to-have skills detected.',
    },
    {
      key: 'keywords',
      label: 'Keyword coverage',
      score: ratio(keywords.matched.length, kwTotal),
      detail: kwTotal ? `${keywords.matched.length} of the top ${kwTotal} posting keywords appear.` : 'No keywords to compare.',
    },
    { key: 'experience', label: 'Experience', score: experienceScore, detail: experienceDetail },
  ];

  const activeWeight = raw.reduce((sum, c) => sum + (c.score === null ? 0 : BASE_WEIGHTS[c.key]), 0);
  const components: ComponentScore[] = raw.map((c) => ({
    ...c,
    weight: c.score === null || activeWeight === 0 ? 0 : BASE_WEIGHTS[c.key] / activeWeight,
  }));
  const stats = { resumeWords: countWords(resumeText), jobWords: countWords(jobText) };
  const hasBothInputs = stats.resumeWords > 0 && stats.jobWords > 0;
  const score = hasBothInputs
    ? Math.round(components.reduce((sum, c) => sum + (c.score ?? 0) * c.weight, 0) * 100)
    : 0;
  const result: MatchResult = {
    score,
    verdict: verdictFor(score),
    components,
    required,
    preferred,
    extraSkills,
    keywords,
    experience: { requiredYears, resumeYears },
    suggestions: [],
    stats,
  };
  result.suggestions = buildSuggestions(result, resumeText);
  return result;
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Turns a result into a short, ordered list of concrete next steps. */
export function buildSuggestions(result: MatchResult, resumeText: string): Suggestion[] {
  const out: Suggestion[] = [];
  const { required, preferred, keywords, experience, stats } = result;

  if (stats.resumeWords === 0 || stats.jobWords === 0) {
    return [{ priority: 'high', text: 'Paste both your resume and the job description to get a score.' }];
  }

  if (required.missing.length > 0) {
    out.push({
      priority: 'high',
      text: `Required skills not found in your resume: ${list(required.missing.map((m) => m.label))}. If you have real experience with them, name them explicitly, ideally in a bullet that shows an outcome.`,
    });
  }
  if (experience.requiredYears !== null) {
    if (experience.resumeYears === null) {
      out.push({
        priority: 'medium',
        text: `The posting asks for ${experience.requiredYears}+ years of experience. Add start and end years to each role so reviewers (and screening software) can see your tenure.`,
      });
    } else if (experience.resumeYears < experience.requiredYears) {
      out.push({
        priority: 'high',
        text: `The posting asks for ${experience.requiredYears}+ years; your resume shows about ${experience.resumeYears}. Include all relevant roles, internships, and substantial projects with dates.`,
      });
    }
  }
  if (preferred.missing.length > 0) {
    out.push({
      priority: 'medium',
      text: `Nice-to-have skills you could highlight if you have them: ${list(preferred.missing.map((m) => m.label))}.`,
    });
  }
  if (keywords.missing.length > 0) {
    out.push({
      priority: 'medium',
      text: `Mirror the posting's language where it is accurate for you. Missing terms: ${list(keywords.missing, 6)}.`,
    });
  }
  if (!/\d+\s*%|\$\s*\d|\d+x\b|\b\d{2,}\b/i.test(resumeText.replace(/\b(19|20)\d{2}\b/g, ''))) {
    out.push({
      priority: 'medium',
      text: 'No quantified results found. Add numbers (percentages, time saved, users, revenue, scale) to your strongest bullets.',
    });
  }
  const thin = required.matched.filter((m) => m.jobMentions >= 2 && m.resumeMentions === 1).map((m) => m.label);
  if (thin.length > 0) {
    out.push({
      priority: 'low',
      text: `The posting emphasizes ${list(thin, 3)}, but your resume mentions ${thin.length === 1 ? 'it' : 'each'} only once. Show it in context, not just in a skills list.`,
    });
  }
  if (stats.resumeWords < 200) {
    out.push({ priority: 'low', text: `Your resume is short (${stats.resumeWords} words). Add detail on scope, tools, and outcomes for recent roles.` });
  } else if (stats.resumeWords > 1200) {
    out.push({ priority: 'low', text: `Your resume is long (${stats.resumeWords} words). Trim older or less relevant content so key matches stand out.` });
  }
  if (out.length === 0) {
    out.push({ priority: 'low', text: 'Strong alignment. Tailor your summary line to this role and lead with your most relevant achievement.' });
  }
  return out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
