// Чернетка заявки з опису вільним текстом (AC-DRAFT-01…07) — чиста функція: модель передають параметром.
// Застосунок передає модель OpenRouter (openrouter.ts), тести — MockLanguageModelV4 із записаною відповіддю.
// Тут немає "server-only", Supabase і Next.js, тож Vitest імпортує файл напряму. Нічого не зберігає (AC-DRAFT-02).
import { APICallError, NoObjectGeneratedError, Output, RetryError, generateText, type LanguageModel, type LanguageModelUsage } from "ai";
import { isFallback, logLlmCall } from "@/lib/ai/llm-log";
import { normalizeSubstitute, validateDates } from "@/lib/leave/submission";
import type { IsoDate, LeaveType } from "@/lib/leave/types";
import { DRAFT_PROMPT_VERSION, INSTRUCTIONS, buildUserMessage, sanitizeDescription } from "./prompt";
import { ModelDraftSchema, type DraftPositions, type ModelDraft } from "./schema";

/** Поля форми нової заявки, які заповнює чернетка. */
export interface DraftFields {
  leaveType: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  positions: DraftPositions | null;
  substituteNote: string | null;
}

/** Що відповіла модель: id моделі, яка відповіла (з ланцюжка fallback), і сирий текст — для eval і запису. */
export interface ModelAnswer {
  modelId: string;
  text: string;
}

export type UnavailableReason = "not_configured" | "rate_limited" | "timeout" | "invalid_output" | "provider_error";

export type DraftOutcome =
  | { kind: "ok"; draft: DraftFields; answer: ModelAnswer }
  | { kind: "needs_info" | "refused"; answer?: ModelAnswer }
  | { kind: "unavailable"; reason: UnavailableReason };

export interface DraftOptions {
  /** 0 за замовчуванням: на безкоштовному тарифі повтор після 429 лише витрачає ту саму денну квоту. */
  maxRetries?: number;
  /** 25 с: людина чекає на сторінці; функція Vercel живе довше (maxDuration сторінки — 60 с). */
  timeoutMs?: number;
  /**
   * WS11: куди писати рядок llm.call (src/lib/ai/llm-log.ts). Немає — журналу немає: так працюють golden і eval.
   * requestId — щоб знайти рядок у Runtime Logs Vercel; route — шаблон маршруту, без параметрів.
   */
  log?: { requestId: string; route: string };
}

/** Що відомо про один виклик моделі для журналу llm.call. Тексту опису, промпту й відповіді тут немає. */
interface CallFacts {
  model: string;
  started: number;
  usage?: LanguageModelUsage;
  costUsd?: unknown;
}

/** id моделі, яку просили першою (у ланцюжку fallback — перша). LanguageModel буває і рядком. */
function primaryModelId(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}

function logCall(opts: DraftOptions, primary: string, outcome: DraftOutcome, facts: CallFacts) {
  if (!opts.log) return;
  // state — те, що побачила людина (outcome.kind), а не status моделі: «ok» з датою кінця раніше за початок
  // toOutcome перетворює на needs_info, і саме needs_info є правдою для журналу.
  logLlmCall({
    requestId: opts.log.requestId,
    route: opts.log.route,
    model: facts.model,
    fallbackUsed: isFallback(facts.model, primary),
    state: outcome.kind,
    latencyMs: performance.now() - facts.started,
    inputTokens: facts.usage?.inputTokens,
    outputTokens: facts.usage?.outputTokens,
    costUsd: typeof facts.costUsd === "number" ? facts.costUsd : undefined,
    promptVersion: DRAFT_PROMPT_VERSION,
    // Лише КОД причини: текст помилки постачальника може містити фрагменти запиту, у журнал він не йде.
    errorKind: outcome.kind === "unavailable" ? outcome.reason : undefined,
  });
}

/**
 * WS11: ключа немає — моделі не викликаємо, але рядок llm.call пишемо (state unavailable, errorKind not_configured).
 * Інакше помічник, вимкнений хибною змінною середовища, у журналі просто мовчав би.
 */
