// WS11 · Sentry у Edge-середовищі (proxy). Вмикається лише там, де задано NEXT_PUBLIC_SENTRY_DSN —
// у демо це тільки гілка ws11/sentry (Vercel → Preview). Без DSN SDK нічого не надсилає.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? "local",
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // SDK 11 за замовчуванням збирає cookies, заголовки, тіла й query запитів і поля user.* — вимикаємо:
  // у трекер іде лише помилка, стек і шлях запиту, без персональних даних і токенів.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
  // Лише помилки, без трасування продуктивності — менше даних і квоти.
  tracesSampleRate: 0,
});
