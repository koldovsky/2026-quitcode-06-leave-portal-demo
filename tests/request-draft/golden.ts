// Golden cases PM (tests/fixtures/golden/cases.json) і їхня оцінка — спільне для офлайн-реплею (npm test) і живого
// прогону (npm run eval). Поля, які зафіксував PM, порівнюємо точно; посади — так, як їх побачить форма.
import type { DraftOutcome } from "@/lib/request-draft/extract";
import casesJson from "../fixtures/golden/cases.json";
import recordedJson from "../fixtures/golden/recorded.json";

export interface GoldenCase {
  id: string;
  ac: string;
  input: string;
  why: string;
  expected: {
    kind: "ok" | "needs_info" | "refused";
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    /** «main» — лише основна (як без чернетки): чернетка може повернути null або "main". */
    positions?: "main" | "additional" | "both";
    substituteIncludes?: string;
  };
}

export interface Recording {
  modelId: string;
  recordedAt: string;
  placeholder?: boolean;
  text: string;
}

export const GOLDEN_CASES = casesJson as GoldenCase[];
export const RECORDINGS = recordedJson as Record<string, Recording>;
/** «Сьогодні» всіх golden cases — Вт 10.11.2026 за Києвом (розділ «Golden cases» вимоги PM). */
export const GOLDEN_TODAY = "2026-11-10";

export const casesFor = (ac: string) => GOLDEN_CASES.filter((c) => c.ac === ac);

export interface Mismatch {
  field: string;
  expected: unknown;
  actual: unknown;
}

/** Точне порівняння з очікуваним PM. Порожній список — case пройдено. */
export function scoreCase(expected: GoldenCase["expected"], outcome: DraftOutcome): Mismatch[] {
  if (outcome.kind !== expected.kind) return [{ field: "kind", expected: expected.kind, actual: outcome.kind }];
  if (outcome.kind !== "ok") return [];
  const d = outcome.draft;
  const actual: Record<string, unknown> = {
    leaveType: d.leaveType,
    startDate: d.startDate,
    endDate: d.endDate,
    positions: d.positions ?? "main",
  };
  const mismatches: Mismatch[] = (["leaveType", "startDate", "endDate", "positions"] as const)
    .filter((field) => expected[field] !== undefined && expected[field] !== actual[field])
    .map((field) => ({ field, expected: expected[field], actual: actual[field] }));
  if (expected.substituteIncludes && !d.substituteNote?.includes(expected.substituteIncludes)) {
    mismatches.push({ field: "substituteNote", expected: `…${expected.substituteIncludes}…`, actual: d.substituteNote });
  }
  return mismatches;
}
