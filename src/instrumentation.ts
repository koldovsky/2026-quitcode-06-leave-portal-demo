// WS11 · Next.js викликає register() один раз на старті сервера, а onRequestError — на кожну
// необроблену помилку сервера (сторінки, route handlers, server actions). Sentry.captureRequestError
// надсилає таку помилку в Sentry разом зі шляхом і методом запиту.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
