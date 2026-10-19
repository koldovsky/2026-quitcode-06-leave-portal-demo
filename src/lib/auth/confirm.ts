// Логіка /auth/confirm без Next.js і Supabase: які посилання приймаємо і куди ведемо після перевірки.
import { safeNextPath } from "./next-path";

/** Типи посилань, які приймає портал: запрошення і (запасний шлях) відновлення пароля. */
export const CONFIRM_TYPES = ["invite", "recovery"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

/** AC-USERS-05: недійсне, використане чи застаріле посилання — сюди, з повідомленням на сторінці входу. */
export const LINK_ERROR_PATH = "/login?error=link";

const isConfirmType = (value: unknown): value is ConfirmType => CONFIRM_TYPES.includes(value as ConfirmType);

/**
 * AC-USERS-02, AC-USERS-05: перевіряє посилання функцією verify (у route — supabase.auth.verifyOtp) і повертає шлях,
 * куди перенаправити. verify не викликаємо, якщо посилання явно неповне чи з чужим типом.
 */
export async function confirmTarget(
  params: URLSearchParams,
  verify: (type: ConfirmType, tokenHash: string) => Promise<boolean>,
): Promise<string> {
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash || !isConfirmType(type)) return LINK_ERROR_PATH;
  const ok = await verify(type, tokenHash);
  return ok ? safeNextPath(params.get("next")) : LINK_ERROR_PATH;
}
