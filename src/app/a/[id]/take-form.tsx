"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { PublicQuestion } from "@/lib/types";
import { submitAssessment, type TakeActionState } from "@/server/take";

export function TakeForm({
  assessmentId,
  questions,
}: {
  assessmentId: string;
  questions: PublicQuestion[];
}) {
  const [state, action, pending] = useActionState<TakeActionState, FormData>(
    submitAssessment,
    undefined,
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="assessment_id" value={assessmentId} />

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input name="respondent_name" required maxLength={200} />
          </Field>
          <Field label="Email" hint="Optional.">
            <Input name="respondent_email" type="email" maxLength={200} />
          </Field>
        </CardBody>
      </Card>

      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm font-medium">
                <span className="text-ink-muted">{index + 1}.</span> {question.prompt}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {question.points} {question.points === 1 ? "point" : "points"}
                {question.kind === "multi_choice" ? " · select all that apply" : ""}
              </p>
            </div>

            {question.kind === "numeric" ? (
              <Input
                name={`q:${question.id}`}
                type="number"
                step="any"
                className="max-w-40"
                aria-label={question.prompt}
              />
            ) : (
              <fieldset className="space-y-2">
                <legend className="sr-only">{question.prompt}</legend>
                {question.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={question.kind === "single_choice" ? "radio" : "checkbox"}
                      name={
                        question.kind === "single_choice"
                          ? `q:${question.id}`
                          : `q:${question.id}:${option.id}`
                      }
                      value={option.id}
                      className="size-4 accent-brand"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </CardBody>
        </Card>
      ))}

      {state?.error ? <p className="text-xs text-negative">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit answers"}
      </Button>
    </form>
  );
}
