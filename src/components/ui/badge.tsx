import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "positive" | "negative" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted border-border-subtle",
  brand: "bg-brand/10 text-brand border-brand/20",
  positive: "bg-positive/10 text-positive border-positive/20",
  negative: "bg-negative/10 text-negative border-negative/20",
  warning: "bg-warning/10 text-warning border-warning/25",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
