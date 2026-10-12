"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkCalendar, type ExistingRequest } from "@/lib/leave/calendar";
import { resubmit } from "@/lib/leave/decisions";
import { validateSubmission } from "@/lib/leave/submission";
import type { LeaveErrorCode, Position, PositionKind, RecordStatus } from "@/lib/leave/types";
import type { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/viewer";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Помилки бази, які ми очікуємо, — у коди зі специфікації (решта — загальна помилка).
function dbErrorCode(error: { code?: string; message?: string }): LeaveErrorCode | "DB_ERROR" {
  if (error.message?.includes("leave_requests_range_check") || error.message?.includes("INVALID_RANGE")) return "INVALID_RANGE";
  // Функція подання повторює перевірки server action (міграція 20261019000000) — на випадок гонки двох подань.
  if (error.message?.includes("ONLY_BLOCKED_DAYS")) return "ONLY_BLOCKED_DAYS";
  if (error.message?.includes("OVERLAPPING_REQUEST")) return "OVERLAPPING_REQUEST";
  if (error.message?.includes("leave_requests_substitute_note_check")) return "SUBSTITUTE_TOO_LONG";
  if (error.message?.includes("UNKNOWN_POSITION")) return "UNKNOWN_POSITION";
  return "DB_ERROR";
}

/** Контекст для AC-LEAVE-10 і AC-LEAVE-11: заблоковані дні й власні заявки працівника зі статусами записів. */
async function calendarContext(supabase: Supabase, employeeId: string) {
  const [{ data: blocked }, { data: requests }] = await Promise.all([
    supabase.from("blocked_days").select("day"),
    supabase.from("leave_requests").select("id, start_date, end_date").eq("employee_id", employeeId),
  ]);
  const ids = (requests ?? []).map((r) => r.id);
  const { data: records } = ids.length
    ? await supabase.from("leave_records").select("request_id, status").in("request_id", ids)
    : { data: [] as { request_id: string; status: string }[] };
  const existing: ExistingRequest[] = (requests ?? []).map((r) => ({
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    recordStatuses: (records ?? []).filter((x) => x.request_id === r.id).map((x) => x.status as RecordStatus),
  }));
  return { blockedDays: (blocked ?? []).map((b) => b.day), existing };
}

/** AC-LEAVE-01…03, AC-LEAVE-10, AC-LEAVE-11: подання заявки працівником. */
export async function createLeaveRequest(formData: FormData) {
  const { supabase, viewer } = await requireRole("employee");

  const { data: rows } = await supabase
    .from("positions")
    .select("id, kind, division_id")
    .eq("employee_id", viewer.id);
  const positions: Position[] = (rows ?? []).map((p) => ({
    id: p.id,
    kind: p.kind as PositionKind,
    divisionId: p.division_id,
  }));

  const result = validateSubmission(
    {
      leaveType: text(formData, "leave_type"),
      startDate: text(formData, "start_date"),
      endDate: text(formData, "end_date"),
      positionIds: formData.getAll("position_id").map(String),
      substituteNote: text(formData, "substitute_note"),
    },
    positions,
  );
  // AC-LEAVE-03: при помилці нічого не зберігаємо — до бази не доходимо.
  if (!result.ok) redirect(`/requests/new?error=${result.error}`);

  // AC-LEAVE-10 (лише заблоковані дні), AC-LEAVE-11 (перетин із заявкою на розгляді чи схваленою).
  const calendar = checkCalendar(result.value, await calendarContext(supabase, viewer.id));
  if (!calendar.ok) redirect(`/requests/new?error=${calendar.error}`);

  // Заявка й записи — однією транзакцією (функція submit_leave_request, security invoker + RLS).
  const { error } = await supabase.rpc("submit_leave_request", {
    p_leave_type: result.value.leaveType,
    p_start_date: result.value.startDate,
    p_end_date: result.value.endDate,
    p_position_ids: result.value.records.map((r) => r.positionId),
    p_substitute_note: result.value.substituteNote ?? undefined,
  });
  if (error) redirect(`/requests/new?error=${dbErrorCode(error)}`);

  revalidatePath("/requests");
  redirect("/requests?done=submitted");
}

/** AC-LEAVE-08: працівник виправляє заявку на доопрацюванні й подає знову. */
export async function resubmitLeaveRequest(formData: FormData) {
  const { supabase, viewer } = await requireRole("employee");
  const requestId = text(formData, "request_id");

  // RLS: працівник бачить лише записи власних заявок.
  const context = await calendarContext(supabase, viewer.id);
  const own = context.existing.find((r) => r.id === requestId);
  const result = resubmit(
    { recordStatuses: own?.recordStatuses ?? [] },
    {
      leaveType: text(formData, "leave_type"),
      startDate: text(formData, "start_date"),
      endDate: text(formData, "end_date"),
      substituteNote: text(formData, "substitute_note"),
    },
  );
  if (!result.ok) redirect(`/requests?error=${result.error}`);

  // AC-LEAVE-10, AC-LEAVE-11 і для виправленої заявки; сама з собою вона не перетинається.
  const calendar = checkCalendar(result.value, { ...context, excludeRequestId: requestId });
  if (!calendar.ok) redirect(`/requests?error=${calendar.error}`);

  // Політика RLS пускає оновлення лише власної заявки на доопрацюванні; тригер повертає записи в pending.
  const { data: updated, error } = await supabase
    .from("leave_requests")
    .update({
      leave_type: result.value.leaveType,
      start_date: result.value.startDate,
      end_date: result.value.endDate,
      substitute_note: result.value.substituteNote,
    })
    .eq("id", requestId)
    .select("id");
  if (error) redirect(`/requests?error=${dbErrorCode(error)}`);
  if (!updated?.length) redirect("/requests?error=NOT_NEEDS_REVISION");

  revalidatePath("/requests");
  redirect("/requests?done=resubmitted");
}
