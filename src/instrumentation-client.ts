// WS11 · Sentry у браузері. Та сама умова: без NEXT_PUBLIC_SENTRY_DSN нічого не надсилається.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
  // SDK 11 за замовчуванням збирає cookies, заголовки, тіла й query запитів і поля user.* — вимикаємо:
  // у трекер іде лише помилка, стек і шлях запиту, без персональних даних і токенів.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
