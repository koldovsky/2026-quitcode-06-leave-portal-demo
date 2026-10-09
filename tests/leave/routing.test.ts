import { describe, expect, it } from "vitest";
import { validateSubmission } from "@/lib/leave/submission";
import { managerOf, routeRecords } from "@/lib/leave/routing";
import { MANAGER_MATH, MANAGER_PRIMARY, MATH, divisions, twoPositions } from "./fixtures";

describe("Маршрутизація", () => {
  it("AC-LEAVE-05: заявка працівника підрозділу «Математика» — у черзі менеджера «Математики», не «Початкової школи»", () => {
    const queues = routeRecords([{ divisionId: MATH, id: "rec-1" }], divisions);
    expect(queues.get(MANAGER_MATH)).toEqual([{ divisionId: MATH, id: "rec-1" }]);
    expect(queues.has(MANAGER_PRIMARY)).toBe(false);
  });

  it("AC-LEAVE-05: посади у двох підрозділах — кожен запис у черзі менеджера свого підрозділу", () => {
    const submission = validateSubmission(
      { leaveType: "vacation", startDate: "2026-11-10", endDate: "2026-11-11", positionIds: ["pos-main", "pos-additional"] },
      twoPositions,
    );
    expect(submission.ok).toBe(true);
    if (!submission.ok) return;
    const queues = routeRecords(submission.value.records, divisions);
    expect(queues.get(MANAGER_MATH)?.map((r) => r.kind)).toEqual(["main"]);
    expect(queues.get(MANAGER_PRIMARY)?.map((r) => r.kind)).toEqual(["additional"]);
  });

  it("підрозділ без менеджера — запис без черги (null)", () => {
    expect(managerOf({ divisionId: "div-unknown" }, divisions)).toBeNull();
  });
});
