import Link from "next/link";

import { NewAssessmentForm } from "./new-assessment-form";

export const metadata = { title: "New assessment" };

export default function NewAssessmentPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-ink-muted hover:text-ink">
          ← Assessments
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">New assessment</h1>
        <p className="mt-1 text-xs text-ink-muted">
          You can add questions once it exists, and publish when it is ready.
        </p>
      </div>
      <NewAssessmentForm />
    </div>
  );
}
