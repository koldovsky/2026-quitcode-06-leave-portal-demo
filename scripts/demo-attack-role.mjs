#!/usr/bin/env node
// Демо WS7 «атака з публічним ключем» (план Б для консолі браузера, docs/demo/RUNBOOK-ws7.md, демо 3).
// Входить як синтетичний працівник із ПУБЛІЧНИМ ключем — так само, як будь-хто з ключем із JS-бандла, — і пробує
// підвищити собі роль двома шляхами. Очікувано: обидва відхиляє база (GRANT на колонки і функція admin_set_role).
// Запуск: node --env-file=.env.local scripts/demo-attack-role.mjs [email]   (за замовчуванням teacher@example.test)
// Секретний ключ НЕ потрібен; пароль (DEMO_USER_PASSWORD) і токени не друкуються. Наприкінці — вихід лише з ЦІЄЇ
// сесії (scope: "local"): сесія того самого користувача у вікні браузера (демо 3, вікно 3) лишається.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "teacher@example.test";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;
if (!url || !publishable || !password) {
  console.error("Потрібні NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY і DEMO_USER_PASSWORD (.env.local).");
  process.exit(2);
}
if (!email.endsWith("@example.test")) {
  console.error("Лише синтетичні користувачі *@example.test.");
  process.exit(2);
}

const supabase = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: session, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) {
  console.error(`Вхід не вдався: ${loginError.code ?? loginError.message}`);
  process.exit(1);
}
const me = session.user.id;
const roleNow = async () =>
  (await supabase.from("profiles").select("role").eq("id", me).maybeSingle()).data?.role ?? "—";

console.log(`Увійшли як ${email} (публічний ключ). Роль зараз: ${await roleNow()}`);

const visible = await supabase.from("profiles").select("email", { count: "exact", head: true });
console.log(`1) select profiles: видно профілів — ${visible.count ?? 0} (RLS: лише свій)`);

const direct = await supabase.from("profiles").update({ role: "admin" }).eq("id", me).select("role");
console.log(
  `2) update profiles set role = 'admin': ${direct.error ? `ВІДМОВА HTTP ${direct.status} ${direct.error.code} ${direct.error.message}` : `пройшло?! ${JSON.stringify(direct.data)}`}`,
);

const rpc = await supabase.rpc("admin_set_role", { p_user: me, p_role: "admin" });
const rpcText = !rpc.error
  ? "пройшло?!"
  : rpc.error.code === "PGRST202"
    ? `функції ще немає в базі (HTTP ${rpc.status} PGRST202) — міграції 20261020000000 і 20261020000100 не застосовано`
    : `ВІДМОВА HTTP ${rpc.status} ${rpc.error.code} ${rpc.error.message}`;
console.log(`3) rpc admin_set_role(себе, 'admin'): ${rpcText}`);

console.log(`Роль після спроб: ${await roleNow()}`);
await supabase.auth.signOut({ scope: "local" });
