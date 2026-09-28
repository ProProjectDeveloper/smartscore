"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createAssessment, type ActionState } from "@/server/assessments";

export function NewAssessmentForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createAssessment,
    undefined,
  );

  return (
    <Card>
      <form action={action}>
        <CardBody className="space-y-4">
          <Field label="Title">
            <Input name="title" required maxLength={200} placeholder="Frontend screening" />
          </Field>

          <Field label="Description" hint="Shown to respondents above the questions.">
            <Textarea name="description" maxLength={2000} />
          </Field>

          <Field label="Pass mark (%)" hint="A submission at or above this percentage passes.">
            <Input name="pass_score" type="number" min={0} max={100} defaultValue={70} required />
          </Field>

          {state?.error ? <p className="text-xs text-negative">{state.error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create assessment"}
            </Button>
          </div>
        </CardBody>
      </form>
    </Card>
  );
}
