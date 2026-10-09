import type { AppRole } from "./types";

export interface Viewer {
  id: string;
  role: AppRole;
  /** Підрозділи, де цей користувач — менеджер. */
  managedDivisionIds: string[];
}

export interface VisibleRecord {
  employeeId: string;
  divisionId: string;
}

/**
 * Чи може цей користувач ухвалити рішення щодо запису (лише менеджер підрозділу запису) — щоб сторінки
 * показували кнопки рішення лише там, де воно можливе. Видимість (AC-LEAVE-09) і черги (AC-LEAVE-05)
 * виконують політики RLS у supabase/migrations/20261013000000_leave_requests.sql, а не цей модуль;
 * їх перевіряє tests/db/leave-db.test.ts.
 */
export function canDecideRecord(viewer: Viewer, record: VisibleRecord): boolean {
  return viewer.role === "manager" && viewer.managedDivisionIds.includes(record.divisionId);
}
