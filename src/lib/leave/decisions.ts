import { normalizeSubstitute, validateDates } from "./submission";
import { fail, ok, type IsoDate, type LeaveType, type RecordStatus, type RequestStatus, type Result } from "./types";

export type Decision = "approve" | "return";

export interface DecisionOutcome {
  status: Exclude<RecordStatus, "pending">;
  comment: string | null;
}

/**
 * AC-LEAVE-07: рішення менеджера щодо запису на розгляді — лише новий статус і коментар.
 * - approve → approved;
 * - return → needs_revision лише з непорожнім коментарем, інакше COMMENT_REQUIRED (статус не змінюється).
 * Хто і коли (AC-LEAVE-06) сюди не передаємо: їх ставить тригер private.set_decision_fields у базі
 * (перевірка — tests/db/leave-db.test.ts).
 */
export function decide(
  record: { status: RecordStatus },
  decision: Decision,
  options: { comment?: string | null } = {},
): Result<DecisionOutcome> {
  if (record.status !== "pending") return fail("NOT_PENDING");
  const comment = options.comment?.trim() ?? "";
  if (decision === "return" && comment === "") return fail("COMMENT_REQUIRED");
  return ok({
    status: decision === "approve" ? "approved" : "needs_revision",
    comment: comment === "" ? null : comment,
  });
}

/**
 * Статус заявки — похідний від записів (глосарій «Статус заявки»):
 * на доопрацюванні, якщо хоч один запис на доопрацюванні; схвалено, якщо всі схвалено; інакше на розгляді.
 */
export function requestStatus(recordStatuses: RecordStatus[]): RequestStatus {
  if (recordStatuses.includes("needs_revision")) return "needs_revision";
  if (recordStatuses.length > 0 && recordStatuses.every((s) => s === "approved")) return "approved";
  return "pending";
}

export interface Resubmission {
  leaveType: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  substituteNote: string | null;
  /** Усі записи заявки знову на розгляді (власне припущення в docs/spec-reading.md). */
  recordStatus: "pending";
}

/**
 * AC-LEAVE-08: працівник виправляє заявку на доопрацюванні (тип, дати) і подає знову → pending.
 * У базі: політика leave_requests_update_own_needs_revision + тригер private.resubmit_records.
 */
export function resubmit(
  request: { recordStatuses: RecordStatus[] },
  input: { leaveType: string; startDate: string; endDate: string; substituteNote?: string | null },
): Result<Resubmission> {
  if (requestStatus(request.recordStatuses) !== "needs_revision") return fail("NOT_NEEDS_REVISION");
  const dates = validateDates(input.leaveType, input.startDate, input.endDate);
  if (!dates.ok) return dates;
  const substitute = normalizeSubstitute(input.substituteNote);
  if (!substitute.ok) return substitute;
  return ok({ ...dates.value, substituteNote: substitute.value, recordStatus: "pending" });
}
