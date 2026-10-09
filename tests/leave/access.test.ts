import { describe, expect, it } from "vitest";
import { canDecideRecord, type Viewer } from "@/lib/leave/access";
import { MANAGER_MATH, MANAGER_PRIMARY, MATH, PRIMARY } from "./fixtures";

const employee: Viewer = { id: "employee-a", role: "employee", managedDivisionIds: [] };
const mathManager: Viewer = { id: MANAGER_MATH, role: "manager", managedDivisionIds: [MATH] };
const primaryManager: Viewer = { id: MANAGER_PRIMARY, role: "manager", managedDivisionIds: [PRIMARY] };
const admin: Viewer = { id: "admin", role: "admin", managedDivisionIds: [] };

const ownMath = { employeeId: "employee-a", divisionId: MATH };
const otherPrimary = { employeeId: "employee-b", divisionId: PRIMARY };

// Лише показ кнопок рішення на сторінках. Видимість і черги (AC-LEAVE-05, AC-LEAVE-09) виконує RLS —
// їх перевіряє tests/db/leave-db.test.ts, тому AC ID тут у назвах немає.
describe("Кнопки рішення", () => {
  it("рішення ухвалює лише менеджер підрозділу запису", () => {
    expect(canDecideRecord(primaryManager, otherPrimary)).toBe(true);
    expect(canDecideRecord(mathManager, ownMath)).toBe(true);
    expect(canDecideRecord(mathManager, otherPrimary)).toBe(false);
  });

  it("ні адміністратор, ні працівник не ухвалюють рішень", () => {
    expect(canDecideRecord(admin, otherPrimary)).toBe(false);
    expect(canDecideRecord(employee, ownMath)).toBe(false);
  });
});
