import { describe, expect, it } from "vitest";
import { decide, requestStatus, resubmit } from "@/lib/leave/decisions";

// Хто і коли ухвалив рішення (AC-LEAVE-06) ставить тригер у базі — tests/db/leave-db.test.ts.
describe("Рішення менеджера", () => {
  it("схвалення запису pending — approved без коментаря", () => {
    expect(decide({ status: "pending" }, "approve")).toEqual({
      ok: true,
      value: { status: "approved", comment: null },
    });
  });

  it("AC-LEAVE-06: заявка схвалена, коли схвалено всі її записи", () => {
    expect(requestStatus(["approved", "approved"])).toBe("approved");
    expect(requestStatus(["approved", "pending"])).toBe("pending");
  });

  it("AC-LEAVE-07: повернення без коментаря або з пробілами — COMMENT_REQUIRED", () => {
    for (const comment of [undefined, null, "", "   "]) {
      expect(decide({ status: "pending" }, "return", { comment })).toEqual({
        ok: false,
        error: "COMMENT_REQUIRED",
      });
    }
  });

  it("AC-LEAVE-07: повернення з коментарем «Уточніть дату кінця» — needs_revision з коментарем", () => {
    const result = decide({ status: "pending" }, "return", {
      comment: "  Уточніть дату кінця ",
    });
    expect(result).toEqual({
      ok: true,
      value: { status: "needs_revision", comment: "Уточніть дату кінця" },
    });
    expect(requestStatus(["approved", "needs_revision"])).toBe("needs_revision");
  });

  it("рішення щодо вже вирішеного запису — NOT_PENDING", () => {
    expect(decide({ status: "approved" }, "return", { comment: "x" })).toEqual({
      ok: false,
      error: "NOT_PENDING",
    });
  });

  it("AC-LEAVE-08: виправлена заявка needs_revision з датою кінця 05.11.2026 — знову pending", () => {
    const result = resubmit(
      { recordStatuses: ["needs_revision"] },
      { leaveType: "sick", startDate: "2026-11-03", endDate: "2026-11-05" },
    );
    expect(result).toEqual({
      ok: true,
      value: {
        leaveType: "sick",
        startDate: "2026-11-03",
        endDate: "2026-11-05",
        substituteNote: null,
        recordStatus: "pending",
      },
    });
  });

  it("AC-LEAVE-08: виправити можна лише заявку на доопрацюванні, і дати перевіряються знову", () => {
    const input = { leaveType: "sick", startDate: "2026-11-03", endDate: "2026-11-05" };
    expect(resubmit({ recordStatuses: ["pending"] }, input)).toEqual({ ok: false, error: "NOT_NEEDS_REVISION" });
    expect(resubmit({ recordStatuses: ["needs_revision"] }, { ...input, endDate: "2026-11-01" })).toEqual({
      ok: false,
      error: "INVALID_RANGE",
    });
  });
});
