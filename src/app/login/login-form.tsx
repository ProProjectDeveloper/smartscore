"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("full_name") ?? "");

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setPending(false);
        return;
      }

      // With email confirmation switched on, Supabase returns a user but no
      // session, so there is nothing to redirect to yet.
      if (!data.session) {
        setNotice("Check your inbox to confirm the address, then sign in.");
        setPending(false);
        setMode("signin");
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setPending(false);
        return;
      }
    }

    router.refresh();
    router.replace("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" ? (
        <Field label="Name">
          <Input name="full_name" autoComplete="name" placeholder="Ada Lovelace" />
        </Field>
      ) : null}

      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
        <Input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </Field>

      {error ? <p className="text-xs text-negative">{error}</p> : null}
      {notice ? <p className="text-xs text-positive">{notice}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        className="w-full text-xs text-ink-muted hover:text-ink"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
      >
        {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
