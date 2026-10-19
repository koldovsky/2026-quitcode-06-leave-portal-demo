"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

/** AC-USERS-02: запрошена людина (сесія з /auth/confirm) задає собі пароль. */
export async function setPassword(formData: FormData) {
  const supabase = await createClient();
  // getClaims() перевіряє підпис JWT; без сесії — на вхід. Змінити можна лише СВІЙ пароль.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const invalid = validatePassword(password, confirm);
  if (invalid) redirect(`/account/password?error=${invalid}`);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/account/password?error=UPDATE_FAILED");

  revalidatePath("/", "layout");
  redirect("/?welcome=1");
}
