"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { scoreSubmission, type RawAnswer, type ScorableQuestion } from "@/lib/scoring";
import type { Assessment } from "@/lib/types";

export type TakeActionState = { error: string } | undefined;

type QuestionRow = ScorableQuestion & { position: number };

const respondentSchema = z.object({
  assessment_id: z.string().uuid(),
  respondent_name: z.string().trim().min(1, "Enter your name.").max(200),
  respondent_email: z
    .union([z.literal(""), z.string().trim().email("That email address is not valid.")])
    .optional(),
});

/**
 * Reads the answers out of the submitted form.
 *
 * Field names are derived from the question id so the form needs no client-side
 * state: `q:<id>` holds a radio value or a numeric value, and
 * `q:<id>:<optionId>` is a checkbox for multiple choice.
 */
function readAnswers(formData: FormData, questions: QuestionRow[]): RawAnswer[] {
  return questions.map((question) => {
    if (question.kind === "numeric") {
      const raw = String(formData.get(`q:${question.id}`) ?? "").trim();
      const value = raw === "" || Number.isNaN(Number(raw)) ? null : Number(raw);
      return { questionId: question.id, selectedOptionIds: [], numericValue: value };
    }

    if (question.kind === "single_choice") {
      const selected = formData.get(`q:${question.id}`);
      return {
        questionId: question.id,
        selectedOptionIds: typeof selected === "string" && selected ? [selected] : [],
        numericValue: null,
      };
    }

    const selectedOptionIds = question.options
      .map((option) => option.id)
      .filter((optionId) => formData.get(`q:${question.id}:${optionId}`) !== null);

    return { questionId: question.id, selectedOptionIds, numericValue: null };
  });
}

export async function submitAssessment(
  _prev: TakeActionState,
  formData: FormData,
): Promise<TakeActionState> {
  const parsed = respondentSchema.safeParse({
    assessment_id: formData.get("assessment_id"),
    respondent_name: formData.get("respondent_name"),
    respondent_email: formData.get("respondent_email") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = createAdminClient();

  // Re-read the assessment server-side: the submitter is not trusted to say
  // whether it is still published, and the answer key is read here, never sent.
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, pass_score, status")
    .eq("id", parsed.data.assessment_id)
    .maybeSingle<Pick<Assessment, "id" | "pass_score" | "status">>();

  if (!assessment || assessment.status !== "published") {
    return { error: "This assessment is no longer accepting responses." };
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, kind, points, position, numeric_answer, numeric_tolerance, options(id, is_correct)")
    .eq("assessment_id", assessment.id)
    .order("position", { ascending: true })
    .returns<QuestionRow[]>();

  if (!questions || questions.length === 0) {
    return { error: "This assessment has no questions yet." };
  }

  const answers = readAnswers(formData, questions);
  const result = scoreSubmission(questions, answers, assessment.pass_score);

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      assessment_id: assessment.id,
      respondent_name: parsed.data.respondent_name,
      respondent_email: parsed.data.respondent_email || null,
      total_points: result.totalPoints,
      max_points: result.maxPoints,
      percentage: result.percentage,
      passed: result.passed,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return { error: submissionError?.message ?? "Could not record the submission." };
  }

  const { error: answersError } = await supabase.from("answers").insert(
    result.answers.map((answer) => ({
      submission_id: submission.id,
      question_id: answer.questionId,
      selected_option_ids: answer.selectedOptionIds,
      numeric_value: answer.numericValue,
      awarded_points: answer.awardedPoints,
      correct: answer.correct,
    })),
  );

  if (answersError) {
    // Keep the two tables consistent rather than leaving a scored submission
    // with no answers behind it.
    await supabase.from("submissions").delete().eq("id", submission.id);
    return { error: answersError.message };
  }

  redirect(`/a/${assessment.id}/result/${submission.id}`);
}
