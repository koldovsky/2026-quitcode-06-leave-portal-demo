import { fail, ok, type Position, type RecordDraft, type Result } from "./types";

/**
 * AC-LEAVE-01, AC-LEAVE-02: заявка має по одному запису на кожну посаду, яку позначив працівник.
 * «Відсутність покриває обидві посади» = працівник позначив обидві (Q1, відповідь PM — варіант A).
 * Порядок записів: спершу основна посада, потім додаткова.
 */
export function splitIntoRecords(positions: Position[], selectedIds: string[]): Result<RecordDraft[]> {
  const selected = [...new Set(selectedIds)];
  if (selected.length === 0) return fail("NO_POSITIONS");

  const byId = new Map(positions.map((p) => [p.id, p]));
  const chosen: Position[] = [];
  for (const id of selected) {
    const position = byId.get(id);
    if (!position) return fail("UNKNOWN_POSITION");
    chosen.push(position);
  }

  chosen.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "main" ? -1 : 1));
  return ok(
    chosen.map((p) => ({ positionId: p.id, kind: p.kind, divisionId: p.divisionId, status: "pending" as const })),
  );
}
