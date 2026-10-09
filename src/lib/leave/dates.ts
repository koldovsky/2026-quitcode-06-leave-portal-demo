import type { IsoDate } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Чи це справжня календарна дата YYYY-MM-DD (2026-02-30 — ні). */
export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Усі дні від start до end включно. Рахуємо в UTC: дати без часу, тож перехід на літній час не зсуває дні. */
export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/** «03.11.2026» для інтерфейсу. */
export function formatDate(value: IsoDate): string {
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}
