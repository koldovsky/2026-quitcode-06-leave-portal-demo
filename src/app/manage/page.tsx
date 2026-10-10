import { canDecideRecord } from "@/lib/leave/access";
import { countLeaveDays } from "@/lib/leave/blocked-days";
import { formatDate } from "@/lib/leave/dates";
import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, STATUS_LABELS, errorMessage } from "@/lib/leave/messages";
import type { LeaveType, PositionKind, RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { Notice, PageShell, StatusBadge, buttonClass, inputClass, secondaryButtonClass } from "../_components/ui";
import { decideRecord } from "./actions";

// AC-LEAVE-05, AC-LEAVE-09: менеджер бачить лише записи підрозділів, якими керує; адміністратор — усі.
// Відбір робить RLS; фільтр за division_id лише прибирає власні записи менеджера, якщо вони колись будуть.
export default async function ManagePage({ searchParams }: PageProps<"/manage">) {
  const { supabase, viewer } = await requireRole("manager", "admin");
  const { error, done } = await searchParams;

  let recordsQuery = supabase
    .from("leave_records")
    .select("id, request_id, kind, division_id, status, comment, decided_at")
    .order("created_at", { ascending: false });
  if (viewer.role === "manager") recordsQuery = recordsQuery.in("division_id", viewer.managedDivisionIds);
  const { data: records } = await recordsQuery;

  const requestIds = [...new Set((records ?? []).map((r) => r.request_id))];
  const { data: requests } = requestIds.length
    ? await supabase.from("leave_requests").select("id, employee_id, leave_type, start_date, end_date, substitute_note").in("id", requestIds)
    : { data: [] as never[] };
  const employeeIds = [...new Set((requests ?? []).map((r) => r.employee_id))];
  const [{ data: people }, { data: divisions }, { data: blocked }] = await Promise.all([
    employeeIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", employeeIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("divisions").select("id, name"),
    supabase.from("blocked_days").select("day"),
  ]);

  const requestById = new Map((requests ?? []).map((r) => [r.id, r]));
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const blockedDays = (blocked ?? []).map((b) => b.day);
  const pending = (records ?? []).filter((r) => r.status === "pending");
  const decided = (records ?? []).filter((r) => r.status !== "pending");
  const message = errorMessage(error);

  const describe = (rec: (typeof pending)[number]) => {
    const req = requestById.get(rec.request_id);
    const person = req ? personById.get(req.employee_id) : undefined;
    const days = req ? countLeaveDays(req.start_date, req.end_date, blockedDays).counted : 0;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{person?.full_name ?? person?.email ?? "працівник"}</span>
        {req ? (
          <span>
            {LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}, {formatDate(req.start_date)} – {formatDate(req.end_date)} (днів: {days})
          </span>
        ) : null}
        <span className="text-sm text-zinc-500">
          {POSITION_KIND_LABELS[rec.kind as PositionKind]} посада, {divisionName.get(rec.division_id) ?? "—"}
        </span>
        {req?.substitute_note ? <span className="text-sm text-zinc-500">Заміна: {req.substitute_note}</span> : null}
      </div>
    );
  };

  return (
    <PageShell title={viewer.role === "manager" ? "Черга рішень" : "Усі заявки"} role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      {typeof done === "string" && Object.hasOwn(STATUS_LABELS, done) ? (
        <Notice kind="success">Рішення збережено: {STATUS_LABELS[done as RecordStatus]}.</Notice>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">На розгляді</h2>
        {!pending.length ? <p className="text-sm text-zinc-500">Нових заявок немає.</p> : null}
        {pending.map((rec) => (
          <article key={rec.id} data-testid="queue-record" className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
            {describe(rec)}
            {rec.comment ? <p className="text-sm text-zinc-500">Попередній коментар: «{rec.comment}»</p> : null}
            {canDecideRecord(viewer, { employeeId: "", divisionId: rec.division_id }) ? (
              <div className="flex flex-wrap items-end gap-3">
                <form action={decideRecord}>
                  <input type="hidden" name="record_id" value={rec.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" className={buttonClass}>
                    Схвалити
                  </button>
                </form>
                <form action={decideRecord} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="record_id" value={rec.id} />
                  <input type="hidden" name="decision" value="return" />
                  <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
                    Коментар для повернення
                    <input name="comment" placeholder="Уточніть дату кінця" className={inputClass} />
                  </label>
                  <button type="submit" className={secondaryButtonClass}>
                    Повернути на доопрацювання
                  </button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Вирішені</h2>
        {!decided.length ? <p className="text-sm text-zinc-500">Рішень ще немає.</p> : null}
        {decided.map((rec) => (
          <article key={rec.id} className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
            {describe(rec)}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={rec.status as RecordStatus} />
              {rec.decided_at ? <span className="text-zinc-500">{new Date(rec.decided_at).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}</span> : null}
              {rec.comment ? <span>«{rec.comment}»</span> : null}
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
