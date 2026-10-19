import { describe, expect, it } from "vitest";
import { USERS_EMPTY_MESSAGE, canManageUsers, usersEmptyState } from "@/lib/users/roles";

describe("Доступ до сторінки користувачів", () => {
  // Сторінка /admin/users — requireRole("admin"), навігація — той самий список ролей.
  it("AC-USERS-07: список користувачів відкривається лише адміністратору — працівнику й менеджеру ні", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("employee")).toBe(false);
    expect(canManageUsers("manager")).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });
});

describe("Стан сторінки користувачів", () => {
  it("AC-USERS-12: адміністратор — поки що єдиний користувач → «Ще немає запрошених. Запросіть першого працівника.»", () => {
    expect(USERS_EMPTY_MESSAGE).toBe("Ще немає запрошених. Запросіть першого працівника.");
    expect(usersEmptyState([{ id: "admin-1" }], "admin-1")).toBe(USERS_EMPTY_MESSAGE);
    expect(usersEmptyState([{ id: "admin-1" }, { id: "teacher-1" }], "admin-1")).toBeNull();
  });
});
