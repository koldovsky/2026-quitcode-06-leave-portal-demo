// WS11 · Навмисна помилка, щоб перевірити, що Sentry ловить збої сервера.
// Працює лише поза продом (VERCEL_ENV !== "production"); на проді — 404.
export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  throw new Error("WS11 sentry-check: навмисна помилка для перевірки трекера");
}
