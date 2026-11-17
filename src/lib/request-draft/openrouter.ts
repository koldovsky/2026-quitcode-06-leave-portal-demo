import "server-only";
// Єдине місце, що читає OPENROUTER_API_KEY (npm run check:boundary). Імпорт цього файлу в Client Component —
// помилка збірки. Ключ — у .env.local і в змінних Vercel (ADR 0004); ніколи з префіксом NEXT_PUBLIC_:
// усе з цим префіксом next build вбудовує в JavaScript для браузера.
import type { LanguageModel } from "ai";
import { makeDraftModel } from "./models";

/** Модель для чернетки або null, якщо ключа немає: тоді помічник «недоступний», а форма працює (AC-DRAFT-06). */
export function draftModel(): LanguageModel | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  return makeDraftModel(key, process.env.OPENROUTER_MODEL);
}
