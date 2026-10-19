"use server";

// Server Actions сторінки /admin/users. Server Action — публічний POST-ендпойнт: її можна викликати напряму, оминаючи
// сторінку, тому кожна дія сама перевіряє, хто її викликав (getViewer → getClaims + роль з profiles).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/supabase/viewer";
import { inviteUserCore, type InviteResult } from "@/lib/users/invite";

export type InviteState = { status: "idle" } | ({ status: "done" } & InviteResult);

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Адреса сайту для посилання: Origin запиту Server Action (Next.js звіряє його з Host), запасний — Host. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Шукаємо адресу через LIKE: екрануємо його спецсимволи, щоб «a_b@example.test» не збігся з «axb@example.test».
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** AC-USERS-01, AC-USERS-04, AC-USERS-08: запрошення посиланням для активації. */
export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  // getViewer: getClaims() (підпис JWT) + роль із public.profiles; без сесії — redirect на /login (AC-USERS-10).
  const { supabase, viewer } = await getViewer();

  const result = await inviteUserCore(
    viewer?.role ?? null,
    {
      email: text(formData, "email"),
      fullName: text(formData, "full_name"),
      role: text(formData, "role"),
      divisionId: text(formData, "division_id"),
      positionTitle: text(formData, "position_title"),
    },
    await requestOrigin(),
    {
      // RLS: адміністратор бачить усі профілі (profiles_select_own_or_admin).
      emailTaken: async (email) => {
        const { data } = await supabase.from("profiles").select("id").ilike("email", escapeLike(email)).limit(1);
        return (data ?? []).length > 0;
      },
      // Секретний ключ — лише тут і лише після перевірки ролі admin в inviteUserCore.
      generateInvite: async (email, fullName) => {
        const admin = createAdminClient();
        const { data, error } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          // Ім'я — у user_metadata (тригер копіює в profiles.full_name). Роль — НІКОЛИ не звідси.
          options: fullName ? { data: { full_name: fullName } } : undefined,
        });
        if (error || !data.user || !data.properties?.hashed_token) {
          return { ok: false, error: error?.code === "email_exists" ? "EMAIL_EXISTS" : "LINK_FAILED" };
        }
        return { ok: true, userId: data.user.id, tokenHash: data.properties.hashed_token };
      },
      // Роль, відмінна від employee, — у PR «Реалізація: ролі» (RPC admin_set_role); у цьому PR форма її не надсилає.
      assignRole: async () => false,
      assignMainPosition: async (userId, divisionId, title) => {
        // RLS: positions_insert_admin — вставляє лише адміністратор.
        const { error } = await supabase
          .from("positions")
          .insert({ employee_id: userId, division_id: divisionId, kind: "main", title });
        return !error;
      },
    },
  );

  if (result.ok) revalidatePath("/admin/users");
  // Посилання — лише у відповіді цієї дії (не в URL і не в логах): це живий credential (ADR 0003).
  return { status: "done", ...result };
}
