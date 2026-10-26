import { describe, expect, it } from "vitest";
import { checkCalendar, rangesOverlap, type ExistingRequest } from "@/lib/leave/calendar";

const blockedDays = ["2026-11-05"];
const pendingEarlier: ExistingRequest = {
  id: "req-1",
  startDate: "2026-11-03",
  endDate: "2026-11-04",
  recordStatuses: ["pending"],
};

describe("Заблоковані дні й перетин заявок (spec-v0.2)", () => {
  it("AC-LEAVE-04: заявку 04.11–06.11.2026 із заблокованим 05.11 прийнято — 2 дні відсутності", () => {
    expect(checkCalendar({ startDate: "2026-11-04", endDate: "2026-11-06" }, { blockedDays, existing: [] })).toEqual({
      ok: true,
      value: { countedDays: 2 },
    });
  });

  it("AC-LEAVE-10: заявка 05.11–05.11.2026 лише із заблокованих днів — ONLY_BLOCKED_DAYS", () => {
    expect(checkCalendar({ startDate: "2026-11-05", endDate: "2026-11-05" }, { blockedDays, existing: [] })).toEqual({
      ok: false,
      error: "ONLY_BLOCKED_DAYS",
    });
  });

  it("AC-LEAVE-11: нова заявка 04.11–06.11 перетинається із заявкою pending 03.11–04.11 — OVERLAPPING_REQUEST", () => {
    expect(
      checkCalendar({ startDate: "2026-11-04", endDate: "2026-11-06" }, { blockedDays, existing: [pendingEarlier] }),
    ).toEqual({ ok: false, error: "OVERLAPPING_REQUEST" });
  });

  // Межі з AC-LEAVE-11 (обидва кінці включно). Без цих двох випадків calendar.ts має 100 % покриття, а заміна
  // «<=» на «<» у rangesOverlap лишає весь набір зеленим (мутант T1 у scripts/mutants.mjs, Stryker — calendar.ts:14).
  it("AC-LEAVE-11: нова заявка 02.11–03.11 закінчується в день початку заявки pending 03.11–04.11 — OVERLAPPING_REQUEST", () => {
    expect(
      checkCalendar({ startDate: "2026-11-02", endDate: "2026-11-03" }, { blockedDays, existing: [pendingEarlier] }),
    ).toEqual({ ok: false, error: "OVERLAPPING_REQUEST" });
  });

  it("AC-LEAVE-11: заявка 01.11–02.11 цілком раніше за pending 03.11–04.11 — приймається", () => {
    expect(
      checkCalendar({ startDate: "2026-11-01", endDate: "2026-11-02" }, { blockedDays, existing: [pendingEarlier] }),
    ).toEqual({ ok: true, value: { countedDays: 2 } });
  });

  it("AC-LEAVE-11: схвалена заявка теж блокує, а заявка на доопрацюванні — ні", () => {
    const range = { startDate: "2026-11-04", endDate: "2026-11-06" };
    const approved = { ...pendingEarlier, recordStatuses: ["approved", "approved"] as ExistingRequest["recordStatuses"] };
    const revision = { ...pendingEarlier, recordStatuses: ["approved", "needs_revision"] as ExistingRequest["recordStatuses"] };
    expect(checkCalendar(range, { blockedDays, existing: [approved] })).toEqual({ ok: false, error: "OVERLAPPING_REQUEST" });
    expect(checkCalendar(range, { blockedDays, existing: [revision] }).ok).toBe(true);
  });

  it("повторне подання не перетинається саме з собою; суміжні діапазони не перетинаються", () => {
    expect(
      checkCalendar(
        { startDate: "2026-11-03", endDate: "2026-11-06" },
        { blockedDays, existing: [pendingEarlier], excludeRequestId: "req-1" },
      ).ok,
    ).toBe(true);
    expect(rangesOverlap({ startDate: "2026-11-05", endDate: "2026-11-06" }, pendingEarlier)).toBe(false);
  });
});
