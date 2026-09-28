import { notFound } from "next/navigation";

import { TakeForm } from "./take-form";
import { loadPublicAssessment } from "@/server/public-data";

export const metadata = { title: "Assessment" };

export default async function TakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPublicAssessment(id);

  if (!loaded) {
    notFound();
  }

  const { assessment, questions } = loaded;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{assessment.title}</h1>
      {assessment.description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{assessment.description}</p>
      ) : null}
      <p className="mt-2 text-xs text-ink-muted">
        {questions.length} {questions.length === 1 ? "question" : "questions"} · {totalPoints}{" "}
        points · pass at {assessment.pass_score}%
      </p>

      <div className="mt-8">
        <TakeForm assessmentId={assessment.id} questions={questions} />
      </div>
    </main>
  );
}
