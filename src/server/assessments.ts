"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseOptionLines } from "@/lib/options";
import { requireUser } from "@/server/auth";

export type ActionState = { error: string } | undefined;

const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Give the assessment a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  pass_score: z.coerce
    .number()
    .int("The pass mark must be a whole number.")
    .min(0)
    .max(100, "The pass mark is a percentage, so it cannot exceed 100."),
});

export async function createAssessment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = assessmentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    pass_score: formData.get("pass_score") ?? 70,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That assessment is not valid." };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      pass_score: parsed.data.pass_score,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the assessment." };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/${data.id}`);
}

export async function updateAssessment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("assessment_id") ?? "");
  const parsed = assessmentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    pass_score: formData.get("pass_score") ?? 70,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That assessment is not valid." };
  }

  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("assessments")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      pass_score: parsed.data.pass_score,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard");
  return undefined;
}

const statusSchema = z.enum(["draft", "published", "archived"]);

export async function setAssessmentStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("assessment_id") ?? "");
  const status = statusSchema.parse(formData.get("status"));

  const { supabase } = await requireUser();

  // Publishing an empty assessment would hand respondents a blank page.
  if (status === "published") {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", id);

    if (!count) {
      redirect(`/dashboard/${id}?error=needs-questions`);
    }
  }

  await supabase.from("assessments").update({ status }).eq("id", id);

  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteAssessment(formData: FormData): Promise<void> {
  const id = String(formData.get("assessment_id") ?? "");
  const { supabase } = await requireUser();

  await supabase.from("assessments").delete().eq("id", id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const questionSchema = z
  .object({
    assessment_id: z.string().uuid(),
    prompt: z.string().trim().min(1, "Write the question prompt.").max(1000),
    kind: z.enum(["single_choice", "multi_choice", "numeric"]),
    points: z.coerce.number().int().min(1, "A question is worth at least one point.").max(1000),
    options: z.string().optional(),
    numeric_answer: z.string().optional(),
    numeric_tolerance: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "numeric") {
      if (!value.numeric_answer?.trim() || Number.isNaN(Number(value.numeric_answer))) {
        ctx.addIssue({ code: "custom", message: "Give the numeric answer.", path: ["numeric_answer"] });
      }
      if (
        value.numeric_tolerance?.trim() &&
        (Number.isNaN(Number(value.numeric_tolerance)) || Number(value.numeric_tolerance) < 0)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "The tolerance must be zero or more.",
          path: ["numeric_tolerance"],
        });
      }
      return;
    }

    const options = parseOptionLines(value.options ?? "");
    const correct = options.filter((o) => o.is_correct).length;

    if (options.length < 2) {
      ctx.addIssue({ code: "custom", message: "Give at least two options.", path: ["options"] });
      return;
    }
    if (correct === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Mark the correct option with a leading *.",
        path: ["options"],
      });
    }
    if (value.kind === "single_choice" && correct > 1) {
      ctx.addIssue({
        code: "custom",
        message: "A single-choice question needs exactly one correct option.",
        path: ["options"],
      });
    }
  });

export async function addQuestion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = questionSchema.safeParse({
    assessment_id: formData.get("assessment_id"),
    prompt: formData.get("prompt"),
    kind: formData.get("kind"),
    points: formData.get("points") ?? 1,
    options: formData.get("options") ?? undefined,
    numeric_answer: formData.get("numeric_answer") ?? undefined,
    numeric_tolerance: formData.get("numeric_tolerance") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That question is not valid." };
  }

  const input = parsed.data;
  const { supabase } = await requireUser();

  // Append to the end of the current question list.
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", input.assessment_id);

  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      assessment_id: input.assessment_id,
      prompt: input.prompt,
      kind: input.kind,
      points: input.points,
      position: count ?? 0,
      numeric_answer: input.kind === "numeric" ? Number(input.numeric_answer) : null,
      numeric_tolerance:
        input.kind === "numeric" && input.numeric_tolerance?.trim()
          ? Number(input.numeric_tolerance)
          : null,
    })
    .select("id")
    .single();

  if (error || !question) {
    return { error: error?.message ?? "Could not add the question." };
  }

  if (input.kind !== "numeric") {
    const options = parseOptionLines(input.options ?? "").map((option, index) => ({
      question_id: question.id,
      label: option.label,
      is_correct: option.is_correct,
      position: index,
    }));

    const { error: optionsError } = await supabase.from("options").insert(options);

    if (optionsError) {
      // Do not leave a choice question stranded without its options.
      await supabase.from("questions").delete().eq("id", question.id);
      return { error: optionsError.message };
    }
  }

  revalidatePath(`/dashboard/${input.assessment_id}`);
  return undefined;
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  const questionId = String(formData.get("question_id") ?? "");
  const assessmentId = String(formData.get("assessment_id") ?? "");

  const { supabase } = await requireUser();
  await supabase.from("questions").delete().eq("id", questionId);

  revalidatePath(`/dashboard/${assessmentId}`);
}
