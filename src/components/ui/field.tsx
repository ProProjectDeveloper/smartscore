import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm " +
  "placeholder:text-ink-muted/70 disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, className)} {...props} />;
}
