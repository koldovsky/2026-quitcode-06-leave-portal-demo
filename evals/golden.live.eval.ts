// npm run eval — 10 golden cases PM на справжніх безкоштовних моделях OpenRouter (не в CI, не в `npm test`).
// Без OPENROUTER_API_KEY увесь набір пропускається (skip) — нуль запитів. З ключем:
//   1) preflight GET /api/v1/key: скільки безкоштовних запитів лишилось сьогодні (UTC), і чи вистачить на 10;
//   2) case за case'ом, послідовно, з паузою 4 с (ліміт 20 запитів/хв), maxRetries 0 (повтор після 429 лише палить квоту);
//   3) точне порівняння з очікуваним PM (tests/request-draft/golden.ts) — без LLM-судді: усі поля перелічувані;
//   4) таблиця: case, AC, модель, що відповіла (ланцюжок fallback!), результат, вердикт; pass rate загалом і за моделями;
//   5) звіт у docs/qa/eval/<дата>.md; RECORD=1 — відповіді, що пройшли, зливаються в tests/fixtures/golden/recorded.json.
// Перший 429 зупиняє прогін: решта case'ів — «не запущено», квоту далі не витрачаємо.
// EVAL_REPLAY=1 — План Б без ключа: той самий прогін і той самий формат виводу, але відповіді — з recorded.json
// (MockLanguageModelV4, без мережі). Це НЕ оцінка моделі: звіт не пишемо, RECORD вимкнено.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { MockLanguageModelV4 } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractDraft, type DraftOutcome } from "@/lib/request-draft/extract";
import { makeDraftModel, modelChain } from "@/lib/request-draft/models";
import { GOLDEN_CASES, GOLDEN_TODAY, RECORDINGS, scoreCase, type Recording } from "../tests/request-draft/golden";

const KEY = process.env.OPENROUTER_API_KEY?.trim() ?? "";
const PREFERRED = process.env.OPENROUTER_MODEL;
const REPLAY = process.env.EVAL_REPLAY === "1";
const RECORD = process.env.RECORD === "1" && !REPLAY;
const PASS_BAR = Number(process.env.PASS_BAR ?? 8); // поріг PM: щонайменше 8 з 10
const GAP_MS = 4_000;
const RECORDED_PATH = "tests/fixtures/golden/recorded.json";

type Row = { case: string; ac: string; model: string; result: string; verdict: "PASS" | "FAIL" | "ERROR" | "NOT RUN"; why: string; ms: number };
const rows: Row[] = [];
const fresh: Record<string, Recording> = {};
let stopped = false;

const describeLive = describe.skipIf(!KEY && !REPLAY);
const TITLE = REPLAY
  ? "golden cases PM — РЕПЛЕЙ записів (EVAL_REPLAY=1, не жива модель)"
  : "golden cases PM — живий прогін (безкоштовні моделі OpenRouter)";

