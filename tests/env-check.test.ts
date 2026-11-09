// WS11, дія, яку пропонує postmortem навчального сценарію «хибна NEXT_PUBLIC_SUPABASE_URL на staging»
// (docs/demo/RUNBOOK-ws11.md): /api/health називає змінну, якої бракує чи яка хибна, — лише назву, ніколи значення.
// Тест відтворює стан сценарію без staging: та сама хибна змінна (адреса дашборда Supabase замість Project URL).
// «Стан дрілу» в назвах тестів — стан цього сценарію.
// Значення нижче вигадані: ref з 20 літер, ключі — не справжні.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkRequiredEnv, envReason } from "@/lib/env-check";

const h = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: h.createClient }));

const { GET } = await import("@/app/api/health/route");
const { updateSession } = await import("@/lib/supabase/proxy");

const REF = "abcdefghijklmnopqrst";
const PROJECT_URL = `https://${REF}.supabase.co`;
const DASHBOARD_URL = `https://supabase.com/dashboard/project/${REF}`; // хибне значення зі сценарію
const PUBLISHABLE = "sb_publishable_test-only-not-a-real-key";

describe("checkRequiredEnv / envReason", () => {
  it("правильні адреса проєкту й публічний ключ — проблем немає (і локальний Supabase по http теж)", () => {
    const ok = checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: PROJECT_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
    expect(ok).toEqual({ missing: [], invalid: [] });
    expect(envReason(ok)).toBe("");
    const local = checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
    expect(local.invalid).toEqual([]);
  });

  it("адреса дашборда замість Project URL — хибна (стан дрілу)", () => {
    const check = checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: DASHBOARD_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
    expect(envReason(check)).toBe("env-invalid:NEXT_PUBLIC_SUPABASE_URL");
  });

  it("інші хибні формати: не URL, http не локально, шлях чи параметри, секретний ключ у публічній змінній", () => {
    const urls = [`${REF}.supabase.co`, `http://${REF}.supabase.co`, `${PROJECT_URL}/rest/v1`, `${PROJECT_URL}?x=1`];
    for (const url of urls) {
      expect(checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE }).invalid).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
      ]);
    }
    const secret = checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: PROJECT_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test-only" });
    expect(envReason(secret)).toBe("env-invalid:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("відсутні чи порожні змінні — env-missing з усіма назвами", () => {
    expect(envReason(checkRequiredEnv({}))).toBe("env-missing:NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(envReason(checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: "  ", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE }))).toBe(
      "env-missing:NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});

describe("GET /api/health зі зламаними змінними", () => {
  beforeEach(() => h.createClient.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("стан дрілу: 503, reason називає змінну, значення у відповіді немає, до бази не звертаємось", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", DASHBOARD_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE);
    vi.stubEnv("APP_ENV", "staging");

    const response = await GET();
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toMatchObject({
      ok: false,
      appEnv: "staging",
      db: "down",
      reason: "env-invalid:NEXT_PUBLIC_SUPABASE_URL",
    });
    expect(text).not.toContain(REF);
    expect(text).not.toContain("supabase.com");
    expect(text).not.toContain(PUBLISHABLE);
    expect(h.createClient).not.toHaveBeenCalled();
  });

  it("змінної немає: 503 env-missing, без винятку", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: "env-missing:NEXT_PUBLIC_SUPABASE_URL" });
  });

  it("змінні правильні — контракт D0 той самий: запит до бази і db ok", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE);
    h.createClient.mockReturnValue({
      from: () => ({ select: () => ({ limit: async () => ({ error: null, status: 200 }) }) }),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, db: "ok", reason: "" });
    expect(h.createClient).toHaveBeenCalledWith(PROJECT_URL, PUBLISHABLE, expect.anything());
  });
});

describe("proxy і /api/health", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("без змінних Supabase proxy пропускає /api/health, а не падає раніше, ніж health назве змінну", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await updateSession(new NextRequest("http://localhost:3000/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
