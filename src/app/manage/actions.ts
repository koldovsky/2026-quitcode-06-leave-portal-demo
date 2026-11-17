"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canDecideRecord } from "@/lib/leave/access";
import { decide, type Decision } from "@/lib/leave/decisions";
import type { RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";

/** AC-LEAVE-06, AC-LEAVE-07: менеджер схвалює запис або повертає його на доопрацювання з коментарем. */
export async function decideRecord(formData: FormData) {
  const { supabase, viewer } = await requireRole("manager");
  const recordId = String(formData.get("record_id") ?? "");
  const decision: Decision = formData.get("decision") === "return" ? "return" : "approve";

  // RLS: менеджер бачить лише записи підрозділів, якими керує (AC-LEAVE-05, AC-LEAVE-09).
  const { data: record } = await supabase
    .from("leave_records")
    .select("id, status, division_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!record || !canDecideRecord(viewer, { employeeId: "", divisionId: record.division_id })) {
    redirect("/manage?error=NOT_IN_QUEUE");
  }

  const result = decide({ status: record.status as RecordStatus }, decision, {
    comment: String(formData.get("comment") ?? ""),
  });
  if (!result.ok) redirect(`/manage?error=${result.error}&record=${recordId}`);

  // Хто і коли (decided_by, decided_at) ставить тригер у базі — клієнт їх не передає.
  const { data: updated, error } = await supabase
    .from("leave_records")
    .update({ status: result.value.status, comment: result.value.comment })
    .eq("id", recordId)
    .eq("status", "pending")
    .select("id");
  if (error) redirect("/manage?error=DB_ERROR");
  if (!updated?.length) redirect("/manage?error=NOT_PENDING");

  revalidatePath("/manage");
  redirect(`/manage?done=${result.value.status}`);
}

/** Черга менеджера для таблиці: записи на розгляді підрозділів, якими він керує (RLS), від найстаріших. */
export async function exportQueueCsv(): Promise<string> {
  const { supabase } = await requireRole("manager");
  const { data } = await supabase
    .from("leave_records")
    .select("id, request_id, kind, division_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const rows = (data ?? []).map((r) => [r.id, r.request_id, r.kind, r.division_id, r.created_at].join(","));
  return ["id,request_id,kind,division_id,created_at", ...rows].join("\n");
}
