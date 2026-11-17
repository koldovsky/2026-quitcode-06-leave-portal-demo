// Хто відкрив сторінку: користувач із сесії, роль з profiles, підрозділи, де він менеджер.
// Лише для серверу (Server Components і Server Actions).
import { redirect } from "next/navigation";
import type { Viewer } from "@/lib/leave/access";
import type { AppRole } from "@/lib/leave/types";
import { createClient } from "./server";

const ROLES: readonly AppRole[] = ["employee", "manager", "admin"];
const isRole = (value: unknown): value is AppRole => ROLES.includes(value as AppRole);

export async function getViewer() {
  const supabase = await createClient();

  // JWT на цьому ж запиті вже перевірив proxy (getClaims у src/lib/supabase/proxy.ts), тож тут беремо
  // користувача із сесії в cookie — без ще одного звернення до Auth на кожен рендер і кожну дію.
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) redirect("/login");

  // RLS: користувач бачить власний профіль.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  let managedDivisionIds: string[] = [];
  if (profile?.role === "manager") {
    const { data: divisions } = await supabase.from("divisions").select("id").eq("manager_id", user.id);
    managedDivisionIds = (divisions ?? []).map((d) => d.id);
  }

  const viewer: Viewer | null = isRole(profile?.role)
    ? { id: user.id, role: profile.role, managedDivisionIds }
    : null;

  return { supabase, viewer, profile, email: profile?.email ?? user.email ?? null };
}

/** Для сторінок і дій, доступних лише певним ролям: інакше — на головну. */
export async function requireRole(...roles: AppRole[]) {
  const result = await getViewer();
  if (!result.viewer || !roles.includes(result.viewer.role)) redirect("/");
  return { ...result, viewer: result.viewer };
}
