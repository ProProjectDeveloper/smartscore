import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Assessment, AssessmentStatus } from "@/lib/types";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Assessments" };

const STATUS_TONE: Record<AssessmentStatus, "neutral" | "positive" | "warning"> = {
  draft: "neutral",
  published: "positive",
  archived: "warning",
};

type Row = Assessment & {
  questions: Array<{ count: number }>;
  submissions: Array<{ count: number }>;
};

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("assessments")
    .select("*, questions(count), submissions(count)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const assessments = data ?? [];
  const published = assessments.filter((a) => a.status === "published").length;
  const responses = assessments.reduce((sum, a) => sum + (a.submissions[0]?.count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {assessments.length} total · {published} published · {responses} responses
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button>New assessment</Button>
        </Link>
      </div>

      <Card>
        {assessments.length === 0 ? (
          <EmptyState
            title="No assessments yet"
            description="Create one, add a few questions, then publish it to get a shareable link."
            action={
              <Link href="/dashboard/new">
                <Button size="sm">New assessment</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {assessments.map((assessment) => {
              const questionCount = assessment.questions[0]?.count ?? 0;
              const submissionCount = assessment.submissions[0]?.count ?? 0;

              return (
                <li key={assessment.id}>
                  <Link
                    href={`/dashboard/${assessment.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{assessment.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {questionCount} {questionCount === 1 ? "question" : "questions"} ·{" "}
                        {submissionCount} {submissionCount === 1 ? "response" : "responses"} · pass
                        at {assessment.pass_score}%
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[assessment.status]}>{assessment.status}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardBody className="text-xs text-ink-muted">
          Respondents do not need an account. Publishing an assessment gives you a link at{" "}
          <code className="rounded bg-canvas px-1 py-0.5">/a/&lt;assessment-id&gt;</code> that
          scores each submission as it arrives.
        </CardBody>
      </Card>
    </div>
  );
}
