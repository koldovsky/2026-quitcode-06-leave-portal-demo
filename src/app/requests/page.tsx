import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { countLeaveDays } from "@/lib/leave/blocked-days";
import { formatDate } from "@/lib/leave/dates";
import { requestStatus } from "@/lib/leave/decisions";
import { SUBSTITUTE_MAX_LENGTH } from "@/lib/leave/submission";
import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, errorMessage } from "@/lib/leave/messages";
import { LEAVE_TYPES, type LeaveType, type PositionKind, type RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { EmptyState, Field, Notice, PageShell, StatusBadge } from "../_components/ui";
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
      {typeof done === "string" && Object.hasOwn(DONE, done) ? <Notice kind="success">{DONE[done]}</Notice> : null}
      {!requests?.length ? (
        <EmptyState
          action={
            <Link href="/requests/new" className="font-medium text-primary underline-offset-4 hover:underline">
              Подати заявку
            </Link>
          }
        >
          Заявок ще немає.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => {
            const own = (records ?? []).filter((rec) => rec.request_id === r.id);
            const status = requestStatus(own.map((rec) => rec.status as RecordStatus));
            const days = countLeaveDays(r.start_date, r.end_date, blockedDays);
            return (
              <li key={r.id} data-testid="leave-request">
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{LEAVE_TYPE_LABELS[r.leave_type as LeaveType]}</span>
                      <span className="font-mono text-[13px] tabular-nums">
                        {formatDate(r.start_date)} – {formatDate(r.end_date)}
                      </span>
                      <span className="text-muted-foreground">
                        днів: {days.counted}
                        {days.blocked.length ? ` (заблоковані не рахуються: ${days.blocked.map(formatDate).join(", ")})` : ""}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    {r.substitute_note ? <p className="text-muted-foreground">Заміна: {r.substitute_note}</p> : null}
                    <ul className="flex flex-col gap-1">
                      {own.map((rec) => (
                        <li key={rec.id} className="flex flex-wrap items-center gap-2">
                          <span>
                            {POSITION_KIND_LABELS[rec.kind as PositionKind]} посада, {divisionName.get(rec.division_id) ?? "—"}
                          </span>
                          <StatusBadge status={rec.status as RecordStatus} />
                          {rec.comment ? <span className="text-muted-foreground">Коментар: «{rec.comment}»</span> : null}
                        </li>
                      ))}
                    </ul>
                    {status === "needs_revision" ? (
                      <form action={resubmitLeaveRequest} className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
                        <input type="hidden" name="request_id" value={r.id} />
                        <Field id={`leave_type-${r.id}`} label="Тип">
                          <NativeSelect id={`leave_type-${r.id}`} name="leave_type" defaultValue={r.leave_type}>
                            {LEAVE_TYPES.map((t) => (
                              <NativeSelectOption key={t} value={t}>
                                {LEAVE_TYPE_LABELS[t]}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field id={`start_date-${r.id}`} label="Початок">
                          <Input id={`start_date-${r.id}`} type="date" name="start_date" defaultValue={r.start_date} required />
                        </Field>
                        <Field id={`end_date-${r.id}`} label="Кінець">
                          <Input id={`end_date-${r.id}`} type="date" name="end_date" defaultValue={r.end_date} required />
                        </Field>
                        <Field id={`substitute_note-${r.id}`} label="Заміна">
                          <Input
                            id={`substitute_note-${r.id}`}
                            name="substitute_note"
                            defaultValue={r.substitute_note ?? ""}
                            maxLength={SUBSTITUTE_MAX_LENGTH}
                          />
                        </Field>
                        <Button type="submit" variant="secondary">
                          Виправити й подати знову
                        </Button>
                      </form>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
