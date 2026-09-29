import type { MatchResult } from './score';

/** Plain-text/Markdown summary of a result, for copying into notes or a tracker. */
export function formatReport(result: MatchResult, title = 'Resume match'): string {
  const pct = (n: number | null) => (n === null ? 'n/a' : `${Math.round(n * 100)}%`);
  const names = (xs: { label: string }[]) => (xs.length ? xs.map((x) => x.label).join(', ') : 'none');
  const lines = [
    `# ${title}: ${result.score}/100 (${result.verdict})`,
    '',
    '## Breakdown',
    ...result.components.map(
      (c) => `- ${c.label}: ${pct(c.score)}${c.weight ? ` (weight ${Math.round(c.weight * 100)}%)` : ''} - ${c.detail}`,
    ),
    '',
    '## Skills',
    `- Required, matched: ${names(result.required.matched)}`,
    `- Required, missing: ${names(result.required.missing)}`,
    `- Nice-to-have, matched: ${names(result.preferred.matched)}`,
    `- Nice-to-have, missing: ${names(result.preferred.missing)}`,
    '',
    '## Keywords',
    `- Present: ${result.keywords.matched.join(', ') || 'none'}`,
    `- Missing: ${result.keywords.missing.join(', ') || 'none'}`,
    '',
    '## Suggestions',
    ...result.suggestions.map((sg) => `- [${sg.priority}] ${sg.text}`),
  ];
  return lines.join('\n');
}
