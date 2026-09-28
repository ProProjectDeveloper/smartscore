"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Assessment } from "@/lib/types";
import { updateAssessment, type ActionState } from "@/server/assessments";

export function AssessmentSettingsForm({ assessment }: { assessment: Assessment }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateAssessment,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assessment_id" value={assessment.id} />

      <Field label="Title">
        <Input name="title" defaultValue={assessment.title} required maxLength={200} />
      </Field>

      <Field label="Description">
        <Textarea name="description" defaultValue={assessment.description ?? ""} maxLength={2000} />
      </Field>

      <Field label="Pass mark (%)">
        <Input
          name="pass_score"
          type="number"
          min={0}
          max={100}
          defaultValue={assessment.pass_score}
          required
        />
      </Field>

      {state?.error ? <p className="text-xs text-negative">{state.error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
