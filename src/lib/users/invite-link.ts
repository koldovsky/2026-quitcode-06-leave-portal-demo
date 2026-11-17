// Посилання для активації (ADR 0003): auth.admin.generateLink — лише admin-клієнтом із секретним ключем.
// Окремим модулем, щоб наступна дія («нове посилання без повторного запрошення») брала той самий код.
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteLinkResult =
  | { ok: true; userId: string; tokenHash: string }
  | { ok: false; error: "EMAIL_EXISTS" | "LINK_FAILED" };

export async function generateInviteLink(email: string, fullName: string | null): Promise<InviteLinkResult> {
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
}
