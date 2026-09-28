import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        That page does not exist, or the assessment is not published.
      </p>
      <Link href="/" className="mt-4 text-sm text-brand hover:underline">
        Back to the start
      </Link>
    </main>
  );
}
