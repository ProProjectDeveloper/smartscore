import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Smart<span className="text-brand">Score</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-muted sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
