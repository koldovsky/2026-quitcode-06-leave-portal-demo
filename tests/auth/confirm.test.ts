// /auth/confirm і новий пароль: що приймаємо з посилання і куди ведемо.
import { describe, expect, it, vi } from "vitest";
import { LINK_ERROR_PATH, confirmTarget } from "@/lib/auth/confirm";
import { safeNextPath } from "@/lib/auth/next-path";
import { validatePassword } from "@/lib/auth/password";

const params = (query: string) => new URLSearchParams(query);
const TOKEN = "b".repeat(56);

// Так next приходить з адреси посилання: URLSearchParams декодує %09 у таб, %0a — у перенесення рядка, %2F — у «/».
const fromLink = (raw: string) => new URLSearchParams(`next=${raw}`).get("next");

/** Підробні next: інший сайт, «\», керівні символи й пробіли, а також «/./» і «/../», які розбір URL зводить до «//». */
const EVIL_NEXT: unknown[] = [
  "//evil.example",
  "/\\evil.example",
  "https://evil.example",
  "javascript:alert(1)",
  "evil.example",
  "/\t/evil.example",
  fromLink("/%09/evil.example"),
  fromLink("/%0a/evil.example"),
  fromLink("/%0D/evil.example"),
  fromLink("/%7F/evil.example"),
  "/.//evil.example",
  fromLink("%2F.%2F%2Fevil.example"),
  "/%2e//evil.example",
  "/%2E%2E//evil.example",
  "/a/..//evil.example",
  "/x/%2e%2e//evil.example",
  "/./\\evil.example",
  " /evil.example",
  "",
  null,
  undefined,
  42,
];

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
    // «/a/../b» — звичайний відносний шлях: після нормалізації лишається на сайті.
    expect(safeNextPath("/a/../account/password")).toBe("/account/password");
    for (const evil of EVIL_NEXT) {
      expect(safeNextPath(evil), JSON.stringify(evil)).toBe("/");
    }
  });

  it("AC-USERS-02: що б не прийшло в next, результат лишається на цьому сайті", () => {
    const ORIGIN = "https://portal.example.test";
    for (const next of [...EVIL_NEXT, "/%2509/evil.example", "/#//evil.example", "/a/../b", "/звіт?x=1"]) {
      const path = safeNextPath(next);
      expect(path.startsWith("/"), JSON.stringify(next)).toBe(true);
      expect(path.startsWith("//") || path.startsWith("/\\"), JSON.stringify(next)).toBe(false);
      expect(new URL(path, ORIGIN).origin, JSON.stringify(next)).toBe(ORIGIN);
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
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=invite&next=/.//evil.example`), async () => true)).toBe("/");
    expect(await confirmTarget(params(`token_hash=${TOKEN}&type=invite&next=%2F%09%2Fevil.example`), async () => true)).toBe("/");
  });
});
