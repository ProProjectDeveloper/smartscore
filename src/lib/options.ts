export type ParsedOption = { label: string; is_correct: boolean };

/**
 * Parses the option editor's shorthand: one option per line, where a leading
 * `*` marks the correct one.
 *
 *     *Paris
 *     Berlin
 *     Madrid
 */
export function parseOptionLines(raw: string): ParsedOption[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const is_correct = line.startsWith("*");
      const label = (is_correct ? line.slice(1) : line).trim();
      return { label, is_correct };
    })
    .filter((option) => option.label.length > 0);
}

/** Renders options back into the shorthand, for the edit form. */
export function formatOptionLines(options: ParsedOption[]): string {
  return options.map((o) => (o.is_correct ? `*${o.label}` : o.label)).join("\n");
}
