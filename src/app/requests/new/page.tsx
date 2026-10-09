import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, errorMessage } from "@/lib/leave/messages";
import { SUBSTITUTE_MAX_LENGTH } from "@/lib/leave/submission";
import { LEAVE_TYPES } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { Notice, PageShell, buttonClass, inputClass } from "../../_components/ui";
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
        <Notice kind="error">У вас ще немає посади — зверніться до адміністратора.</Notice>
      ) : (
        <form action={createLeaveRequest} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Тип відсутності
            <select name="leave_type" required className={inputClass} defaultValue="sick">
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Дата початку
              <input type="date" name="start_date" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Дата кінця
              <input type="date" name="end_date" required className={inputClass} />
            </label>
          </div>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1">Посади, на які припадає відсутність</legend>
            {positions.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input type="checkbox" name="position_id" value={p.id} defaultChecked={p.kind === "main"} />
                {p.title} — {POSITION_KIND_LABELS[p.kind as "main" | "additional"]}, {divisionName.get(p.division_id) ?? "—"}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            Заміна (необов’язково): хто веде уроки
            <input name="substitute_note" maxLength={SUBSTITUTE_MAX_LENGTH} className={inputClass} />
          </label>
          <button type="submit" className={`${buttonClass} self-start`}>
            Подати заявку
          </button>
        </form>
      )}
    </PageShell>
  );
}
