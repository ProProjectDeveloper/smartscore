import type { QuestionKind } from "@/lib/types";

export type ScorableOption = {
  id: string;
  is_correct: boolean;
};

export type ScorableQuestion = {
  id: string;
  kind: QuestionKind;
  points: number;
  options: ScorableOption[];
  numeric_answer: number | null;
  numeric_tolerance: number | null;
};

export type RawAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  numericValue: number | null;
};

export type ScoredAnswer = RawAnswer & {
  awardedPoints: number;
  correct: boolean;
};

export type ScoreResult = {
  answers: ScoredAnswer[];
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
};

/** Rounds to two decimals, which is as fine-grained as partial credit gets. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Scores one question.
 *
 * - `single_choice`: full points when the single selected option is the correct
 *   one. Selecting several options scores zero -- the respondent was asked for
 *   one answer.
 * - `multi_choice`: partial credit. Each correct option selected earns its
 *   share of the points and each incorrect one cancels a share out, floored at
 *   zero so a respondent cannot go negative by selecting everything.
 * - `numeric`: full points when the value is within `numeric_tolerance` of
 *   `numeric_answer`. A null tolerance means an exact match.
 */
function scoreQuestion(question: ScorableQuestion, answer: RawAnswer | undefined) {
  if (!answer) {
    return { awardedPoints: 0, correct: false };
  }

  if (question.kind === "numeric") {
    if (answer.numericValue === null || question.numeric_answer === null) {
      return { awardedPoints: 0, correct: false };
    }
    const tolerance = question.numeric_tolerance ?? 0;
    const correct = Math.abs(answer.numericValue - question.numeric_answer) <= tolerance;
    return { awardedPoints: correct ? question.points : 0, correct };
  }

  const selected = new Set(answer.selectedOptionIds);
  const correctIds = question.options.filter((o) => o.is_correct).map((o) => o.id);

  // A question with no correct option cannot be scored; treat it as unearned
  // rather than silently awarding the points.
  if (correctIds.length === 0) {
    return { awardedPoints: 0, correct: false };
  }

  if (question.kind === "single_choice") {
    const correct = selected.size === 1 && correctIds.includes([...selected][0]!);
    return { awardedPoints: correct ? question.points : 0, correct };
  }

  const correctSelected = correctIds.filter((id) => selected.has(id)).length;
  const incorrectSelected = question.options.filter(
    (o) => !o.is_correct && selected.has(o.id),
  ).length;

  const share = question.points / correctIds.length;
  const awardedPoints = Math.max(0, round((correctSelected - incorrectSelected) * share));
  const correct = correctSelected === correctIds.length && incorrectSelected === 0;

  return { awardedPoints, correct };
}

/**
 * Scores a whole submission.
 *
 * `passScore` is a percentage, matching `assessments.pass_score`.
 */
export function scoreSubmission(
  questions: ScorableQuestion[],
  answers: RawAnswer[],
  passScore: number,
): ScoreResult {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const scored: ScoredAnswer[] = questions.map((question) => {
    const answer = byQuestion.get(question.id);
    const { awardedPoints, correct } = scoreQuestion(question, answer);

    return {
      questionId: question.id,
      selectedOptionIds: answer?.selectedOptionIds ?? [],
      numericValue: answer?.numericValue ?? null,
      awardedPoints,
      correct,
    };
  });

  const totalPoints = round(scored.reduce((sum, a) => sum + a.awardedPoints, 0));
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = maxPoints === 0 ? 0 : round((totalPoints / maxPoints) * 100);

  return {
    answers: scored,
    totalPoints,
    maxPoints,
    percentage,
    passed: maxPoints > 0 && percentage >= passScore,
  };
}
