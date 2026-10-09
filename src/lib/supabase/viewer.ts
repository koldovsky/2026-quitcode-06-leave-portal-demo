// Хто відкрив сторінку: id з JWT (getClaims), роль з profiles, підрозділи, де він менеджер.
// Лише для серверу (Server Components і Server Actions).
import { redirect } from "next/navigation";
import type { Viewer } from "@/lib/leave/access";
import type { AppRole } from "@/lib/leave/types";
import { createClient } from "./server";

const ROLES: readonly AppRole[] = ["employee", "manager", "admin"];
const isRole = (value: unknown): value is AppRole => ROLES.includes(value as AppRole);

export async function getViewer() {
  const supabase = await createClient();

  // getClaims() перевіряє підпис JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // RLS: користувач бачить власний профіль.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  let managedDivisionIds: string[] = [];
  if (profile?.role === "manager") {
    const { data: divisions } = await supabase.from("divisions").select("id").eq("manager_id", claims.sub);
    managedDivisionIds = (divisions ?? []).map((d) => d.id);
  }

  const viewer: Viewer | null = isRole(profile?.role)
    ? { id: claims.sub, role: profile.role, managedDivisionIds }
    : null;

  return { supabase, viewer, profile, email: profile?.email ?? claims.email ?? null };
}

/** Для сторінок і дій, доступних лише певним ролям: інакше — на головну. */
export async function requireRole(...roles: AppRole[]) {
  const result = await getViewer();
  if (!result.viewer || !roles.includes(result.viewer.role)) redirect("/");
  return { ...result, viewer: result.viewer };
}
