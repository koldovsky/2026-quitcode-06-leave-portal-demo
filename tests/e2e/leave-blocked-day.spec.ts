// AC-LEAVE-04 — заблокований день не входить у кількість днів відсутності. Заявку подає СИНТЕТИЧНИЙ працівник
// uat-<run>-employee@example.test (@writes): чужих заявок і черг не чіпаємо, перетину з даними демо (AC-LEAVE-11) немає.
// Користувача створює beforeAll і видаляє afterAll; каскад видаляє його посаду, заявку й записи.
// Заблокований день 05.11.2026 — із сиду (supabase/seed.sql): календаря в інтерфейсі ще немає, тож «Дано»
// перевіряємо читанням бази, а не кліками адміністратора.
import { expect, test } from "@playwright/test";
import { createEmployee, deleteUatUsers, isBlockedDay, leaveRequestsOf, randomPassword, uatEmail } from "./support/admin";
import { attachRuntimeErrors, given, signIn, thenStep, when } from "./support/uat";

const employee = uatEmail("employee");
const password = randomPassword();
let employeeId = "";

test.beforeAll(async () => {
  employeeId = await createEmployee(employee, password, "MATH");
});

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.afterAll(async () => {
  await deleteUatUsers(employee);
});

test(
  "AC-LEAVE-04: заявка 04.11–06.11.2026 із заблокованим 05.11 — прийнята, днів відсутності 2",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-LEAVE-04" } },
  async ({ page }) => {
    await given("адміністратор позначив 05.11.2026 як заблокований день", async () => {
      expect(await isBlockedDay("2026-11-05"), "у календарі немає 05.11.2026 — застосуйте сид").toBe(true);
    });

    await when("працівник подає заявку типу «хвороба» на 04.11.2026–06.11.2026", async () => {
      await signIn(page, employee, password);
      await page.goto("/requests/new");
      await page.getByLabel("Тип відсутності").selectOption({ label: "хвороба" });
      await page.getByLabel("Дата початку").fill("2026-11-04");
      await page.getByLabel("Дата кінця").fill("2026-11-06");
      await page.getByRole("button", { name: "Подати заявку" }).click();
      await page.waitForURL((url) => url.pathname === "/requests");
    });

    const request = page.getByTestId("leave-request").filter({ hasText: "04.11.2026 – 06.11.2026" });

    await thenStep(
      page,
      {
        clause: "заявку прийнято зі статусом `pending`, і кількість днів відсутності — 2 (04.11.2026 і 06.11.2026)",
        visible: [
          "повідомлення «Заявку подано — вона в черзі менеджера.»",
          "у списку заявка «хвороба» 04.11.2026 – 06.11.2026 зі статусом «на розгляді» (так інтерфейс показує `pending`)",
          "кількість днів: «днів: 2 (заблоковані не рахуються: 05.11.2026)»",
        ],
        hidden: ["у базі в цієї заявки один запис зі статусом pending (саме код pending, а не підпис)"],
      },
      async () => {
        await expect(page.getByRole("status").filter({ hasText: "Заявку подано" })).toHaveText(
          "Заявку подано — вона в черзі менеджера.",
        );
        await expect(request).toHaveCount(1);
        await expect(request).toContainText("хвороба");
        await expect(request.getByText(/^днів:/)).toHaveText("днів: 2 (заблоковані не рахуються: 05.11.2026)");
        await expect(request.getByText("на розгляді").first()).toBeVisible();
        const rows = await leaveRequestsOf(employeeId);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ leave_type: "sick", start_date: "2026-11-04", end_date: "2026-11-06" });
        expect(rows[0].leave_records.map((r) => r.status)).toEqual(["pending"]);
      },
    );
  },
);
