import Link from "next/link";
import { countLeaveDays } from "@/lib/leave/blocked-days";
import { formatDate } from "@/lib/leave/dates";
import { requestStatus } from "@/lib/leave/decisions";
import { SUBSTITUTE_MAX_LENGTH } from "@/lib/leave/submission";
import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, errorMessage } from "@/lib/leave/messages";
import { LEAVE_TYPES, type LeaveType, type PositionKind, type RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { Notice, PageShell, StatusBadge, inputClass, secondaryButtonClass } from "../_components/ui";
import { resubmitLeaveRequest } from "./actions";

const DONE: Record<string, string> = {
  submitted: "Заявку подано — вона в черзі менеджера.",
  resubmitted: "Заявку виправлено й подано знову.",
};

// AC-LEAVE-09: працівник бачить лише власні заявки (RLS + фільтр за employee_id).
export default async function MyRequestsPage({ searchParams }: PageProps<"/requests">) {
  const { supabase, viewer } = await requireRole("employee");
  const { error, done } = await searchParams;

  const { data: requests } = await supabase
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, substitute_note")
    .eq("employee_id", viewer.id)
    .order("start_date", { ascending: false });
  const ids = (requests ?? []).map((r) => r.id);

  const [{ data: records }, { data: divisions }, { data: blocked }] = await Promise.all([
    ids.length
      ? supabase.from("leave_records").select("id, request_id, kind, division_id, status, comment").in("request_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("divisions").select("id, name"),
    supabase.from("blocked_days").select("day"),
  ]);
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const blockedDays = (blocked ?? []).map((b) => b.day);
  const message = errorMessage(error);

  return (
    <PageShell title="Мої заявки" role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      {typeof done === "string" && DONE[done] ? <Notice kind="success">{DONE[done]}</Notice> : null}
      {!requests?.length ? (
        <p className="text-sm text-zinc-500">
          Заявок ще немає. <Link href="/requests/new" className="underline">Подати заявку</Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => {
            const own = (records ?? []).filter((rec) => rec.request_id === r.id);
            const status = requestStatus(own.map((rec) => rec.status as RecordStatus));
            const days = countLeaveDays(r.start_date, r.end_date, blockedDays);
            return (
              <li key={r.id} data-testid="leave-request" className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{LEAVE_TYPE_LABELS[r.leave_type as LeaveType]}</span>
                  <span>
                    {formatDate(r.start_date)} – {formatDate(r.end_date)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    днів: {days.counted}
                    {days.blocked.length ? ` (заблоковані не рахуються: ${days.blocked.map(formatDate).join(", ")})` : ""}
                  </span>
                  <StatusBadge status={status} />
                </div>
                {r.substitute_note ? <p className="mt-1 text-sm text-zinc-500">Заміна: {r.substitute_note}</p> : null}
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {own.map((rec) => (
                    <li key={rec.id} className="flex flex-wrap items-center gap-2">
                      <span>
                        {POSITION_KIND_LABELS[rec.kind as PositionKind]} посада, {divisionName.get(rec.division_id) ?? "—"}
                      </span>
                      <StatusBadge status={rec.status as RecordStatus} />
                      {rec.comment ? <span className="text-zinc-600 dark:text-zinc-300">Коментар: «{rec.comment}»</span> : null}
                    </li>
                  ))}
                </ul>
                {status === "needs_revision" ? (
                  <form action={resubmitLeaveRequest} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
                    <input type="hidden" name="request_id" value={r.id} />
                    <label className="flex flex-col gap-1">
                      Тип
                      <select name="leave_type" defaultValue={r.leave_type} className={inputClass}>
                        {LEAVE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {LEAVE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      Початок
                      <input type="date" name="start_date" defaultValue={r.start_date} required className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1">
                      Кінець
                      <input type="date" name="end_date" defaultValue={r.end_date} required className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1">
                      Заміна
                      <input name="substitute_note" defaultValue={r.substitute_note ?? ""} maxLength={SUBSTITUTE_MAX_LENGTH} className={inputClass} />
                    </label>
                    <button type="submit" className={secondaryButtonClass}>
                      Виправити й подати знову
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
