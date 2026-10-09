import type { Division } from "./types";

/**
 * AC-LEAVE-05: запис потрапляє в чергу менеджера підрозділу своєї посади (Q3 — варіант A).
 * Працівник із посадами у двох підрозділах дає дві черги: кожен менеджер вирішує свій запис.
 * У базі це правило — політика RLS leave_records_select_own_division_or_admin.
 */
export function managerOf(record: { divisionId: string }, divisions: Division[]): string | null {
  return divisions.find((d) => d.id === record.divisionId)?.managerId ?? null;
}

/** Черги: менеджер → записи. Записи підрозділу без менеджера — під ключем null (бачить лише admin). */
export function routeRecords<R extends { divisionId: string }>(
  records: R[],
  divisions: Division[],
): Map<string | null, R[]> {
  const queues = new Map<string | null, R[]>();
  for (const record of records) {
    const manager = managerOf(record, divisions);
    if (!queues.has(manager)) queues.set(manager, []);
    queues.get(manager)!.push(record);
  }
  return queues;
}
