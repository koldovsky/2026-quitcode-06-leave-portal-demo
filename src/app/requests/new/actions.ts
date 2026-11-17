"use server";

// Server Action «Скласти чернетку» (AC-DRAFT-01…07). Server Action — публічний POST-ендпойнт: її можна викликати
// напряму, оминаючи сторінку, тож спершу перевіряємо роль — інакше денну квоту моделі можна було б витрачати без входу.
// Дія нічого не пише в базу (AC-DRAFT-02): повертає чернетку у форму, а заявку створює лише createLeaveRequest.
import { proposeDraft } from "@/lib/request-draft/draft";
import { nextDraftState, type DraftState } from "@/lib/request-draft/state";
import { draftModel } from "@/lib/request-draft/openrouter";
import { requireRole } from "@/lib/supabase/viewer";

export async function proposeRequestDraft(prev: DraftState, formData: FormData): Promise<DraftState> {
  await requireRole("employee");
  const description = String(formData.get("description") ?? "");
  const outcome = await proposeDraft({ text: description, now: new Date(), model: draftModel() });

  // Лише результат і модель — без тексту опису (у ньому можуть бути подробиці про здоров'я).
  const detail = outcome.kind === "unavailable" ? outcome.reason : (outcome.answer?.modelId ?? "-");
  console.info(`[request-draft] ${outcome.kind} ${detail}`);

  return nextDraftState(prev, outcome, description);
}
