import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Assessment, Submission } from "@/lib/types";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Results" };

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle<Assessment>();

  if (!assessment) {
    notFound();
  }

  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("assessment_id", id)
    .order("submitted_at", { ascending: false })
    .returns<Submission[]>();

  const submissions = data ?? [];
  const passed = submissions.filter((s) => s.passed).length;
  const averageScore = average(submissions.map((s) => Number(s.percentage)));
  const passRate =
    submissions.length === 0 ? 0 : Math.round((passed / submissions.length) * 100);

  const stats = [
    { label: "Responses", value: String(submissions.length) },
    { label: "Average score", value: `${averageScore}%` },
    { label: "Pass rate", value: `${passRate}%` },
    { label: "Pass mark", value: `${assessment.pass_score}%` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/${assessment.id}`} className="text-xs text-ink-muted hover:text-ink">
          ← {assessment.title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Results</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="px-5 py-4">
              <p className="text-xs text-ink-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Submissions" description="Newest first." />
        {submissions.length === 0 ? (
          <EmptyState
            title="No responses yet"
            description="Share the assessment link and submissions will appear here, already scored."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{submission.respondent_name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {submission.respondent_email ?? "no email"} ·{" "}
                    {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-ink-muted">
                    {Number(submission.total_points)}/{Number(submission.max_points)}
                  </span>
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">
                    {Number(submission.percentage)}%
                  </span>
                  <Badge tone={submission.passed ? "positive" : "negative"}>
                    {submission.passed ? "pass" : "fail"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
