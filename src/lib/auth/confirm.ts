// Логіка /auth/confirm без Next.js і Supabase: що показує сторінка активації і куди вести після «Активувати акаунт».
//
// Посилання одноразове (повтор — 403 otp_expired). Месенджери й поштові сканери відкривають посилання ботом для
// прев'ю — тобто роблять той самий GET. Тому відкриття посилання (GET, сторінка) нічого не перевіряє й не витрачає:
// сторінка лише переносить параметри посилання в приховані поля форми. Токен перевіряє й витрачає дія activate (POST)
// після натискання «Активувати акаунт» (AC-USERS-02, AC-USERS-05; припущення PM).
import { safeNextPath } from "./next-path";

/** Типи посилань, які приймає портал: запрошення і (запасний шлях) відновлення пароля. */
export const CONFIRM_TYPES = ["invite", "recovery"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

/** AC-USERS-05: недійсне, використане чи застаріле посилання — сюди, з повідомленням на сторінці входу. */
export const LINK_ERROR_PATH = "/login?error=link";

const isConfirmType = (value: unknown): value is ConfirmType => CONFIRM_TYPES.includes(value as ConfirmType);

/** Параметри посилання: URLSearchParams (адреса) або FormData (форма сторінки). */
type Params = { get(name: string): unknown };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * Приховані поля форми «Активувати акаунт» — з параметрів посилання, як є (перевірить дія activate).
 * Сторінку показуємо для будь-якого посилання, навіть неповного: що посилання недійсне, людина дізнається, коли
 * активує акаунт (AC-USERS-05: «Коли людина відкриває його й активує акаунт»).
 */
export function activationFields(searchParams: Record<string, string | string[] | undefined>) {
  return {
    token_hash: first(searchParams.token_hash),
    type: first(searchParams.type),
    next: first(searchParams.next),
  };
}

/**
 * AC-USERS-02, AC-USERS-05: після «Активувати акаунт» перевіряє посилання функцією verify (у дії activate —
 * supabase.auth.verifyOtp) і повертає шлях, куди перенаправити. verify не викликаємо, якщо посилання явно неповне чи з
 * чужим типом.
 */
export async function confirmTarget(
  params: Params,
  verify: (type: ConfirmType, tokenHash: string) => Promise<boolean>,
): Promise<string> {
  const tokenHash = text(params.get("token_hash"));
  const type = text(params.get("type"));
  if (!tokenHash || !isConfirmType(type)) return LINK_ERROR_PATH;
  const ok = await verify(type, tokenHash);
  return ok ? safeNextPath(params.get("next")) : LINK_ERROR_PATH;
}
