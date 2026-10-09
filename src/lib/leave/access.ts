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
 * AC-LEAVE-09: працівник бачить лише власні заявки, менеджер — лише записи своєї черги, адміністратор — усі.
 * Це те саме правило, що й політики RLS у supabase/migrations/20261013000000_leave_requests.sql:
 * у базі воно діє для кожного запиту, а тут описане явно — щоб сторінки показували кнопки рішення
 * лише там, де менеджер справді може його ухвалити.
 */
export function canViewRecord(viewer: Viewer, record: VisibleRecord): boolean {
  if (viewer.role === "admin") return true;
  if (record.employeeId === viewer.id) return true;
  return viewer.role === "manager" && viewer.managedDivisionIds.includes(record.divisionId);
}

/** Чи може цей користувач ухвалити рішення щодо запису (лише менеджер підрозділу запису). */
export function canDecideRecord(viewer: Viewer, record: VisibleRecord): boolean {
  return viewer.role === "manager" && viewer.managedDivisionIds.includes(record.divisionId);
}
