import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { loadSubmissionResult } from "@/server/public-data";

export const metadata = { title: "Your result" };

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const loaded = await loadSubmissionResult(id, submissionId);

  if (!loaded) {
    notFound();
  }

  const { assessment, submission } = loaded;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs text-ink-muted">{assessment.title}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Thanks, {submission.respondent_name}.
      </h1>

      <Card className="mt-8">
        <CardBody className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-ink-muted">Score</p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {Number(submission.percentage)}%
              </p>
            </div>
            <Badge tone={submission.passed ? "positive" : "negative"}>
              {submission.passed ? "Passed" : "Did not pass"}
            </Badge>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-canvas"
            role="img"
            aria-label={`${Number(submission.percentage)} percent`}
          >
            <div
              className={submission.passed ? "h-full bg-positive" : "h-full bg-negative"}
              style={{ width: `${Math.min(100, Number(submission.percentage))}%` }}
            />
          </div>

          <p className="text-xs text-ink-muted">
            {Number(submission.total_points)} of {Number(submission.max_points)} points · pass mark{" "}
            {assessment.pass_score}%
          </p>
        </CardBody>
      </Card>

      <p className="mt-6 text-xs text-ink-muted">
        Your answers were recorded. Keep this page if you want the link to your result.
      </p>
    </main>
  );
}
