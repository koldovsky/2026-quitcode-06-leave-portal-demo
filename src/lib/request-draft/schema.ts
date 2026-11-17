// Відповідь моделі для чернетки заявки (AC-DRAFT-01…07). Ключі — англійською, як поля форми; кожне поле обов'язкове,
// «невідомо» — null, а не відсутнє поле: строгий JSON Schema на OpenRouter вимагає всіх властивостей у `required`.
import { z } from "zod";
import { LEAVE_TYPES } from "@/lib/leave/types";

export const DRAFT_STATUSES = ["ok", "needs_info", "refused"] as const;
export const DRAFT_POSITIONS = ["main", "additional", "both"] as const;
export type DraftPositions = (typeof DRAFT_POSITIONS)[number];

export const ModelDraftSchema = z.object({
  status: z
    .enum(DRAFT_STATUSES)
    .describe("ok = type and dates are clear; needs_info = type or dates unclear; refused = the text describes no absence"),
  leaveType: z.enum(LEAVE_TYPES).nullable(),
  startDate: z.string().nullable().describe("YYYY-MM-DD"),
  endDate: z.string().nullable().describe("YYYY-MM-DD"),
  positions: z.enum(DRAFT_POSITIONS).nullable(),
  substituteNote: z.string().nullable().describe("who covers the lessons, in the employee's words"),
});

export type ModelDraft = z.infer<typeof ModelDraftSchema>;
