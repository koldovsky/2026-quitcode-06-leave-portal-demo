// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { describe, expect, it } from "vitest";
import { appEnvLabel, buildInfo, classifyDbProbe } from "@/lib/health";

describe("appEnvLabel (/api/health, WS11)", () => {
  it("показує коротку мітку змінної гілки staging і null, де змінної немає", () => {
    expect(appEnvLabel("staging")).toBe("staging");
    expect(appEnvLabel(" staging ")).toBe("staging");
    expect(appEnvLabel(undefined)).toBeNull();
    expect(appEnvLabel("")).toBeNull();
  });

  it("не віддає довільний текст: значення не за форматом мітки — null", () => {
    expect(appEnvLabel("https://example.test/?token=abc")).toBeNull();
    expect(appEnvLabel("Staging Env")).toBeNull();
    expect(appEnvLabel("x".repeat(40))).toBeNull();
  });

  it("buildInfo: коміт, середовище Vercel і мітка staging; локально — local і null", () => {
    expect(buildInfo({ VERCEL_GIT_COMMIT_SHA: "abc1234", VERCEL_ENV: "preview", APP_ENV: "staging" })).toEqual({
      sha: "abc1234",
      env: "preview",
      appEnv: "staging",
    });
    expect(buildInfo({})).toEqual({ sha: "local", env: "local", appEnv: null });
  });
});

describe("classifyDbProbe (/api/health)", () => {
  it("рахує базу живою, коли запит пройшов або Postgres відмовив у правах (42501)", () => {
    expect(classifyDbProbe({ status: 200, error: null })).toEqual({ db: "ok", reason: "" });
    expect(classifyDbProbe({ status: 401, error: { code: "42501", message: "permission denied for table profiles" } })).toEqual({
      db: "ok",
      reason: "",
    });
    expect(classifyDbProbe({ status: 400, error: { code: "PGRST100", message: "bad filter" } }).db).toBe("ok");
  });

  it("повідомляє «paused», коли Supabase відповідає 540 (безкоштовний проєкт призупинено)", () => {
    expect(classifyDbProbe({ status: 540, error: { message: "project paused" } })).toEqual({ db: "down", reason: "paused" });
  });

  it("повідомляє про хибний публічний ключ", () => {
    expect(classifyDbProbe({ status: 401, error: { message: "Invalid API key" } })).toEqual({
      db: "down",
      reason: "invalid-api-key",
    });
  });

  it("повідомляє код, коли PostgREST не дістає до бази або мережі немає", () => {
    expect(classifyDbProbe({ status: 503, error: { code: "PGRST002", message: "schema cache" } })).toEqual({
      db: "down",
      reason: "status-503-PGRST002",
    });
    expect(classifyDbProbe({ status: 0, error: { message: "fetch failed" } })).toEqual({ db: "down", reason: "status-0" });
  });
});
