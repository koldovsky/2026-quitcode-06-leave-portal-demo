import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, errorMessage } from "@/lib/leave/messages";
import { SUBSTITUTE_MAX_LENGTH } from "@/lib/leave/submission";
import { LEAVE_TYPES } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { Field, Notice, PageShell } from "../../_components/ui";
import { createLeaveRequest } from "../actions";

// AC-LEAVE-01, AC-LEAVE-02: працівник обирає тип, дати й посади, на які припадає відсутність;
// заміну вказує за бажанням (spec-v0.2).
export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const { supabase, viewer } = await requireRole("employee");
  const { error } = await searchParams;

  const [{ data: positions }, { data: divisions }] = await Promise.all([
    supabase.from("positions").select("id, kind, title, division_id").eq("employee_id", viewer.id).order("kind", { ascending: false }),
    supabase.from("divisions").select("id, name"),
  ]);
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const message = errorMessage(error);

  return (
    <PageShell title="Нова заявка на відсутність" role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      {!positions?.length ? (
        <Notice kind="warning">У вас ще немає посади — зверніться до адміністратора.</Notice>
      ) : (
        <Card>
          <CardContent>
            <form action={createLeaveRequest} className="flex flex-col gap-4">
              <Field id="leave_type" label="Тип відсутності">
                <NativeSelect id="leave_type" name="leave_type" required defaultValue="sick">
                  {LEAVE_TYPES.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {LEAVE_TYPE_LABELS[t]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="start_date" label="Дата початку">
                  <Input id="start_date" type="date" name="start_date" required />
                </Field>
                <Field id="end_date" label="Дата кінця">
                  <Input id="end_date" type="date" name="end_date" required />
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
                      defaultChecked={p.kind === "main"}
                      className="size-4 accent-primary"
                    />
                    {p.title} — {POSITION_KIND_LABELS[p.kind as "main" | "additional"]}, {divisionName.get(p.division_id) ?? "—"}
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
                  aria-describedby="substitute_note-hint"
                />
              </Field>
              <Button type="submit" className="self-start">
                Подати заявку
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
