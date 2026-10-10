import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtures, runScript } from "./run-script";

const run = (name: string) => runScript("check-ac-coverage.mjs", path.join(fixtures, "ac-coverage", name));

describe("scripts/check-ac-coverage.mjs", () => {
  it("passes when every implemented row has a test and REMOVED/commented rows are ignored", () => {
    const { code, out } = run("ok");
    expect(out).toContain("AC у специфікаціях: 2");
    expect(out).toContain("рядків у матриці: 2");
    expect(code).toBe(0);
  });

  it("reports NO-ROW when the spec has an AC without a matrix row", () => {
    const { code, out } = run("no-row");
    expect(code).toBe(1);
    expect(out).toContain("NO-ROW");
    expect(out).toMatch(/AC-DEMO-02 \(openspec\/specs\/leave\/spec\.md:\d+\)/);
  });

  it("reports MISSING when an implemented row only has skipped or todo tests", () => {
    const { code, out } = run("missing-test");
    expect(code).toBe(1);
    expect(out).toContain("MISSING");
    expect(out).toContain("AC-DEMO-02");
    expect(out).not.toMatch(/MISSING[\s\S]*AC-DEMO-01/);
  });

  it("does not count tests in files Vitest never runs (*.spec.ts, plain .ts)", () => {
    const { code, out } = run("not-run");
    expect(code).toBe(1);
    expect(out).toContain("MISSING");
    expect(out).toContain("AC-DEMO-01");
  });

  it("does not count it(\"AC-…\") without a test function (Vitest treats it as todo)", () => {
    const { code, out } = run("no-body");
    expect(code).toBe(1);
    expect(out).toContain("MISSING");
    expect(out).toContain("AC-DEMO-01");
  });

  it("reports WRONG-REF for missing paths and tests in another file, but not for line numbers or column names", () => {
    const { code, out } = run("wrong-ref");
    expect(code).toBe(1);
    const wrong = out.slice(out.indexOf("WRONG-REF"));
    expect(wrong).toContain("`src/nope.ts`");
    expect(wrong).toContain("`tests/nope.test.ts`");
    expect(wrong).toMatch(/AC-DEMO-02 — docs\/conformance\.md:8: у файлах колонки «Тест» немає тесту/);
    expect(wrong).not.toContain("src/lib/demo.ts");
    expect(wrong).not.toContain("public.x");
    expect(wrong).not.toContain("leave_records.kind");
    expect(out).not.toContain("MISSING");
  });

  it("reports ORPHAN when a test names an AC that the spec lacks", () => {
    const { code, out } = run("orphan");
    expect(code).toBe(1);
    expect(out).toContain("ORPHAN");
    expect(out).toContain("AC-DEMO-42");
  });

  it("ignores commented-out tests, test.fail and skipped describe blocks but counts .each, .for, .concurrent and .runIf", () => {
    const { code, out } = run("test-forms");
    expect(code).toBe(1);
    const missing = out.slice(out.indexOf("MISSING"), out.indexOf("FAIL"));
    // Закоментовані (// і /* */) — тесту немає взагалі; describe.skip — «є лише пропущені».
    expect(missing).toContain("AC-DEMO-01");
    expect(missing).toContain("AC-DEMO-02");
    expect(missing).toMatch(/AC-DEMO-08 .*є лише пропущені/);
    // Playwright test.fail(title, …) очікувано падає — не покриття.
    expect(missing).toMatch(/AC-DEMO-09 .*є лише пропущені/);
    // `//` і `/*` усередині назви не ламають розбір; .each/.for/.concurrent.each/.runIf і «Реалізовано» з великої — рахуються.
    for (const id of ["AC-DEMO-03", "AC-DEMO-04", "AC-DEMO-05", "AC-DEMO-06", "AC-DEMO-07"]) {
      expect(missing).not.toContain(id);
    }
    expect(out).not.toContain("ORPHAN");
    expect(out).toContain("проблем — 4");
  });

  it("reports BAD-STATUS for unknown statuses, deferrals without a reason and «Реалізовано частково»", () => {
    const { code, out } = run("bad-status");
    expect(code).toBe(1);
    expect(out).toContain("BAD-STATUS");
    expect(out).toContain("готово");
    expect(out).toContain("«Реалізовано частково»");
    expect(out).not.toContain("MISSING");
  });

  it("passes on an empty template", () => {
    const { code, out } = run("empty");
    expect(code).toBe(0);
    expect(out).toContain("порожній шаблон");
  });
});
