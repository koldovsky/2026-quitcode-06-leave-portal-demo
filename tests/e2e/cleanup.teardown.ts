// Прибирання після прогону (teardown проєкту setup): видаляє всіх uat-*@example.test, навіть залишки обірваних
// прогонів, і падає, якщо хоч один лишився. Підсумок — у test-results/uat-cleanup.json (його читає звіт UAT).
// Без SUPABASE_SECRET_KEY (прогін лише AC, що нічого не пишуть: --grep-invert @writes) прибирати нічого — тесту немає.
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as teardown } from "@playwright/test";
import { deleteUatUsers, hasAdminKey } from "./support/admin";

if (hasAdminKey()) {
  teardown("прибирання: синтетичні uat-*@example.test", async () => {
    const result = await deleteUatUsers();
    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      "test-results/uat-cleanup.json",
      JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2),
    );
    expect(result.remaining, "лишились синтетичні користувачі").toEqual([]);
    expect(result.leftoverRequests, "лишились заявки синтетичних користувачів").toBe(0);
  });
}
