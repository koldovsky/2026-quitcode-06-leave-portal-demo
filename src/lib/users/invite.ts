// Запрошення користувача (зріз add-user-invites) без Next.js і Supabase: перевірки й порядок кроків.
// Server Action src/app/admin/users/actions.ts передає сюди залежності (deps) — так порядок «спершу роль admin,
// потім admin-клієнт» перевіряють юніт-тести (tests/users/invite.test.ts).
import type { AppRole } from "@/lib/leave/types";
import { canManageUsers, isAppRole } from "./roles";

export interface RawInvite {
  email: string;
  fullName: string;
  role: string;
  divisionId: string;
  positionTitle: string;
}

export interface InviteInput {
  email: string;
  fullName: string | null;
  role: AppRole;
  position: { divisionId: string; title: string } | null;
}

export type InviteError =
  | "FORBIDDEN" // AC-USERS-08: не адміністратор
  | "INVALID_EMAIL"
  | "INVALID_ROLE"
  | "POSITION_TITLE_REQUIRED"
  | "EMAIL_EXISTS" // AC-USERS-04
  | "LINK_FAILED";

/** Що не вдалося після створення акаунта (акаунт уже є — адміністратор виправляє в списку). */
export type InviteWarning = "ROLE_NOT_SET" | "POSITION_NOT_SET";

export type InviteResult =
  | { ok: true; email: string; link: string; warnings: InviteWarning[] }
  | { ok: false; error: InviteError };

export interface InviteDeps {
  /** Чи є вже профіль з цією адресою (без урахування регістру) — клієнтом адміністратора під RLS. */
  emailTaken(email: string): Promise<boolean>;
  /** auth.admin.generateLink({ type: "invite" }) — admin-клієнт; викликається лише після перевірки ролі. */
  generateInvite(
    email: string,
    fullName: string | null,
  ): Promise<{ ok: true; userId: string; tokenHash: string } | { ok: false; error: "EMAIL_EXISTS" | "LINK_FAILED" }>;
  /** rpc("admin_set_role") клієнтом адміністратора (для ролі, відмінної від employee). */
  assignRole(userId: string, role: AppRole): Promise<boolean>;
  /** insert positions (kind = main) клієнтом адміністратора під RLS. */
  assignMainPosition(userId: string, divisionId: string, title: string): Promise<boolean>;
}

export const INVITE_MESSAGES: Record<InviteError | InviteWarning, string> = {
  FORBIDDEN: "Запрошувати користувачів може лише адміністратор.",
  INVALID_EMAIL: "Вкажіть коректну адресу email, наприклад new.teacher@example.test.",
  INVALID_ROLE: "Оберіть роль зі списку.",
  POSITION_TITLE_REQUIRED: "Вкажіть назву посади або оберіть «без посади».",
  EMAIL_EXISTS: "Користувач з цією адресою вже є в порталі",
  LINK_FAILED: "Не вдалося створити посилання. Спробуйте ще раз.",
  ROLE_NOT_SET: "Акаунт створено з роллю «працівник»: роль не вдалося змінити — змініть її в списку.",
  POSITION_NOT_SET: "Акаунт створено без посади: посаду не вдалося призначити.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email без пробілів на краях і в нижньому регістрі (Припущення PM: «Teacher@Example.test» = «teacher@example.test»). */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function validateInvite(raw: RawInvite): { ok: true; value: InviteInput } | { ok: false; error: InviteError } {
  const email = normalizeEmail(raw.email);
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: "INVALID_EMAIL" };
  const role = raw.role.trim() || "employee";
  if (!isAppRole(role)) return { ok: false, error: "INVALID_ROLE" };
  const divisionId = raw.divisionId.trim();
  const title = raw.positionTitle.trim();
  if (divisionId && !title) return { ok: false, error: "POSITION_TITLE_REQUIRED" };
  return {
    ok: true,
    value: {
      email,
      fullName: raw.fullName.trim() || null,
      role,
      position: divisionId ? { divisionId, title } : null,
    },
  };
}

/**
 * Своє посилання для активації: /auth/confirm перевіряє token_hash (verifyOtp) і веде на /account/password.
 * action_link від Supabase не використовуємо — тож Site URL і Redirect URLs проєкту на посилання не впливають.
 */
export function buildActivationLink(origin: string, tokenHash: string): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "invite");
  url.searchParams.set("next", "/account/password");
  return url.toString();
}

/**
 * AC-USERS-01, AC-USERS-04, AC-USERS-08. Порядок важливий: роль адміністратора → перевірки → адреса вже є? → лише
 * тепер generateInvite (секретний ключ) → роль і посада клієнтом адміністратора під RLS.
 */
export async function inviteUserCore(
  viewerRole: AppRole | null,
  raw: RawInvite,
  origin: string,
  deps: InviteDeps,
): Promise<InviteResult> {
  if (!canManageUsers(viewerRole)) return { ok: false, error: "FORBIDDEN" };

  const checked = validateInvite(raw);
  if (!checked.ok) return checked;
  const input = checked.value;

  if (await deps.emailTaken(input.email)) return { ok: false, error: "EMAIL_EXISTS" };

  const created = await deps.generateInvite(input.email, input.fullName);
  if (!created.ok) return created;

  const warnings: InviteWarning[] = [];
  if (input.role !== "employee" && !(await deps.assignRole(created.userId, input.role))) warnings.push("ROLE_NOT_SET");
  if (input.position && !(await deps.assignMainPosition(created.userId, input.position.divisionId, input.position.title))) {
    warnings.push("POSITION_NOT_SET");
  }

  return { ok: true, email: input.email, link: buildActivationLink(origin, created.tokenHash), warnings };
}
