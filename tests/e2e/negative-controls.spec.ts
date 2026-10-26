// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування. Не AC-тести: назви починаються з NC-, а не з AC ID,
// тож ac:coverage їх не рахує. У звичайному прогоні їх немає (проєкт chromium має grepInvert @negative-control);
// запуск: npm run uat:nc (UAT_NEGATIVE_CONTROLS=1 → проєкт negative-controls). Лише читання: безпечно на проді.
// Що мають показати:
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL, хоч би що сказав агент;
//   NC-2 — PM уточнив текст «Тоді», а тест і застосунок ні → перевірки зелені, агент звіряє кадр із НОВИМ текстом PM
//          і не погоджується → NEEDS-HUMAN (розбіжність іде до людини).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/teacher.json" });

const CLAUSE =
  "він потрапляє на головну сторінку й бачить повідомлення «Список користувачів бачить лише адміністратор.», а жодного email, ролі чи посади інших користувачів не бачить";
const WRONG_MESSAGE = "Список користувачів доступний лише адміністраторам.";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-USERS-07, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-USERS-07" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given("працівник teacher@example.test увійшов у портал", async () => {
      await page.goto("/");
    });
    await when("він відкриває сторінку списку користувачів за її адресою", async () => {
      await page.goto("/admin/users");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["повідомлення «Список користувачів бачить лише адміністратор.»"] },
      async () => {
        await expect(page.getByRole("status")).toHaveText(WRONG_MESSAGE, { timeout: 5_000 });
      },
    );
  },
);

test(
  "NC-2 (AC-USERS-07, PM уточнив текст «Тоді», тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-USERS-07" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description:
          "AC-USERS-07: Дано працівник teacher@example.test увійшов у портал. Коли він відкриває сторінку списку користувачів за її адресою. Тоді він потрапляє на головну сторінку й бачить повідомлення «Список користувачів доступний лише адміністраторам.», а жодного email, ролі чи посади інших користувачів не бачить.",
      },
    ],
  },
  async ({ page }) => {
    await given("працівник teacher@example.test увійшов у портал", async () => {
      await page.goto("/");
    });
    await when("він відкриває сторінку списку користувачів за її адресою", async () => {
      await page.goto("/admin/users");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["повідомлення «Список користувачів бачить лише адміністратор.»"] },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === "/");
        await expect(page.getByRole("status")).toHaveText("Список користувачів бачить лише адміністратор.");
      },
    );
  },
);
