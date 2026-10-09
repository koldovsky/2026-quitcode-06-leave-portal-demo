import { countLeaveDays } from "./blocked-days";
import { requestStatus } from "./decisions";
import { fail, ok, type IsoDate, type RecordStatus, type Result } from "./types";

export interface ExistingRequest {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  recordStatuses: RecordStatus[];
}

/** Чи перетинаються два діапазони дат (обидва кінці включно). */
export function rangesOverlap(a: { startDate: IsoDate; endDate: IsoDate }, b: { startDate: IsoDate; endDate: IsoDate }) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/**
 * Перевірки заявки проти календаря й інших заявок працівника (spec-v0.2):
 * - AC-LEAVE-10: усі дні діапазону заблоковані → ONLY_BLOCKED_DAYS;
 * - AC-LEAVE-11: перетин із власною заявкою на розгляді чи схваленою → OVERLAPPING_REQUEST
 *   (заявка на доопрацюванні не блокує; excludeRequestId — сама заявка під час повторного подання).
 * Повертає кількість днів відсутності (AC-LEAVE-04: заблоковані дні не рахуються).
 */
export function checkCalendar(
  range: { startDate: IsoDate; endDate: IsoDate },
  context: { blockedDays: Iterable<IsoDate>; existing: ExistingRequest[]; excludeRequestId?: string },
): Result<{ countedDays: number }> {
  const days = countLeaveDays(range.startDate, range.endDate, context.blockedDays);
  if (days.counted === 0) return fail("ONLY_BLOCKED_DAYS");

  const blocking = context.existing.find(
    (r) =>
      r.id !== context.excludeRequestId &&
      requestStatus(r.recordStatuses) !== "needs_revision" &&
      rangesOverlap(range, r),
  );
  if (blocking) return fail("OVERLAPPING_REQUEST");

  return ok({ countedDays: days.counted });
}
