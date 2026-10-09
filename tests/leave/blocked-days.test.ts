import { describe, expect, it } from "vitest";
import { countLeaveDays } from "@/lib/leave/blocked-days";

describe("Заблоковані дні", () => {
  it("AC-LEAVE-04: заблокований 05.11.2026 у заявці 04.11–06.11.2026 не рахується — 2 дні з 3", () => {
    expect(countLeaveDays("2026-11-04", "2026-11-06", ["2026-11-05"])).toEqual({
      total: 3,
      blocked: ["2026-11-05"],
      counted: 2,
    });
  });

  it("заблоковані дні поза діапазоном не впливають; вихідні рахуються (календарні дні)", () => {
    // 07.11.2026 — субота, 08.11.2026 — неділя
    expect(countLeaveDays("2026-11-06", "2026-11-09", ["2026-11-05", "2026-12-31"])).toEqual({
      total: 4,
      blocked: [],
      counted: 4,
    });
  });

  it("діапазон через межу місяця і перехід на зимовий час рахується в цілих днях", () => {
    expect(countLeaveDays("2026-10-24", "2026-11-02", []).total).toBe(10);
  });
});
