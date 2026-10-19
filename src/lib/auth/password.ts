// AC-USERS-02: новий пароль — щонайменше 8 символів, двічі однаково (Припущення PM). Верхня межа — 72 байти:
// довші паролі Supabase Auth (bcrypt) не приймає.
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

export type PasswordError = "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG" | "PASSWORD_MISMATCH";

export const PASSWORD_MESSAGES: Record<PasswordError | "UPDATE_FAILED", string> = {
  PASSWORD_TOO_SHORT: `Пароль — щонайменше ${PASSWORD_MIN_LENGTH} символів.`,
  PASSWORD_TOO_LONG: "Пароль задовгий — не більше 72 латинських символів.",
  PASSWORD_MISMATCH: "Паролі не збігаються. Введіть той самий пароль двічі.",
  UPDATE_FAILED: "Не вдалося зберегти пароль. Спробуйте ще раз або зверніться до адміністратора.",
};

export function validatePassword(password: string, confirm: string): PasswordError | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "PASSWORD_TOO_SHORT";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "PASSWORD_TOO_LONG";
  if (password !== confirm) return "PASSWORD_MISMATCH";
  return null;
}

/** До якого поля належить помилка: довжина — «Пароль», розбіжність — «Пароль ще раз»; UPDATE_FAILED — до форми (null). */
export function passwordErrorField(error: unknown): "password" | "password_confirm" | null {
  if (error === "PASSWORD_TOO_SHORT" || error === "PASSWORD_TOO_LONG") return "password";
  if (error === "PASSWORD_MISMATCH") return "password_confirm";
  return null;
}
