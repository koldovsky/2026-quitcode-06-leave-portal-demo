// AC-USERS-11 — у WS7 рядок «відкладено (буфер обміну — поведінка браузера: e2e-тест у WS8)».
// Пише в базу: запрошення створює акаунт uat-<run>@example.test (@writes). Після тесту його видаляє afterAll,
// а teardown «cleanup» ще раз перевіряє, що жодного uat-* не лишилось.
import { expect, test } from "@playwright/test";
import { deleteUatUsers, uatEmail } from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/admin.json" });

const invited = uatEmail();

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.afterAll(async () => {
  await deleteUatUsers(invited);
});

test(
  "AC-USERS-11: адміністратор копіює посилання для активації — воно в буфері обміну, видно «Посилання скопійовано»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-USERS-11" } },
  async ({ page, context, baseURL }) => {
    // Буфер обміну в headless Chromium: дозвіл саме для походження застосунку (https-прод або localhost).
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin });
    const link = page.getByLabel("Посилання для активації");

    await given("адміністратор щойно запросив людину й бачить посилання для активації", async () => {
      await page.goto("/admin/users");
      await page.getByRole("button", { name: "Запросити" }).click();
      const dialog = page.getByRole("dialog", { name: "Запросити користувача" });
      await dialog.getByLabel("Email").fill(invited);
      await dialog.getByLabel("Роль").selectOption("employee");
      await dialog.getByRole("button", { name: "Запросити" }).click();
      await expect(dialog.getByText(`Запрошення для ${invited} створено.`)).toBeVisible();
      await expect(link).toHaveValue(/\/auth\/confirm\?token_hash=[^&]+&type=invite/);
    });

    await when("він копіює посилання", async () => {
      await page.getByRole("button", { name: "Скопіювати посилання" }).click();
    });

    await thenStep(
      page,
      {
        clause: "посилання опиняється в буфері обміну, і адміністратор бачить повідомлення «Посилання скопійовано»",
        visible: ["повідомлення «Посилання скопійовано»"],
        hidden: ["у буфері обміну — саме те посилання, що показане в полі «Посилання для активації» (на кадрі поле замазане)"],
        mask: [link],
      },
      async () => {
        await expect(page.getByRole("status").filter({ hasText: "Посилання скопійовано" })).toHaveText(
          "Посилання скопійовано",
        );
        const shown = await link.inputValue();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
      },
    );
  },
);
