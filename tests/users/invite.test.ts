// Запрошення: порядок «роль admin → перевірки → адреса вже є? → admin-клієнт» і посилання для активації.
import { describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/leave/types";
import { buildActivationLink, inviteUserCore, validateInvite, type InviteDeps, type RawInvite } from "@/lib/users/invite";

const ORIGIN = "https://portal.example.test";
const TOKEN = "a".repeat(56);

const raw = (over: Partial<RawInvite> = {}): RawInvite => ({
  email: "new.teacher@example.test",
  fullName: "Нова Вчителька",
  role: "",
  divisionId: "div-math",
  positionTitle: "Вчитель математики",
  ...over,
});

function fakeDeps(existing: string[] = []) {
  const deps = {
    emailTaken: vi.fn(async (email: string) => existing.includes(email)),
    generateInvite: vi.fn(async () => ({ ok: true as const, userId: "user-new", tokenHash: TOKEN })),
    assignRole: vi.fn(async () => true),
    assignMainPosition: vi.fn(async () => true),
  } satisfies InviteDeps;
  return deps;
}

describe("Запрошення користувача", () => {
  it("AC-USERS-01: адміністратор запрошує нову адресу з роллю «працівник» і основною посадою → посилання для активації", async () => {
    const deps = fakeDeps();
    const result = await inviteUserCore("admin", raw(), ORIGIN, deps);

    expect(result).toEqual({
      ok: true,
      email: "new.teacher@example.test",
      link: `${ORIGIN}/auth/confirm?token_hash=${TOKEN}&type=invite&next=%2Faccount%2Fpassword`,
      warnings: [],
    });
    expect(deps.generateInvite).toHaveBeenCalledWith("new.teacher@example.test", "Нова Вчителька");
    // «працівник» — роль за замовчуванням: окремо її не призначаємо.
    expect(deps.assignRole).not.toHaveBeenCalled();
    expect(deps.assignMainPosition).toHaveBeenCalledWith("user-new", "div-math", "Вчитель математики");
  });

  it("AC-USERS-01: посилання веде на /auth/confirm цього сайту з типом invite і next=/account/password", () => {
    const url = new URL(buildActivationLink("http://localhost:3000", TOKEN));
    expect(url.origin).toBe("http://localhost:3000");
    expect(url.pathname).toBe("/auth/confirm");
    expect(Object.fromEntries(url.searchParams)).toEqual({ token_hash: TOKEN, type: "invite", next: "/account/password" });
  });

  it("AC-USERS-04: адресу, що вже є в порталі (зокрема «Teacher@Example.test»), не запрошуємо — admin-клієнт не викликано", async () => {
    const deps = fakeDeps(["teacher@example.test"]);
    const result = await inviteUserCore("admin", raw({ email: "  Teacher@Example.test " }), ORIGIN, deps);

    expect(result).toEqual({ ok: false, error: "EMAIL_EXISTS" });
    expect(deps.emailTaken).toHaveBeenCalledWith("teacher@example.test");
    expect(deps.generateInvite).not.toHaveBeenCalled();
  });

  it("AC-USERS-04: якщо Supabase сам каже email_exists, відповідь та сама", async () => {
    const deps = fakeDeps();
    deps.generateInvite.mockResolvedValueOnce({ ok: false, error: "EMAIL_EXISTS" } as never);
    expect(await inviteUserCore("admin", raw(), ORIGIN, deps)).toEqual({ ok: false, error: "EMAIL_EXISTS" });
  });

  /** Прямий виклик дії запрошення з цією роллю: відмова до будь-якого звернення до бази чи admin-клієнта. */
  async function expectNoInvite(role: AppRole | null) {
    const deps = fakeDeps();
    const result = await inviteUserCore(role, raw({ email: "new.person@example.test" }), ORIGIN, deps);

    // Акаунта немає (generateInvite не викликано), посилання немає (відповідь — лише FORBIDDEN).
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(deps.emailTaken).not.toHaveBeenCalled();
    expect(deps.generateInvite).not.toHaveBeenCalled();
    expect(deps.assignRole).not.toHaveBeenCalled();
    expect(deps.assignMainPosition).not.toHaveBeenCalled();
  }

  it("AC-USERS-14: менеджер напряму не запрошує — ні перевірки адреси, ні admin-клієнта, ні посилання", async () => {
    await expectNoInvite("manager");
  });

  it("AC-USERS-15: працівник напряму не запрошує — ні перевірки адреси, ні admin-клієнта, ні посилання", async () => {
    await expectNoInvite("employee");
  });

  // Без входу дія inviteUser ще до inviteUserCore веде на /login (getViewer: getClaims() без сесії → redirect);
  // а якби й дійшла — роль null відхиляється так само.
  it("AC-USERS-17: без входу напряму не запросити — ні перевірки адреси, ні admin-клієнта, ні посилання", async () => {
    await expectNoInvite(null);
  });

  it("некоректна адреса, посада без назви — нічого не створено", async () => {
    const deps = fakeDeps();
    expect(await inviteUserCore("admin", raw({ email: "not-an-email" }), ORIGIN, deps)).toEqual({ ok: false, error: "INVALID_EMAIL" });
    expect(await inviteUserCore("admin", raw({ positionTitle: " " }), ORIGIN, deps)).toEqual({
      ok: false,
      error: "POSITION_TITLE_REQUIRED",
    });
    expect(deps.generateInvite).not.toHaveBeenCalled();
  });

  it("роль з форми перевіряємо: невідома — відмова; менеджер — призначаємо після створення акаунта", async () => {
    expect(validateInvite(raw({ role: "superuser" }))).toEqual({ ok: false, error: "INVALID_ROLE" });
    const deps = fakeDeps();
    const result = await inviteUserCore("admin", raw({ role: "manager", divisionId: "" }), ORIGIN, deps);
    expect(result.ok).toBe(true);
    expect(deps.assignRole).toHaveBeenCalledWith("user-new", "manager");
    expect(deps.assignMainPosition).not.toHaveBeenCalled();
  });

  it("акаунт створено, але роль чи посаду не призначено — попередження, а не тиха помилка", async () => {
    const deps = fakeDeps();
    deps.assignRole.mockResolvedValueOnce(false);
    deps.assignMainPosition.mockResolvedValueOnce(false);
    const result = await inviteUserCore("admin", raw({ role: "manager" }), ORIGIN, deps);
    expect(result).toMatchObject({ ok: true, warnings: ["ROLE_NOT_SET", "POSITION_NOT_SET"] });
  });
});
