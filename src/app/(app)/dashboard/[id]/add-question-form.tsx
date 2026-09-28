"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { QuestionKind } from "@/lib/types";
import { addQuestion, type ActionState } from "@/server/assessments";

export function AddQuestionForm({ assessmentId }: { assessmentId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addQuestion, undefined);
  const [kind, setKind] = useState<QuestionKind>("single_choice");

  const isNumeric = kind === "numeric";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assessment_id" value={assessmentId} />

      <Field label="Question">
        <Textarea name="prompt" required maxLength={1000} placeholder="What does RLS stand for?" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as QuestionKind)}
          >
            <option value="single_choice">Single choice</option>
            <option value="multi_choice">Multiple choice</option>
            <option value="numeric">Numeric</option>
          </Select>
        </Field>

        <Field label="Points">
          <Input name="points" type="number" min={1} max={1000} defaultValue={1} required />
        </Field>
      </div>

      {isNumeric ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correct answer">
            <Input name="numeric_answer" type="number" step="any" required />
          </Field>
          <Field label="Tolerance" hint="Leave blank to require an exact match.">
            <Input name="numeric_tolerance" type="number" step="any" min={0} />
          </Field>
        </div>
      ) : (
        <Field
          label="Options"
          hint="One per line. Put * in front of each correct option. Multiple choice gives partial credit."
        >
          <Textarea
            name="options"
            className="min-h-28 font-mono text-xs"
            placeholder={"*Row Level Security\nRecord Lookup Service\nRemote Login Session"}
          />
        </Field>
      )}

      {state?.error ? <p className="text-xs text-negative">{state.error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add question"}
        </Button>
      </div>
    </form>
  );
}
