// Посилання для активації: /auth/confirm?token_hash=…&type=invite&next=/account/password (src/lib/users/invite.ts).
// Офіційний патерн Supabase для SSR: verifyOtp у Route Handler ставить cookie сесії, redirect() з next/navigation
// їх зберігає. Шлях /auth — у PUBLIC_PATHS proxy (людина ще не увійшла).
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { confirmTarget } from "@/lib/auth/confirm";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // AC-USERS-02: дійсне посилання → сесія → next (лише відносний шлях, safeNextPath).
  // AC-USERS-05: використане, застаріле чи пошкоджене (verifyOtp: 403 otp_expired) → /login?error=link.
  const target = await confirmTarget(request.nextUrl.searchParams, async (type, tokenHash) => {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return !error;
  });
  redirect(target);
}
