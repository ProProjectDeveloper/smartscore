import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, Link2, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Write the questions",
    body: "Single choice, multiple choice with partial credit, or a numeric answer with a tolerance. Weight each question by points.",
  },
  {
    icon: Link2,
    title: "Share one link",
    body: "Publish an assessment and send the link. Respondents answer without signing up, and the answer key never leaves the server.",
  },
  {
    icon: ClipboardCheck,
    title: "Read the results",
    body: "Every submission is scored on arrival, with a pass mark you set and a per-question breakdown.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">SmartScore</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Assessments that score themselves.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
        Build an assessment, publish it to a shareable link, and get scored submissions back
        without grading anything by hand.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login">
          <Button>Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="size-5 text-brand" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
