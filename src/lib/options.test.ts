import { test } from "node:test";
import assert from "node:assert/strict";

import { formatOptionLines, parseOptionLines } from "./options.ts";

test("marks starred lines as correct and strips the marker", () => {
  assert.deepEqual(parseOptionLines("*Paris\nBerlin"), [
    { label: "Paris", is_correct: true },
    { label: "Berlin", is_correct: false },
  ]);
});

test("ignores blank lines and surrounding whitespace", () => {
  assert.deepEqual(parseOptionLines("  Red  \n\n\t\n* Blue \n"), [
    { label: "Red", is_correct: false },
    { label: "Blue", is_correct: true },
  ]);
});

test("drops a line that is only a marker", () => {
  assert.deepEqual(parseOptionLines("*\nGreen"), [{ label: "Green", is_correct: false }]);
});

test("returns nothing for empty input", () => {
  assert.deepEqual(parseOptionLines("   \n  "), []);
});

test("round-trips through the formatter", () => {
  const source = "*Paris\nBerlin\nMadrid";
  assert.equal(formatOptionLines(parseOptionLines(source)), source);
});
