// Тестові моделі AI SDK 7 (ai/test): відповідь із запису, помилка API, повільна модель. Мережі й ключа немає.
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** Модель, що відповідає записаним текстом (як справжня модель — сирим текстом, не об'єктом). */
export function replay(text: string, modelId = "recorded-model") {
  return new MockLanguageModelV4({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

/** Відповідь моделі у форматі схеми: усі ключі, «невідомо» — null. */
export function answer(fields: {
  status: "ok" | "needs_info" | "refused";
  leaveType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  positions?: string | null;
  substituteNote?: string | null;
}) {
  return JSON.stringify({ leaveType: null, startDate: null, endDate: null, positions: null, substituteNote: null, ...fields });
}

/** Модель, що відповідає помилкою HTTP (429 — ліміт безкоштовних запитів). */
export function failing(statusCode: number, data?: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new APICallError({
        message: statusCode === 429 ? "Rate limit exceeded: free-models-per-day" : "Provider returned error",
        url: "https://openrouter.ai/api/v1/chat/completions",
        requestBodyValues: {},
        statusCode,
        data,
      });
    },
  });
}

/** Модель, що не відповідає, доки її не перерве тайм-аут виклику. */
export function silent() {
  return new MockLanguageModelV4({
    doGenerate: async ({ abortSignal }) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5_000);
        abortSignal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(abortSignal.reason);
        });
      });
      throw new Error("model should have been aborted by the timeout");
    },
  });
}

/** Текст промпту, який отримала модель у першому виклику. */
export function promptText(model: MockLanguageModelV4) {
  return JSON.stringify(model.doGenerateCalls[0]?.prompt ?? null);
}
