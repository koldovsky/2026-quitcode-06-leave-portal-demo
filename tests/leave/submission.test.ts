import { describe, expect, it } from "vitest";
import { isIsoDate } from "@/lib/leave/dates";
import { validateSubmission } from "@/lib/leave/submission";
import { singlePosition, twoPositions } from "./fixtures";

describe("Подання заявки", () => {
  it("AC-LEAVE-01: заявка на одну посаду — один запис main зі статусом pending", () => {
    const result = validateSubmission(
      { leaveType: "sick", startDate: "2026-11-03", endDate: "2026-11-04", positionIds: ["pos-single-main"] },
      singlePosition,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        leaveType: "sick",
        startDate: "2026-11-03",
        endDate: "2026-11-04",
        records: [{ positionId: "pos-single-main", kind: "main", divisionId: "div-primary", status: "pending" }],
      },
    });
  });

  it("AC-LEAVE-02: працівник позначив обидві посади — одна заявка з двома записами main і additional", () => {
    const result = validateSubmission(
      {
        leaveType: "vacation",
        startDate: "2026-11-10",
        endDate: "2026-11-11",
        positionIds: ["pos-additional", "pos-main"],
      },
      twoPositions,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records.map((r) => [r.kind, r.status])).toEqual([
      ["main", "pending"],
      ["additional", "pending"],
    ]);
  });

  it("AC-LEAVE-02: позначено лише основну посаду — один запис, хоча посад дві", () => {
    const result = validateSubmission(
      { leaveType: "vacation", startDate: "2026-11-10", endDate: "2026-11-11", positionIds: ["pos-main"] },
      twoPositions,
    );
    expect(result.ok && result.value.records.map((r) => r.kind)).toEqual(["main"]);
  });

  it("AC-LEAVE-03: дата кінця раніша за дату початку — INVALID_RANGE", () => {
    const result = validateSubmission(
      { leaveType: "sick", startDate: "2026-11-12", endDate: "2026-11-10", positionIds: ["pos-single-main"] },
      singlePosition,
    );
    expect(result).toEqual({ ok: false, error: "INVALID_RANGE" });
  });

  it("одноденна заявка (початок = кінець) приймається", () => {
    const result = validateSubmission(
      { leaveType: "sick", startDate: "2026-11-03", endDate: "2026-11-03", positionIds: ["pos-single-main"] },
      singlePosition,
    );
    expect(result.ok).toBe(true);
  });

  it("без позначених посад, з чужою посадою, невідомим типом чи датою — помилка", () => {
    const base = { leaveType: "sick", startDate: "2026-11-03", endDate: "2026-11-04" };
    expect(validateSubmission({ ...base, positionIds: [] }, twoPositions)).toEqual({ ok: false, error: "NO_POSITIONS" });
    expect(validateSubmission({ ...base, positionIds: ["pos-single-main"] }, twoPositions)).toEqual({
      ok: false,
      error: "UNKNOWN_POSITION",
    });
    expect(validateSubmission({ ...base, leaveType: "hours", positionIds: ["pos-main"] }, twoPositions)).toEqual({
      ok: false,
      error: "INVALID_TYPE",
    });
    expect(
      validateSubmission({ ...base, startDate: "2026-02-30", positionIds: ["pos-main"] }, twoPositions),
    ).toEqual({ ok: false, error: "INVALID_DATE" });
  });

  it("isIsoDate приймає лише справжні дати YYYY-MM-DD", () => {
    expect(isIsoDate("2026-11-03")).toBe(true);
    expect(isIsoDate("03.11.2026")).toBe(false);
    expect(isIsoDate("2026-02-29")).toBe(false);
  });
});