export function logNotConfigured(opts: DraftOptions | undefined) {
  if (!opts?.log) return;
  logLlmCall({
    requestId: opts.log.requestId,
    route: opts.log.route,
    model: "none",
    fallbackUsed: false,
    state: "unavailable",
    latencyMs: 0,
    promptVersion: DRAFT_PROMPT_VERSION,
    errorKind: "not_configured",
  });
}

export async function extractDraft(
  input: { text: string; today: IsoDate },
  model: LanguageModel,
  opts: DraftOptions = {},
): Promise<DraftOutcome> {
  // Порожній опис моделі не надсилаємо: квоту не витрачаємо (AC-DRAFT-03).
  if (!sanitizeDescription(input.text)) return { kind: "needs_info" };
  const primary = primaryModelId(model);
  const started = performance.now();
  try {
    const result = await generateText({
      model,
      instructions: INSTRUCTIONS,
      prompt: buildUserMessage(input.text, input.today),
      output: Output.object({ name: "leave_request_draft", schema: ModelDraftSchema }),
      temperature: 0,
      maxRetries: opts.maxRetries ?? 0,
      timeout: opts.timeoutMs ?? 25_000,
    });
    // result.output уже перевірено схемою zod (інакше — NoObjectGeneratedError).
    const outcome = toOutcome(result.output, { modelId: result.response.modelId, text: result.text });
    const openrouter = result.providerMetadata?.openrouter as { usage?: { cost?: unknown } } | undefined;
    logCall(opts, primary, outcome, { model: result.response.modelId, started, usage: result.usage, costUsd: openrouter?.usage?.cost });
    return outcome;
  } catch (error) {
    // Запасний шлях: модель без строгого JSON Schema може загорнути JSON у ```json … ``` (живцем не перевірено).
    const recovered = recoverFromText(error);
    if (recovered && NoObjectGeneratedError.isInstance(error)) {
      logCall(opts, primary, recovered, { model: error.response?.modelId ?? primary, started, usage: error.usage });
      return recovered;
    }
    const failure: DraftOutcome = { kind: "unavailable", reason: classifyError(error) };
    logCall(opts, primary, failure, { model: primary, started });
    return failure;
  }
}

/** Відповідь моделі → стан чернетки. Дати й заміну перевіряємо тими самими функціями, що й форма подання. */
export function toOutcome(draft: ModelDraft, answer: ModelAnswer): DraftOutcome {
  if (draft.status === "refused") return { kind: "refused", answer };
  if (draft.status === "needs_info") return { kind: "needs_info", answer };
  // «ok» без типу, з неіснуючою датою чи з датою кінця раніше за початок — це не чернетка, а «уточніть опис»:
  // дат місцями не міняємо й не вгадуємо (golden case 8, AC-DRAFT-03).
  const dates = validateDates(draft.leaveType ?? "", draft.startDate ?? "", draft.endDate ?? "");
  if (!dates.ok) return { kind: "needs_info", answer };
  const substitute = normalizeSubstitute(draft.substituteNote);
  return {
    kind: "ok",
    draft: { ...dates.value, positions: draft.positions, substituteNote: substitute.ok ? substitute.value : null },
    answer,
  };
}

const FENCED = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i;

function recoverFromText(error: unknown): DraftOutcome | null {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text) return null;
  const match = error.text.match(FENCED);
  if (!match) return null;
  try {
    const parsed = ModelDraftSchema.safeParse(JSON.parse(match[1]));
    return parsed.success ? toOutcome(parsed.data, { modelId: error.response?.modelId ?? "unknown", text: error.text }) : null;
  } catch {
    return null;
  }
}

/** Помилка виклику → причина «помічник недоступний» (AC-DRAFT-06). Текст опису в помилках не логуємо. */
export function classifyError(error: unknown): UnavailableReason {
  // Після повторів AI SDK загортає останню помилку в RetryError.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause)) return "invalid_output";
  if (APICallError.isInstance(cause)) {
    // HTTP 200 з тілом { error }: провайдер кидає statusCode 200, data = body.error (dist/index.js провайдера 3.1.0).
    const code = cause.statusCode === 200 ? (cause.data as { code?: unknown } | undefined)?.code : cause.statusCode;
    if (code === 429 || code === "429") return "rate_limited";
  }
  if (cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")) return "timeout";
  return "provider_error";
}
