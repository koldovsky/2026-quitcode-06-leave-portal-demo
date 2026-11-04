// Модель для чернетки: безкоштовні моделі OpenRouter з ланцюжком fallback (ADR 0004). Без читання змінних
// середовища й без "server-only": ключ передає виклик — серверна обгортка openrouter.ts або живий eval.
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Порядок — пріоритет (research 04.11.2026: багатомовна Gemma 4 — перша; Nemotron Super VL — єдина зі строгим
// JSON Schema серед трьох). Лише id з «:free»: платна модель у `models` тарифікується за платною ціною.
// Безкоштовні моделі змінюються — перевіряйте список перед заняттям (docs/demo/RUNBOOK-ws10.md).
export const FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
] as const;

const CHAIN_LENGTH = 3;

/** Ланцюжок моделей: OPENROUTER_MODEL першою, якщо це id з «:free», далі — FREE_MODELS; не довше 3. */
export function modelChain(preferred?: string | null): string[] {
  const first = preferred?.trim();
  if (!first?.endsWith(":free")) return [...FREE_MODELS];
  return [first, ...FREE_MODELS.filter((m) => m !== first)].slice(0, CHAIN_LENGTH);
}

/**
 * OpenRouter-модель з fallback: на будь-яку помилку першої моделі (збій, ліміт провайдера) OpenRouter пробує наступну.
 * Денний ліміт безкоштовних запитів акаунта ланцюжок НЕ обходить — це один лічильник на всі «:free» моделі.
 * `provider.require_parameters` не вмикаємо: Gemma не має `structured_outputs` і могла б випасти з маршрутизації;
 * тому схема продубльована в промпті, а відповідь завжди перевіряє zod.
 */
export function makeDraftModel(apiKey: string, preferred?: string | null) {
  const chain = modelChain(preferred);
  const openrouter = createOpenRouter({ apiKey, appName: "Leave portal demo (QuitCode)" });
  return openrouter.chat(chain[0], { models: chain });
}
