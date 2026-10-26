import { describe, expect, it } from "vitest";
import {
  HOME_NOTICES,
  ROLE_CHANGE_MESSAGES,
  USERS_ADMIN_ONLY_MESSAGE,
  USERS_EMPTY_MESSAGE,
  canManageUsers,
  roleChangeError,
  usersEmptyState,
  usersPageRedirect,
} from "@/lib/users/roles";

describe("Доступ до сторінки користувачів", () => {
  // Сторінка /admin/users — usersPageRedirect(роль) → головна з notice=admin-only; головна показує HOME_NOTICES[notice].
  const homeMessageFor = (path: string) => HOME_NOTICES[new URL(path, "http://portal.invalid").searchParams.get("notice") ?? ""];

  it("AC-USERS-07: працівник на сторінці користувачів → головна з «Список користувачів бачить лише адміністратор.»", () => {
    expect(USERS_ADMIN_ONLY_MESSAGE).toBe("Список користувачів бачить лише адміністратор.");
    expect(canManageUsers("employee")).toBe(false);
    const away = usersPageRedirect("employee");
    expect(away).toBe("/?notice=admin-only");
    expect(new URL(away!, "http://portal.invalid").pathname).toBe("/");
    expect(homeMessageFor(away!)).toBe(USERS_ADMIN_ONLY_MESSAGE);
  });

  it("AC-USERS-13: менеджер на сторінці користувачів → головна з «Список користувачів бачить лише адміністратор.»", () => {
    expect(canManageUsers("manager")).toBe(false);
    const away = usersPageRedirect("manager");
    expect(away).toBe("/?notice=admin-only");
    expect(homeMessageFor(away!)).toBe(USERS_ADMIN_ONLY_MESSAGE);
  });

  it("адміністратор бачить сторінку; профіль без ролі — теж на головну", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(usersPageRedirect("admin")).toBeNull();
    expect(usersPageRedirect(null)).toBe("/?notice=admin-only");
    // Невідомий notice з адреси не показуємо.
    expect(Object.hasOwn(HOME_NOTICES, "<b>x</b>")).toBe(false);
  });
});

describe("Стан сторінки користувачів", () => {
  it("AC-USERS-12: адміністратор — поки що єдиний користувач → «Ще немає запрошених. Запросіть першого працівника.»", () => {
    expect(USERS_EMPTY_MESSAGE).toBe("Ще немає запрошених. Запросіть першого працівника.");
    expect(usersEmptyState([{ id: "admin-1" }], "admin-1")).toBe(USERS_EMPTY_MESSAGE);
    expect(usersEmptyState([{ id: "admin-1" }, { id: "teacher-1" }], "admin-1")).toBeNull();
  });
});

// Зіставлення «помилка бази → повідомлення» на вручну зібраних об'єктах помилки. AC ID у назвах тут навмисно немає:
// такий тест лишається зеленим, навіть якщо правило в базі зникне. AC-USERS-06 і AC-USERS-09 доводять тести на
// справжньому Postgres (tests/db/users-db.test.ts) — їх і рахує ac:coverage.
describe("Зміна ролі: повідомлення", () => {
  it("відмова бази LAST_ADMIN → «Не можна змінити роль останнього адміністратора» (текст із вимоги PM)", () => {
    const code = roleChangeError({ code: "23514", message: "LAST_ADMIN" });
    expect(code).toBe("LAST_ADMIN");
    expect(ROLE_CHANGE_MESSAGES[code!]).toBe("Не можна змінити роль останнього адміністратора");
  });

  it("відмова бази FORBIDDEN або 42501 — не технічний текст, а зрозуміле повідомлення", () => {
    expect(roleChangeError({ code: "42501", message: "FORBIDDEN" })).toBe("FORBIDDEN");
    // Кожна ознака окремо: текст FORBIDDEN без коду і код 42501 без цього тексту (відмова grant, «permission denied»).
    expect(roleChangeError({ code: "P0001", message: "FORBIDDEN" })).toBe("FORBIDDEN");
    expect(roleChangeError({ code: "42501", message: "permission denied for function admin_set_role" })).toBe("FORBIDDEN");
    expect(roleChangeError({ code: "XX000", message: "щось інше" })).toBe("ROLE_FAILED");
    expect(roleChangeError(null)).toBeNull();
  });
});
