// Ролі користувачів і доступ до керування ними (зріз add-user-invites). Чистий модуль — без Supabase і Next.js.
// Роль завжди читаємо з public.profiles (getViewer), ніколи з user_metadata: його користувач змінює сам.
import type { AppRole } from "@/lib/leave/types";

export const APP_ROLES: readonly AppRole[] = ["employee", "manager", "admin"];

export const ROLE_LABELS: Record<AppRole, string> = {
  employee: "працівник",
  manager: "менеджер",
  admin: "адміністратор",
};

export const isAppRole = (value: unknown): value is AppRole => APP_ROLES.includes(value as AppRole);

/** AC-USERS-07, AC-USERS-08: список користувачів, запрошення й зміна ролі — лише для адміністратора. */
export const canManageUsers = (role: AppRole | null | undefined): boolean => role === "admin";

export const USERS_EMPTY_MESSAGE = "Ще немає запрошених. Запросіть першого працівника.";

/** AC-USERS-12: підказка, коли в списку лише сам адміністратор (або нікого). */
export function usersEmptyState(users: readonly { id: string }[], viewerId: string): string | null {
  return users.every((u) => u.id === viewerId) ? USERS_EMPTY_MESSAGE : null;
}

export type RoleChangeError = "LAST_ADMIN" | "FORBIDDEN" | "INVALID_ROLE" | "ROLE_FAILED";

export const ROLE_CHANGE_MESSAGES: Record<RoleChangeError, string> = {
  // AC-USERS-06 — дослівно з вимоги PM.
  LAST_ADMIN: "Не можна змінити роль останнього адміністратора",
  FORBIDDEN: "Змінювати ролі може лише адміністратор.",
  INVALID_ROLE: "Оберіть роль зі списку.",
  ROLE_FAILED: "Не вдалося змінити роль. Спробуйте ще раз.",
};

/** Помилка функції бази public.admin_set_role (логіка — private.admin_set_role) → код для повідомлення (текст помилки бази користувачу не показуємо). */
export function roleChangeError(error: { message?: string; code?: string } | null): RoleChangeError | null {
  if (!error) return null;
  if (error.message?.includes("LAST_ADMIN")) return "LAST_ADMIN";
  if (error.message?.includes("FORBIDDEN") || error.code === "42501") return "FORBIDDEN";
  if (error.message?.includes("INVALID_ROLE")) return "INVALID_ROLE";
  return "ROLE_FAILED";
}
