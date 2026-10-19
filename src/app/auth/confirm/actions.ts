"use server";

// Дія кнопки «Активувати акаунт» зі сторінки /auth/confirm. Лише тут витрачається одноразовий токен: verifyOtp
// перевіряє token_hash і записує сесію в cookies (офіційний патерн Supabase для SSR — серверний клієнт із cookies).
//
// Server Action — публічний POST-ендпойнт. getClaims() тут немає і бути не може: сесії ще немає, її створює verifyOtp
// (виняток із правила «getClaims у кожній дії» — дії, що створюють сесію: вхід і активація). Вхід дає лише дійсний
// одноразовий token_hash, а next — лише через safeNextPath (інакше open redirect).
import { redirect } from "next/navigation";
import { confirmTarget } from "@/lib/auth/confirm";
import { createClient } from "@/lib/supabase/server";

export async function activate(formData: FormData): Promise<void> {
  // AC-USERS-02: дійсне посилання → сесія → next (лише відносний шлях цього сайту).
  // AC-USERS-05: використане, застаріле чи пошкоджене (verifyOtp: 403 otp_expired) → /login?error=link.
  const target = await confirmTarget(formData, async (type, tokenHash) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return !error;
  });
  redirect(target);
}
