import { validateDates } from "./submission";
import { fail, ok, type IsoDate, type LeaveType, type RecordStatus, type RequestStatus, type Result } from "./types";

export type Decision = "approve" | "return";

export interface DecisionOutcome {
  status: Exclude<RecordStatus, "pending">;
  comment: string | null;
  decidedBy: string;
  decidedAt: Date;
}

/**
 * AC-LEAVE-06, AC-LEAVE-07: рішення менеджера щодо запису на розгляді.
 * - approve → approved; фіксуємо, хто і коли (у базі їх ставить тригер private.set_decision_fields);
 * - return → needs_revision лише з непорожнім коментарем, інакше COMMENT_REQUIRED (статус не змінюється).
 */
export function decide(
  record: { status: RecordStatus },
  decision: Decision,
  options: { comment?: string | null; actorId: string; now: Date },
): Result<DecisionOutcome> {
  if (record.status !== "pending") return fail("NOT_PENDING");
  const comment = options.comment?.trim() ?? "";
  if (decision === "return" && comment === "") return fail("COMMENT_REQUIRED");
  return ok({
    status: decision === "approve" ? "approved" : "needs_revision",
    comment: comment === "" ? null : comment,
    decidedBy: options.actorId,
    decidedAt: options.now,
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
  /** Усі записи заявки знову на розгляді (власне припущення в docs/spec-reading.md). */
  recordStatus: "pending";
}

/**
 * AC-LEAVE-08: працівник виправляє заявку на доопрацюванні (тип, дати) і подає знову → pending.
 * У базі: політика leave_requests_update_own_needs_revision + тригер private.resubmit_records.
 */
export function resubmit(
  request: { recordStatuses: RecordStatus[] },
  input: { leaveType: string; startDate: string; endDate: string },
): Result<Resubmission> {
  if (requestStatus(request.recordStatuses) !== "needs_revision") return fail("NOT_NEEDS_REVISION");
  const dates = validateDates(input.leaveType, input.startDate, input.endDate);
  if (!dates.ok) return dates;
  return ok({ ...dates.value, recordStatus: "pending" });
}
