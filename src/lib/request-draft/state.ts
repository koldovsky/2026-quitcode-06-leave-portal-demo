// Стан помічника на сторінці нової заявки: повідомлення й значення полів форми (AC-DRAFT-01, 03, 04, 06, 07).
// Модуль імпортує Client Component, тож тут лише типи з extract.ts — без AI SDK у бандлі браузера.
import type { PositionKind } from "@/lib/leave/types";
import type { DraftFields, DraftOutcome } from "./extract";

export const DRAFT_MESSAGES = {
  ok: "Чернетку заповнено. Перевірте поля й подайте заявку.",
  needs_info: "Не вдалося зрозуміти тип відсутності або дати. Уточніть опис або заповніть форму вручну.",
  refused: "Це не схоже на опис відсутності. Опишіть, коли й чому вас не буде, або заповніть форму вручну.",
  unavailable: "Помічник зараз недоступний. Заповніть форму вручну.",
} as const;

export type DraftResult = keyof typeof DRAFT_MESSAGES;

/**
 * Стан помічника на сторінці. `draft` — остання вдала чернетка; `formRound` росте лише з новою чернеткою: форма
 * подання перестворюється з її значеннями, а після needs_info / refused / unavailable лишається як була.
 * `description` повертаємо у форму опису, щоб працівник міг його уточнити (React скидає поля до defaultValue).
 */
export interface DraftState {
  result: DraftResult | null;
  draft: DraftFields | null;
  formRound: number;
  description: string;
}

export const INITIAL_DRAFT_STATE: DraftState = { result: null, draft: null, formRound: 0, description: "" };

export function nextDraftState(prev: DraftState, outcome: DraftOutcome, description: string): DraftState {
  if (outcome.kind === "ok") {
    return { result: "ok", draft: outcome.draft, formRound: prev.formRound + 1, description };
  }
  return { ...prev, result: outcome.kind, description };
}

/** Повідомлення під описом: успіх — «success», не вдалося — «warning» (це не помилка працівника). */
export function draftNotice(state: DraftState): { kind: "success" | "warning"; text: string } | null {
  if (!state.result) return null;
  return { kind: state.result === "ok" ? "success" : "warning", text: DRAFT_MESSAGES[state.result] };
}

export interface FormValues {
  leaveType: string;
  startDate: string;
  endDate: string;
  positionIds: string[];
  substituteNote: string;
}

/**
 * Значення полів форми подання. Без чернетки — як у формі без помічника (тип «хвороба», основна посада).
 * Посади: «both» — усі посади працівника; «additional» — лише додаткова (якщо її немає — основна); інакше — основна.
 */
export function formValues(draft: DraftFields | null, positions: { id: string; kind: PositionKind }[]): FormValues {
  const ids = (kind: PositionKind) => positions.filter((p) => p.kind === kind).map((p) => p.id);
  const chosen =
    draft?.positions === "both"
      ? positions.map((p) => p.id)
      : draft?.positions === "additional" && ids("additional").length
        ? ids("additional")
        : ids("main");
  return {
    leaveType: draft?.leaveType ?? "sick",
    startDate: draft?.startDate ?? "",
    endDate: draft?.endDate ?? "",
    positionIds: chosen,
    substituteNote: draft?.substituteNote ?? "",
  };
}
