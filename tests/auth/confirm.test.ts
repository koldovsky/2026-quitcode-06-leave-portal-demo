// /auth/confirm і новий пароль: що приймаємо з посилання і куди ведемо.
import { describe, expect, it, vi } from "vitest";
import { LINK_ERROR_PATH, confirmTarget } from "@/lib/auth/confirm";
import { safeNextPath } from "@/lib/auth/next-path";
import { validatePassword } from "@/lib/auth/password";

const params = (query: string) => new URLSearchParams(query);
const TOKEN = "b".repeat(56);

describe("Активація за посиланням", () => {
  it("AC-USERS-02: дійсне посилання запрошення → перевірка token_hash → сторінка нового пароля", async () => {
    const verify = vi.fn(async () => true);
    const target = await confirmTarget(params(`token_hash=${TOKEN}&type=invite&next=/account/password`), verify);
    expect(target).toBe("/account/password");
    expect(verify).toHaveBeenCalledWith("invite", TOKEN);
  });

  it("AC-USERS-02: пароль — щонайменше 8 символів і двічі однаково", () => {
    expect(validatePassword("short7!", "short7!")).toBe("PASSWORD_TOO_SHORT");
    expect(validatePassword("long-enough-1", "long-enough-2")).toBe("PASSWORD_MISMATCH");
    expect(validatePassword("x".repeat(73), "x".repeat(73))).toBe("PASSWORD_TOO_LONG");
    expect(validatePassword("long-enough-1", "long-enough-1")).toBeNull();
  });

  it("AC-USERS-02: next — лише відносний шлях цього сайту (захист від open redirect)", () => {
    expect(safeNextPath("/account/password")).toBe("/account/password");
    expect(safeNextPath("/requests?done=1#top")).toBe("/requests?done=1#top");
    for (const evil of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example", "evil.example", "", null, undefined]) {
      expect(safeNextPath(evil)).toBe("/");
    }
  });

  it("AC-USERS-05: використане чи застаріле посилання (verifyOtp відмовив) → вхід з повідомленням про посилання", async () => {
    const verify = vi.fn(async () => false);
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=invite&next=/account/password`), verify)).toBe(LINK_ERROR_PATH);
    expect(LINK_ERROR_PATH).toBe("/login?error=link");
  });

  it("AC-USERS-05: пошкоджене посилання (без token_hash або з чужим type) — навіть не перевіряємо", async () => {
    const verify = vi.fn(async () => true);
    expect(await confirmTarget(params("type=invite&next=/"), verify)).toBe(LINK_ERROR_PATH);
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=signup`), verify)).toBe(LINK_ERROR_PATH);
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=email_change`), verify)).toBe(LINK_ERROR_PATH);
    expect(verify).not.toHaveBeenCalled();
  });

  it("підробний next у дійсному посиланні не веде на чужий сайт", async () => {
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=invite&next=//evil.example`), async () => true)).toBe("/");
  });
});
