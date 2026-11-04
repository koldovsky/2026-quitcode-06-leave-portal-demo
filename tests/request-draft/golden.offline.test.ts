// 10 golden cases PM — офлайн-реплей записаних відповідей моделі (MockLanguageModelV4, без мережі й ключа; у CI).
// Перевіряє код навколо моделі: промпт, роздільники опису, розбір і перевірку відповіді, стан форми.
// Якість моделі тут НЕ перевіряється: recorded.json зараз — заглушки, написані вручну
// (tests/fixtures/golden/README.md). Якість — живий прогін `npm run eval` (evals/golden.live.eval.ts).
import { describe, expect, it } from "vitest";
import { extractDraft } from "@/lib/request-draft/extract";
import { GOLDEN_CASES, GOLDEN_TODAY, RECORDINGS, casesFor, scoreCase, type GoldenCase } from "./golden";
import { promptText, replay } from "./mock-model";

async function expectGolden(c: GoldenCase) {
  const recording = RECORDINGS[c.id];
  expect(recording, `немає запису для ${c.id} у tests/fixtures/golden/recorded.json`).toBeDefined();
  const model = replay(recording.text, recording.modelId);

  const outcome = await extractDraft({ text: c.input, today: GOLDEN_TODAY }, model);

  expect(scoreCase(c.expected, outcome), `${c.id}: ${c.why}`).toEqual([]);
  // Модель отримала опис лише між роздільниками, і «сьогодні» — дату з golden cases.
  expect(promptText(model)).toContain(`<employee_text>\\n${c.input}\\n</employee_text>`);
  expect(promptText(model)).toContain(`TODAY: ${GOLDEN_TODAY} вівторок`);
}

describe("Golden cases PM: офлайн-реплей (requirements/03-request-draft-assistant.md, розділ «Golden cases»)", () => {
  it("набір повний: 10 прикладів PM, на кожен — запис відповіді", () => {
    expect(GOLDEN_CASES).toHaveLength(10);
    expect(Object.keys(RECORDINGS).sort()).toEqual(GOLDEN_CASES.map((c) => c.id).sort());
  });

  it.each(casesFor("AC-DRAFT-01"))("AC-DRAFT-01: golden $id — «$input»", async (c) => {
    await expectGolden(c);
  });

  it.each(casesFor("AC-DRAFT-03"))("AC-DRAFT-03: golden $id — «$input»", async (c) => {
    await expectGolden(c);
  });

  it.each(casesFor("AC-DRAFT-04"))("AC-DRAFT-04: golden $id — «$input»", async (c) => {
    await expectGolden(c);
  });

  it.each(casesFor("AC-DRAFT-05"))("AC-DRAFT-05: golden $id — «$input»", async (c) => {
    await expectGolden(c);
  });

  it.each(casesFor("AC-DRAFT-07"))("AC-DRAFT-07: golden $id — «$input»", async (c) => {
    await expectGolden(c);
  });
});
