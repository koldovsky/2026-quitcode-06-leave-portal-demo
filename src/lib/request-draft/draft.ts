// Скласти чернетку для Server Action: «сьогодні» за Києвом і модель або «помічник недоступний».
// Без Next.js і Supabase — юніт-тести з AC ID (tests/request-draft/*).
import type { LanguageModel } from "ai";
import type { IsoDate } from "@/lib/leave/types";
import { extractDraft, type DraftOptions, type DraftOutcome } from "./extract";

/** «Сьогодні» — дата за київським часом (Припущення PM). en-CA форматує як YYYY-MM-DD. */
export function kyivToday(now: Date): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Скласти чернетку: немає моделі (ключа) — «помічник недоступний» без жодного запиту (AC-DRAFT-06). */
export async function proposeDraft(
  input: { text: string; now: Date; model: LanguageModel | null },
  opts?: DraftOptions,
): Promise<DraftOutcome> {
  if (!input.model) return { kind: "unavailable", reason: "not_configured" };
  return extractDraft({ text: input.text, today: kyivToday(input.now) }, input.model, opts);
}
