/** Words ignored when extracting free-form keywords. */
export const STOPWORDS: ReadonlySet<string> = new Set(
  (
    'a about above across after again against all also am an and any are as at be because been before being ' +
    'below between both but by can could did do does doing down during each either else etc ever every few for ' +
    'from further get gets getting had has have having he her here hers him his how however i if in into is it ' +
    'its itself just like may me more most must my myself no nor not now of off on once one only or other our ' +
    'ours out over own per same she should so some such than that the their theirs them then there these they ' +
    'this those through to too under until up upon us very via was we well were what when where whether which ' +
    'while who whom why will with within without would yet you your yours ' +
    // Job-posting boilerplate that says nothing about fit.
    'ability able applicant applicants apply benefits candidate candidates company including role position ' +
    'job opportunity team teams work working years year experience experienced strong excellent good great ' +
    'plus preferred required requirements responsibilities qualifications ideal looking join new using use ' +
    'knowledge skills skill understanding familiarity familiar proficiency proficient related relevant ' +
    'equivalent degree bachelor bachelors master masters etc least minimum day days help make across ' +
    'environment based within various multiple key high highly level wide range world class best nice ' +
    'bonus desired desirable ideally must haves'
  ).split(/\s+/),
);

/**
 * Lowercases text and reduces punctuation to spaces while preserving the
 * characters that are meaningful inside tech names: `+` (C++), `#` (C#) and
 * `.` when it sits inside a token (node.js, .net, asp.net).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\.(?![a-z0-9])/g, ' ')
    .replace(/(?<![a-z0-9])\.(?!net\b)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits normalized text into tokens. */
export function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  return norm ? norm.split(' ') : [];
}

/** Very small, predictable stemmer: folds common English suffixes. */
export function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 6 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es') && /(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
