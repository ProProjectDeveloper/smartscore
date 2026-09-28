import { test } from "node:test";
import assert from "node:assert/strict";

import { scoreSubmission, type ScorableQuestion } from "./scoring.ts";

function singleChoice(id: string, points = 10): ScorableQuestion {
  return {
    id,
    kind: "single_choice",
    points,
    numeric_answer: null,
    numeric_tolerance: null,
    options: [
      { id: `${id}-a`, is_correct: true },
      { id: `${id}-b`, is_correct: false },
    ],
  };
}

function multiChoice(id: string, points = 9): ScorableQuestion {
  return {
    id,
    kind: "multi_choice",
    points,
    numeric_answer: null,
    numeric_tolerance: null,
    options: [
      { id: `${id}-a`, is_correct: true },
      { id: `${id}-b`, is_correct: true },
      { id: `${id}-c`, is_correct: true },
      { id: `${id}-d`, is_correct: false },
    ],
  };
}

function numeric(id: string, answer: number, tolerance: number | null): ScorableQuestion {
  return {
    id,
    kind: "numeric",
    points: 5,
    numeric_answer: answer,
    numeric_tolerance: tolerance,
    options: [],
  };
}

test("awards full points for a correct single-choice answer", () => {
  const result = scoreSubmission(
    [singleChoice("q1")],
    [{ questionId: "q1", selectedOptionIds: ["q1-a"], numericValue: null }],
    70,
  );

  assert.equal(result.totalPoints, 10);
  assert.equal(result.maxPoints, 10);
  assert.equal(result.percentage, 100);
  assert.equal(result.passed, true);
  assert.equal(result.answers[0]!.correct, true);
});

test("scores zero when a single-choice question has several options selected", () => {
  const result = scoreSubmission(
    [singleChoice("q1")],
    [{ questionId: "q1", selectedOptionIds: ["q1-a", "q1-b"], numericValue: null }],
    70,
  );

  assert.equal(result.totalPoints, 0);
  assert.equal(result.passed, false);
});

test("gives partial credit on multi-choice answers", () => {
  const result = scoreSubmission(
    [multiChoice("q1")],
    [{ questionId: "q1", selectedOptionIds: ["q1-a", "q1-b"], numericValue: null }],
    70,
  );

  // Two of three correct options at 3 points each.
  assert.equal(result.totalPoints, 6);
  assert.equal(result.answers[0]!.correct, false);
});

test("cancels out an incorrect multi-choice selection", () => {
  const result = scoreSubmission(
    [multiChoice("q1")],
    [{ questionId: "q1", selectedOptionIds: ["q1-a", "q1-b", "q1-d"], numericValue: null }],
    70,
  );

  // (2 correct - 1 incorrect) * 3 points.
  assert.equal(result.totalPoints, 3);
});

test("never scores below zero when everything is selected", () => {
  const question: ScorableQuestion = {
    id: "q1",
    kind: "multi_choice",
    points: 6,
    numeric_answer: null,
    numeric_tolerance: null,
    options: [
      { id: "a", is_correct: true },
      { id: "b", is_correct: false },
      { id: "c", is_correct: false },
      { id: "d", is_correct: false },
    ],
  };

  const result = scoreSubmission(
    [question],
    [{ questionId: "q1", selectedOptionIds: ["a", "b", "c", "d"], numericValue: null }],
    70,
  );

  assert.equal(result.totalPoints, 0);
});

test("accepts a numeric answer inside the tolerance", () => {
  const result = scoreSubmission(
    [numeric("q1", 100, 5)],
    [{ questionId: "q1", selectedOptionIds: [], numericValue: 96 }],
    70,
  );

  assert.equal(result.totalPoints, 5);
  assert.equal(result.answers[0]!.correct, true);
});

test("rejects a numeric answer outside the tolerance", () => {
  const result = scoreSubmission(
    [numeric("q1", 100, 5)],
    [{ questionId: "q1", selectedOptionIds: [], numericValue: 80 }],
    70,
  );

  assert.equal(result.totalPoints, 0);
});

test("requires an exact numeric match when no tolerance is set", () => {
  const exact = scoreSubmission(
    [numeric("q1", 42, null)],
    [{ questionId: "q1", selectedOptionIds: [], numericValue: 42 }],
    70,
  );
  const off = scoreSubmission(
    [numeric("q1", 42, null)],
    [{ questionId: "q1", selectedOptionIds: [], numericValue: 42.5 }],
    70,
  );

  assert.equal(exact.totalPoints, 5);
  assert.equal(off.totalPoints, 0);
});

test("treats unanswered questions as zero but still counts them in the maximum", () => {
  const result = scoreSubmission([singleChoice("q1"), singleChoice("q2")], [], 70);

  assert.equal(result.totalPoints, 0);
  assert.equal(result.maxPoints, 20);
  assert.equal(result.percentage, 0);
  assert.equal(result.answers.length, 2);
});

test("passes exactly on the pass mark", () => {
  const result = scoreSubmission(
    [singleChoice("q1", 7), singleChoice("q2", 3)],
    [{ questionId: "q1", selectedOptionIds: ["q1-a"], numericValue: null }],
    70,
  );

  assert.equal(result.percentage, 70);
  assert.equal(result.passed, true);
});

test("an assessment with no questions scores zero and does not pass", () => {
  const result = scoreSubmission([], [], 0);

  assert.equal(result.maxPoints, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.passed, false);
});

test("ignores an answer to a question that is not on the assessment", () => {
  const result = scoreSubmission(
    [singleChoice("q1")],
    [
      { questionId: "q1", selectedOptionIds: ["q1-a"], numericValue: null },
      { questionId: "ghost", selectedOptionIds: ["x"], numericValue: null },
    ],
    70,
  );

  assert.equal(result.answers.length, 1);
  assert.equal(result.totalPoints, 10);
});

test("scores zero for a choice question with no correct option configured", () => {
  const broken: ScorableQuestion = {
    id: "q1",
    kind: "single_choice",
    points: 4,
    numeric_answer: null,
    numeric_tolerance: null,
    options: [
      { id: "a", is_correct: false },
      { id: "b", is_correct: false },
    ],
  };

  const result = scoreSubmission(
    [broken],
    [{ questionId: "q1", selectedOptionIds: ["a"], numericValue: null }],
    70,
  );

  assert.equal(result.totalPoints, 0);
});
