import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Assessment, PublicQuestion } from "@/lib/types";

/**
 * Loads a published assessment and its questions with the answer key removed.
 *
 * This runs with the service role because respondents are not signed in. Only
 * published assessments are returned, and `is_correct` is dropped before the
 * data can reach the browser.
 *
 * Deliberately not a Server Action: every export of a `"use server"` module is
 * reachable as an endpoint, and these loaders only need to run during render.
 */
export async function loadPublicAssessment(
  assessmentId: string,
): Promise<{ assessment: Assessment; questions: PublicQuestion[] } | null> {
  const supabase = createAdminClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .eq("status", "published")
    .maybeSingle<Assessment>();

  if (!assessment) {
    return null;
  }

  const { data: rows } = await supabase
    .from("questions")
    .select("id, prompt, kind, points, position, options(id, label, position)")
    .eq("assessment_id", assessmentId)
    .order("position", { ascending: true })
    .returns<
      Array<{
        id: string;
        prompt: string;
        kind: PublicQuestion["kind"];
        points: number;
        position: number;
        options: Array<{ id: string; label: string; position: number }>;
      }>
    >();

  const questions: PublicQuestion[] = (rows ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    kind: row.kind,
    points: row.points,
    position: row.position,
    options: [...row.options].sort((a, b) => a.position - b.position),
  }));

  return { assessment, questions };
}

export type SubmissionResult = {
  id: string;
  respondent_name: string;
  total_points: number;
  max_points: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
};

/**
 * Loads a finished submission for the respondent's own result page.
 *
 * The submission id is an unguessable UUID, which is what gates access -- the
 * respondent has no account to authenticate against.
 */
export async function loadSubmissionResult(assessmentId: string, submissionId: string) {
  const supabase = createAdminClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, respondent_name, total_points, max_points, percentage, passed, submitted_at")
    .eq("id", submissionId)
    .eq("assessment_id", assessmentId)
    .maybeSingle<SubmissionResult>();

  if (!submission) {
    return null;
  }

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title, pass_score")
    .eq("id", assessmentId)
    .maybeSingle<Pick<Assessment, "id" | "title" | "pass_score">>();

  if (!assessment) {
    return null;
  }

  return { assessment, submission };
}
