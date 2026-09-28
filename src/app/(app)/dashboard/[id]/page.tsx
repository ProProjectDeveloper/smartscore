import Link from "next/link";
import { notFound } from "next/navigation";

import { AddQuestionForm } from "./add-question-form";
import { AssessmentSettingsForm } from "./assessment-settings-form";
import { ShareLink } from "./share-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { siteUrl } from "@/lib/env";
import { QUESTION_KIND_LABELS, type Assessment, type QuestionWithOptions } from "@/lib/types";
import { deleteAssessment, deleteQuestion, setAssessmentStatus } from "@/server/assessments";
import { requireUser } from "@/server/auth";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AssessmentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireUser();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle<Assessment>();

  if (!assessment) {
    notFound();
  }

  const { data: questionRows } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("assessment_id", id)
    .order("position", { ascending: true })
    .returns<QuestionWithOptions[]>();

  const questions = questionRows ?? [];
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", id);

  const isPublished = assessment.status === "published";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-ink-muted hover:text-ink">
          ← Assessments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{assessment.title}</h1>
          <Badge tone={isPublished ? "positive" : "neutral"}>{assessment.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {questions.length} {questions.length === 1 ? "question" : "questions"} · {totalPoints}{" "}
          points · pass at {assessment.pass_score}%
        </p>
      </div>

      {error === "needs-questions" ? (
        <p className="rounded-lg border border-negative/20 bg-negative/5 px-4 py-3 text-xs text-negative">
          Add at least one question before publishing.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={setAssessmentStatus}>
          <input type="hidden" name="assessment_id" value={assessment.id} />
          <input type="hidden" name="status" value={isPublished ? "draft" : "published"} />
          <Button type="submit" variant={isPublished ? "secondary" : "primary"} size="sm">
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </form>

        <Link href={`/dashboard/${assessment.id}/results`}>
          <Button variant="secondary" size="sm">
            Results ({submissionCount ?? 0})
          </Button>
        </Link>

        <form action={deleteAssessment} className="ml-auto">
          <input type="hidden" name="assessment_id" value={assessment.id} />
          <Button type="submit" variant="danger" size="sm">
            Delete
          </Button>
        </form>
      </div>

      {isPublished ? <ShareLink url={`${siteUrl()}/a/${assessment.id}`} /> : null}

      <Card>
        <CardHeader
          title="Questions"
          description="Respondents see these in order. The answer key stays on the server."
        />
        {questions.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="Add the first one below."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {questions.map((question, index) => (
              <li key={question.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="text-ink-muted">{index + 1}.</span> {question.prompt}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {QUESTION_KIND_LABELS[question.kind]} · {question.points}{" "}
                    {question.points === 1 ? "point" : "points"}
                  </p>

                  {question.kind === "numeric" ? (
                    <p className="mt-2 text-xs text-ink-muted">
                      Answer {question.numeric_answer}
                      {question.numeric_tolerance ? ` ± ${question.numeric_tolerance}` : ""}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {[...question.options]
                        .sort((a, b) => a.position - b.position)
                        .map((option) => (
                          <li key={option.id} className="text-xs">
                            <span
                              className={
                                option.is_correct ? "font-medium text-positive" : "text-ink-muted"
                              }
                            >
                              {option.is_correct ? "✓" : "○"} {option.label}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <form action={deleteQuestion}>
                  <input type="hidden" name="question_id" value={question.id} />
                  <input type="hidden" name="assessment_id" value={assessment.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <CardBody className="border-t border-border-subtle bg-canvas/50">
          <AddQuestionForm assessmentId={assessment.id} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Settings" />
        <CardBody>
          <AssessmentSettingsForm assessment={assessment} />
        </CardBody>
      </Card>
    </div>
  );
}
