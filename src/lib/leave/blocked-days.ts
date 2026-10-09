import { eachDay } from "./dates";
import type { IsoDate } from "./types";

export interface LeaveDayCount {
  /** Календарні дні діапазону включно. */
  total: number;
  /** Заблоковані адміністратором дні, що потрапили в діапазон. */
  blocked: IsoDate[];
  /** Дні відсутності, що рахуються: total мінус заблоковані. */
  counted: number;
}

/**
 * AC-LEAVE-04 (spec-v0.1: «заблоковані дні не рахуються»): заявку приймаємо, а заблоковані дні
 * виключаємо з кількості днів відсутності (Q2, робоче рішення й відповідь PM — варіант B).
 * Вихідні рахуються: дні відсутності — календарні (глосарій).
 */
export function countLeaveDays(start: IsoDate, end: IsoDate, blockedDays: Iterable<IsoDate>): LeaveDayCount {
  const blockedSet = new Set(blockedDays);
  const days = eachDay(start, end);
  const blocked = days.filter((d) => blockedSet.has(d));
  return { total: days.length, blocked, counted: days.length - blocked.length };
}
