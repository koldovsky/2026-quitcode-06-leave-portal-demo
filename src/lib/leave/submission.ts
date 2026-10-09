import { isIsoDate } from "./dates";
import { splitIntoRecords } from "./records";
import {
  LEAVE_TYPES,
  fail,
  ok,
  type IsoDate,
  type LeaveType,
  type Position,
  type RecordDraft,
  type Result,
} from "./types";

export interface SubmissionInput {
  leaveType: string;
  startDate: string;
  endDate: string;
  positionIds: string[];
  /** Заміна (хто веде уроки) — необов'язковий вільний текст (spec-v0.2, AC-LEAVE-01). */
  substituteNote?: string | null;
}

export interface ValidSubmission {
  leaveType: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  substituteNote: string | null;
  records: RecordDraft[];
}

export const SUBSTITUTE_MAX_LENGTH = 200;

/** AC-LEAVE-01 (spec-v0.2): заміна необов'язкова; порожній текст — null; межа 200 символів — наше рішення. */
export function normalizeSubstitute(value: string | null | undefined): Result<string | null> {
  const text = value?.trim() ?? "";
  if (text.length > SUBSTITUTE_MAX_LENGTH) return fail("SUBSTITUTE_TOO_LONG");
  return ok(text === "" ? null : text);
}

export function isLeaveType(value: string): value is LeaveType {
  return (LEAVE_TYPES as readonly string[]).includes(value);
}

/**
 * Перевірка дат і типу — спільна для подання (AC-LEAVE-01…03) і повторного подання (AC-LEAVE-08).
 * AC-LEAVE-03: дата кінця раніша за дату початку → INVALID_RANGE (і нічого не зберігаємо).
 */
export function validateDates(
  leaveType: string,
  startDate: string,
  endDate: string,
): Result<{ leaveType: LeaveType; startDate: IsoDate; endDate: IsoDate }> {
  if (!isLeaveType(leaveType)) return fail("INVALID_TYPE");
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return fail("INVALID_DATE");
  if (endDate < startDate) return fail("INVALID_RANGE");
  return ok({ leaveType, startDate, endDate });
}

/** Подання заявки: дати й тип, потім записи по позначених посадах. */
export function validateSubmission(input: SubmissionInput, positions: Position[]): Result<ValidSubmission> {
  const dates = validateDates(input.leaveType, input.startDate, input.endDate);
  if (!dates.ok) return dates;
  const records = splitIntoRecords(positions, input.positionIds);
  if (!records.ok) return records;
  const substitute = normalizeSubstitute(input.substituteNote);
  if (!substitute.ok) return substitute;
  return ok({ ...dates.value, substituteNote: substitute.value, records: records.value });
}
