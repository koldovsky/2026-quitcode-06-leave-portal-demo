// Синтетичні дані зі сценаріїв специфікації leave-requests (spec-v0.1).
import type { Position } from "@/lib/leave/types";

export const MATH = "div-math";
export const PRIMARY = "div-primary";

export const MANAGER_MATH = "manager-math";
export const MANAGER_PRIMARY = "manager-primary";

/** Працівник лише з основною посадою (AC-LEAVE-01). */
export const singlePosition: Position[] = [{ id: "pos-single-main", kind: "main", divisionId: PRIMARY }];

/** Працівник з основною посадою в «Математиці» і додатковою в «Початковій школі» (AC-LEAVE-02). */
export const twoPositions: Position[] = [
  { id: "pos-main", kind: "main", divisionId: MATH },
  { id: "pos-additional", kind: "additional", divisionId: PRIMARY },
];
