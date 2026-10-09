import { describe, expect, it } from "vitest";
import { canDecideRecord, canViewRecord, type Viewer } from "@/lib/leave/access";
import { MANAGER_MATH, MANAGER_PRIMARY, MATH, PRIMARY } from "./fixtures";

const employee: Viewer = { id: "employee-a", role: "employee", managedDivisionIds: [] };
const mathManager: Viewer = { id: MANAGER_MATH, role: "manager", managedDivisionIds: [MATH] };
const primaryManager: Viewer = { id: MANAGER_PRIMARY, role: "manager", managedDivisionIds: [PRIMARY] };
const admin: Viewer = { id: "admin", role: "admin", managedDivisionIds: [] };

const ownMath = { employeeId: "employee-a", divisionId: MATH };
const otherPrimary = { employeeId: "employee-b", divisionId: PRIMARY };

// Те саме правило в базі — політики RLS (supabase/migrations/20261013000000_leave_requests.sql);
// їх перевіряємо вручну двома користувачами на репетиції (docs/demo/RUNBOOK.md).
describe("Доступ", () => {
  it("AC-LEAVE-09: працівник бачить лише власні заявки", () => {
    expect(canViewRecord(employee, ownMath)).toBe(true);
    expect(canViewRecord(employee, otherPrimary)).toBe(false);
  });

  it("AC-LEAVE-09: менеджер «Математики» бачить лише свою чергу, а не чергу «Початкової школи»", () => {
    expect(canViewRecord(mathManager, ownMath)).toBe(true);
    expect(canViewRecord(mathManager, otherPrimary)).toBe(false);
    expect(canViewRecord(primaryManager, otherPrimary)).toBe(true);
  });

  it("адміністратор бачить усе, але рішення ухвалює лише менеджер підрозділу запису", () => {
    expect(canViewRecord(admin, otherPrimary)).toBe(true);
    expect(canDecideRecord(admin, otherPrimary)).toBe(false);
    expect(canDecideRecord(primaryManager, otherPrimary)).toBe(true);
    expect(canDecideRecord(mathManager, otherPrimary)).toBe(false);
  });
});
