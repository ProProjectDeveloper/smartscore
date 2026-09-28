export type AssessmentStatus = "draft" | "published" | "archived";
export type QuestionKind = "single_choice" | "multi_choice" | "numeric";

export type Assessment = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: AssessmentStatus;
  pass_score: number;
  created_at: string;
  updated_at: string;
};

export type Option = {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  position: number;
};

export type Question = {
  id: string;
  assessment_id: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  position: number;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
  created_at: string;
};

export type QuestionWithOptions = Question & { options: Option[] };

/** A question as it is safe to send to a respondent: no answer key. */
export type PublicQuestion = Omit<
  Question,
  "numeric_answer" | "numeric_tolerance" | "assessment_id" | "created_at"
> & {
  options: Array<Pick<Option, "id" | "label" | "position">>;
};

export type Submission = {
  id: string;
  assessment_id: string;
  respondent_name: string;
  respondent_email: string | null;
  total_points: number;
  max_points: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
};

export type Answer = {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_ids: string[];
  numeric_value: number | null;
  awarded_points: number;
  correct: boolean;
};

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  numeric: "Numeric",
};
