import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand">
        SmartScore
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Use an email and password to reach your assessments.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
