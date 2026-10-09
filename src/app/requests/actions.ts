"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resubmit } from "@/lib/leave/decisions";
import { validateSubmission } from "@/lib/leave/submission";
import type { LeaveErrorCode, Position, PositionKind, RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Помилки бази, які ми очікуємо, — у коди зі специфікації (решта — загальна помилка).
function dbErrorCode(error: { code?: string; message?: string }): LeaveErrorCode | "DB_ERROR" {
  if (error.message?.includes("leave_requests_range_check")) return "INVALID_RANGE";
  if (error.message?.includes("UNKNOWN_POSITION")) return "UNKNOWN_POSITION";
  return "DB_ERROR";
}

/** AC-LEAVE-01…03: подання заявки працівником. */
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
    },
    positions,
  );
  // AC-LEAVE-03: при помилці нічого не зберігаємо — до бази не доходимо.
  if (!result.ok) redirect(`/requests/new?error=${result.error}`);

  // Заявка й записи — однією транзакцією (функція submit_leave_request, security invoker + RLS).
  const { error } = await supabase.rpc("submit_leave_request", {
    p_leave_type: result.value.leaveType,
    p_start_date: result.value.startDate,
    p_end_date: result.value.endDate,
    p_position_ids: result.value.records.map((r) => r.positionId),
  });
  if (error) redirect(`/requests/new?error=${dbErrorCode(error)}`);

  revalidatePath("/requests");
  redirect("/requests?done=submitted");
}

/** AC-LEAVE-08: працівник виправляє заявку на доопрацюванні й подає знову. */
export async function resubmitLeaveRequest(formData: FormData) {
  const { supabase } = await requireRole("employee");
  const requestId = text(formData, "request_id");

  // RLS: працівник бачить лише записи власних заявок.
  const { data: records } = await supabase.from("leave_records").select("status").eq("request_id", requestId);
  const result = resubmit(
    { recordStatuses: (records ?? []).map((r) => r.status as RecordStatus) },
    {
      leaveType: text(formData, "leave_type"),
      startDate: text(formData, "start_date"),
      endDate: text(formData, "end_date"),
    },
  );
  if (!result.ok) redirect(`/requests?error=${result.error}`);

  // Політика RLS пускає оновлення лише власної заявки на доопрацюванні; тригер повертає записи в pending.
  const { data: updated, error } = await supabase
    .from("leave_requests")
    .update({
      leave_type: result.value.leaveType,
      start_date: result.value.startDate,
      end_date: result.value.endDate,
    })
    .eq("id", requestId)
    .select("id");
  if (error) redirect(`/requests?error=${dbErrorCode(error)}`);
  if (!updated?.length) redirect("/requests?error=NOT_NEEDS_REVISION");

  revalidatePath("/requests");
  redirect("/requests?done=resubmitted");
}