/** Справжня модель OpenRouter або, в EVAL_REPLAY=1, записана відповідь цього case'а. */
function modelFor(caseId: string) {
  if (!REPLAY) return makeDraftModel(KEY, PREFERRED);
  const rec = RECORDINGS[caseId];
  return new MockLanguageModelV4({
    modelId: `${rec.modelId} (replay${rec.placeholder ? ", placeholder" : ""})`,
    doGenerate: async () => ({
      content: [{ type: "text", text: rec.text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 0, text: 0, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describeLive(TITLE, () => {
  beforeAll(async () => {
    if (REPLAY) {
      console.info("EVAL_REPLAY=1: відповіді — з tests/fixtures/golden/recorded.json, мережі й ключа немає. Це не оцінка моделі.");
      return;
    }
    // Відповідь: { data: { is_free_tier, free_model_daily_requests: { used, limit, remaining } } } за поточний UTC-день.
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${KEY}` } });
    if (!res.ok) throw new Error(`OpenRouter /api/v1/key: HTTP ${res.status} — перевірте OPENROUTER_API_KEY у .env.local`);
    const body = (await res.json()) as { data?: { is_free_tier?: boolean; free_model_daily_requests?: { used?: number; limit?: number; remaining?: number } } };
    const quota = body.data?.free_model_daily_requests;
    console.info(
      `OpenRouter: безкоштовних запитів сьогодні (UTC) лишилось ${quota?.remaining ?? "?"} з ${quota?.limit ?? "?"}; ` +
        `потрібно ${GOLDEN_CASES.length}. Ланцюжок моделей: ${modelChain(PREFERRED).join(" → ")}`,
    );
    if (typeof quota?.remaining === "number" && quota.remaining < GOLDEN_CASES.length) {
      throw new Error(`Лишилось ${quota.remaining} безкоштовних запитів, потрібно ${GOLDEN_CASES.length}. Ліміт оновлюється о 00:00 UTC (02:00 за Києвом).`);
    }
  });

  for (const c of GOLDEN_CASES) {
    it(`${c.id} ${c.ac} — «${c.input}»`, async (ctx) => {
      if (stopped) {
        rows.push({ case: c.id, ac: c.ac, model: "-", result: "-", verdict: "NOT RUN", why: "зупинено після 429", ms: 0 });
        ctx.skip();
      }
      if (!REPLAY) await sleep(GAP_MS);
      const started = Date.now();
      const outcome = await extractDraft({ text: c.input, today: GOLDEN_TODAY }, modelFor(c.id), {
        maxRetries: 0,
        timeoutMs: 60_000,
      });
      const ms = Date.now() - started;

      if (outcome.kind === "unavailable") {
        if (outcome.reason === "rate_limited") stopped = true;
        rows.push({ case: c.id, ac: c.ac, model: "-", result: `unavailable: ${outcome.reason}`, verdict: "ERROR", why: "", ms });
        expect.fail(`${c.id}: помічник недоступний (${outcome.reason})`);
      }

      const mismatches = scoreCase(c.expected, outcome);
      const pass = mismatches.length === 0;
      rows.push({
        case: c.id,
        ac: c.ac,
        model: outcome.answer?.modelId ?? "-",
        result: describeOutcome(outcome),
        verdict: pass ? "PASS" : "FAIL",
        why: mismatches.map((m) => `${m.field}: очікувано ${String(m.expected)}, є ${String(m.actual)}`).join("; "),
        ms,
      });
      if (RECORD && pass && outcome.answer) {
        fresh[c.id] = { modelId: outcome.answer.modelId, recordedAt: new Date().toISOString(), text: outcome.answer.text };
      }
      // Окремий case може не пройти — рішення ухвалює поріг PM нижче, а не один приклад.
      expect(outcome.kind).toMatch(/^(ok|needs_info|refused)$/);
    });
  }

  it(`pass rate — не нижче порогу PM (${PASS_BAR}/${GOLDEN_CASES.length})`, () => {
    const passed = rows.filter((r) => r.verdict === "PASS").length;
    expect(passed, summary()).toBeGreaterThanOrEqual(PASS_BAR);
  });

  afterAll(() => {
    console.table(rows);
    console.info(summary());
    if (!REPLAY) writeReport();
    if (RECORD && Object.keys(fresh).length > 0) {
      // Злиття, а не заміна: case, що не пройшов чи не запускався, зберігає попередній запис — npm test лишається зеленим.
      const old = JSON.parse(readFileSync(RECORDED_PATH, "utf8")) as Record<string, Recording>;
      writeFileSync(RECORDED_PATH, `${JSON.stringify({ ...old, ...fresh }, null, 2)}\n`);
      console.info(`RECORD=1: оновлено записи ${Object.keys(fresh).join(", ")} у ${RECORDED_PATH}`);
    }
  });
});

function describeOutcome(outcome: DraftOutcome): string {
  if (outcome.kind !== "ok") return outcome.kind;
  const d = outcome.draft;
  return `ok ${d.leaveType} ${d.startDate}..${d.endDate}${d.positions ? ` ${d.positions}` : ""}${d.substituteNote ? ` заміна «${d.substituteNote}»` : ""}`;
}

/** «pass rate 9/10 (90%) · поріг PM 8/10 · за моделями: google/gemma-4-31b-it:free 8/9, …» */
function summary(): string {
  const ran = rows.filter((r) => r.verdict !== "NOT RUN");
  const passed = rows.filter((r) => r.verdict === "PASS").length;
  const byModel = new Map<string, { pass: number; all: number }>();
  for (const r of ran.filter((x) => x.model !== "-")) {
    const m = byModel.get(r.model) ?? { pass: 0, all: 0 };
    m.all++;
    if (r.verdict === "PASS") m.pass++;
    byModel.set(r.model, m);
  }
  const models = [...byModel].map(([id, m]) => `${id} ${m.pass}/${m.all}`).join(", ") || "—";
  const pct = Math.round((passed / GOLDEN_CASES.length) * 100);
  return `pass rate ${passed}/${GOLDEN_CASES.length} (${pct}%) · поріг PM ${PASS_BAR}/${GOLDEN_CASES.length} · за моделями: ${models}`;
}

function writeReport() {
  const day = new Date().toISOString().slice(0, 10);
  const dir = "docs/qa/eval";
  mkdirSync(dir, { recursive: true });
  const table = [
    "| Case | AC | Модель | Результат | Вердикт | Чому не так | мс |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.case} | ${r.ac} | \`${r.model}\` | ${r.result} | ${r.verdict} | ${r.why || "—"} | ${r.ms} |`),
  ].join("\n");
  const text = [
    `# Живий прогін golden cases — ${day}`,
    "",
    `- Команда: \`npm run eval\`${RECORD ? " (RECORD=1)" : ""}; «сьогодні» case'ів — ${GOLDEN_TODAY}`,
    `- Ланцюжок моделей: ${modelChain(PREFERRED).map((m) => `\`${m}\``).join(" → ")}`,
    `- ${summary()}`,
    "",
    table,
    "",
  ].join("\n");
  writeFileSync(`${dir}/${day}.md`, text);
  console.info(`Звіт: ${dir}/${day}.md`);
}
