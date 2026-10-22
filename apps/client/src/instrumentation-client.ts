import * as Sentry from "@sentry/nextjs";

declare global {
  interface Window { __SENTRY_INITIALIZED__?: boolean; }
}

if (!window.__SENTRY_INITIALIZED__) {
  window.__SENTRY_INITIALIZED__ = true;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    enableLogs: true,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
