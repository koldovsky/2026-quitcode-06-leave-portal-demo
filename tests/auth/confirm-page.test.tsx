// Сторінка /auth/confirm (GET): лише показує «Активувати акаунт» і переносить параметри посилання в приховані поля.
// Боти прев'ю в месенджерах і поштових сервісах роблять саме цей GET — він не має витрачати одноразовий токен.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn(async () => ({ error: null }));
const createClient = vi.fn(async () => ({ auth: { verifyOtp } }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { default: ConfirmPage } = await import("@/app/auth/confirm/page");

const TOKEN = "c".repeat(56);

async function openLink(query: Record<string, string>) {
  const element = await ConfirmPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(query),
  } as PageProps<"/auth/confirm">);
  return renderToStaticMarkup(element);
}

describe("Сторінка активації (GET /auth/confirm)", () => {
  beforeEach(() => {
    verifyOtp.mockClear();
    createClient.mockClear();
  });

  it("AC-USERS-02: відкрите посилання — сторінка «Активувати акаунт» з полями посилання, посилання не перевірено й не витрачено", async () => {
    const html = await openLink({ token_hash: TOKEN, type: "invite", next: "/account/password" });

    expect(html).toContain("Активувати акаунт");
    expect(html).toContain(`name="token_hash" value="${TOKEN}"`);
    expect(html).toContain('name="type" value="invite"');
    expect(html).toContain('name="next" value="/account/password"');
    expect(createClient).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("AC-USERS-05: неповне чи підроблене посилання — та сама сторінка; відмова лише після «Активувати акаунт»", async () => {
    const queries: Record<string, string>[] = [{}, { type: "invite" }, { token_hash: TOKEN, type: "signup" }, { token_hash: '"><script>x</script>' }];
    for (const query of queries) {
      const html = await openLink(query);
      expect(html).toContain("Активувати акаунт");
      // Значення з адреси React екранує: жодного «живого» тегу з параметра.
      expect(html).not.toContain("<script>x</script>");
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
