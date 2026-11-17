"use client";

// Сторінка нової заявки з помічником (AC-DRAFT-01…07): дві окремі форми.
// 1) «Скласти чернетку» — опис вільним текстом → Server Action proposeRequestDraft → чернетка; у базу нічого не пише.
// 2) Форма подання — та сама, що й без помічника (AC-LEAVE-01…03): чернетка лише заповнює її поля, а заявку створює
//    тільки «Подати заявку» (createLeaveRequest перевіряє все на сервері заново). Людина в контурі: працівник бачить і
//    виправляє кожне поле до подання. Помічник недоступний — форма подання працює як завжди (AC-DRAFT-06).
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LEAVE_TYPE_LABELS } from "@/lib/leave/messages";
import { SUBSTITUTE_MAX_LENGTH } from "@/lib/leave/submission";
import { LEAVE_TYPES, type PositionKind } from "@/lib/leave/types";
import { INITIAL_DRAFT_STATE, draftNotice, formValues } from "@/lib/request-draft/state";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/request-draft/prompt";
import { SubmitButton } from "../../_components/submit-button";
import { Field, Notice } from "../../_components/ui";
import { createLeaveRequest } from "../actions";
import { proposeRequestDraft } from "./actions";

export type PositionOption = { id: string; kind: PositionKind; label: string };

export function NewRequestForm({ positions }: { positions: PositionOption[] }) {
  const [state, draftAction] = useActionState(proposeRequestDraft, INITIAL_DRAFT_STATE);
  const notice = draftNotice(state);
  const values = formValues(state.draft, positions);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <form action={draftAction} className="flex flex-col gap-4">
            <Field
              id="description"
              label="Опишіть відсутність своїми словами"
              hint={`Не вказуйте діагноз чи інші подробиці про здоров'я: достатньо слова «хворію». До ${DESCRIPTION_MAX_LENGTH} символів.`}
            >
              <Textarea
                id="description"
                name="description"
                required
                rows={3}
                maxLength={DESCRIPTION_MAX_LENGTH}
                defaultValue={state.description}
                placeholder="Наприклад: хворію, сьогодні й завтра мене не буде"
                aria-describedby="description-hint"
              />
            </Field>
            <SubmitButton variant="outline" pendingText="Готуємо чернетку…" className="self-start">
              Скласти чернетку
            </SubmitButton>
          </form>
          {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {/* key: нова чернетка перестворює форму з її значеннями; без нової чернетки поля не змінюються. */}
          <form key={state.formRound} action={createLeaveRequest} className="flex flex-col gap-4">
            <Field id="leave_type" label="Тип відсутності">
              <NativeSelect id="leave_type" name="leave_type" required defaultValue={values.leaveType}>
                {LEAVE_TYPES.map((t) => (
                  <NativeSelectOption key={t} value={t}>
                    {LEAVE_TYPE_LABELS[t]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="start_date" label="Дата початку">
                <Input id="start_date" type="date" name="start_date" required defaultValue={values.startDate} />
              </Field>
              <Field id="end_date" label="Дата кінця">
                <Input id="end_date" type="date" name="end_date" required defaultValue={values.endDate} />
              </Field>
            </div>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-2 font-medium">Посади, на які припадає відсутність</legend>
              {positions.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="position_id"
                    value={p.id}
                    defaultChecked={values.positionIds.includes(p.id)}
                    className="size-4 accent-primary"
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
            <Field
              id="substitute_note"
              label="Заміна (необов’язково)"
              hint={`Хто веде уроки — до ${SUBSTITUTE_MAX_LENGTH} символів.`}
            >
              <Input
                id="substitute_note"
                name="substitute_note"
                maxLength={SUBSTITUTE_MAX_LENGTH}
                defaultValue={values.substituteNote}
                aria-describedby="substitute_note-hint"
              />
            </Field>
            <Button type="submit" className="self-start">
              Подати заявку
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
