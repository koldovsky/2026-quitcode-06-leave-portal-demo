"use server";

// Server Actions сторінки /admin/users. Server Action — публічний POST-ендпойнт: її можна викликати напряму, оминаючи
// сторінку, тому кожна дія сама перевіряє, хто її викликав (getViewer → getClaims + роль з profiles).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/viewer";
import { inviteUserCore, type InviteResult } from "@/lib/users/invite";
import { generateInviteLink } from "@/lib/users/invite-link";
import { canManageUsers, isAppRole, roleChangeError } from "@/lib/users/roles";

/** Що людина ввела у форму — повертаємо лише разом із помилкою, щоб форма не очищалась (посилання — ніколи разом). */
export type InviteValues = { email: string; full_name: string; role: string; division_id: string; position_title: string };

export type InviteState =
  | { status: "idle" }
  | ({ status: "done" } & Extract<InviteResult, { ok: true }>)
  | ({ status: "done"; values: InviteValues } & Extract<InviteResult, { ok: false }>);

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Адреса сайту для посилання: Origin запиту Server Action (Next.js звіряє його з Host), запасний — Host. */
async function requestOrigin(): Promise<string> {
  // У Vitest заголовків запиту немає — фіксована адреса, як у supabase/config.toml (site_url).
  if (process.env.NODE_ENV === "test") return "http://localhost:3000";
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Шукаємо адресу через LIKE: екрануємо його спецсимволи, щоб «a_b@example.test» не збігся з «axb@example.test».
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** AC-USERS-01, AC-USERS-04, AC-USERS-14, AC-USERS-15, AC-USERS-17: запрошення посиланням для активації. */
export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  // getViewer: getClaims() (підпис JWT) + роль із public.profiles; без сесії — redirect на /login (AC-USERS-17).
  const { supabase, viewer } = await getViewer();

  const values: InviteValues = {
    email: text(formData, "email"),
    full_name: text(formData, "full_name"),
    role: text(formData, "role"),
    division_id: text(formData, "division_id"),
    position_title: text(formData, "position_title"),
  };
  const result = await inviteUserCore(
    viewer?.role ?? null,
    {
      email: values.email,
      fullName: values.full_name,
      role: values.role,
      divisionId: values.division_id,
      positionTitle: values.position_title,
    },
    await requestOrigin(),
    {
      // RLS: адміністратор бачить усі профілі (profiles_select_own_or_admin).
      emailTaken: async (email) => {
        const { data } = await supabase.from("profiles").select("id").ilike("email", escapeLike(email)).limit(1);
        return (data ?? []).length > 0;
      },
      // Секретний ключ — лише після перевірки ролі admin в inviteUserCore.
      generateInvite: (email, fullName) => generateInviteLink(email, fullName),
      // Роль — тією самою функцією бази, що й зміна ролі в списку, і клієнтом адміністратора (не admin-клієнтом).
      assignRole: async (userId, role) => {
        const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
        return !error;
      },
      assignMainPosition: async (userId, divisionId, title) => {
        // RLS: positions_insert_admin — вставляє лише адміністратор.
        const { error } = await supabase
          .from("positions")
          .insert({ employee_id: userId, division_id: divisionId, kind: "main", title });
        return !error;
      },
    },
  );

  if (!result.ok) return { status: "done", ...result, values };
  revalidatePath("/admin/users");
  // Посилання — лише у відповіді цієї дії (не в URL і не в логах): це живий credential (ADR 0003).
  return { status: "done", ...result };
}

/**
 * AC-USERS-03, AC-USERS-06, AC-USERS-08, AC-USERS-09: зміна ролі зі списку користувачів.
 * Не admin-клієнтом: rpc від імені адміністратора, тож перевірку «лише admin» і «не останнього admin» робить база
 * (public.admin_set_role → private.admin_set_role) — і для цієї дії, і для прямого запиту з публічним ключем.
 */
export async function changeRole(formData: FormData) {
  const { supabase, viewer } = await getViewer();
  // Не адміністратор — нічого не змінюємо й нічого не показуємо (AC-USERS-08).
  if (!canManageUsers(viewer?.role)) redirect("/");

  const userId = text(formData, "user_id");
  const role = text(formData, "role");
  if (!userId || !isAppRole(role)) redirect("/admin/users?error=INVALID_ROLE");

  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  const code = roleChangeError(error);
  if (code) redirect(`/admin/users?error=${code}`);

  revalidatePath("/admin/users");
  redirect("/admin/users?done=role");
}
