// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

declare global {
  interface Window { __SENTRY_INITIALIZED__?: boolean; }
}

// Guard against multiple initializations
if (!window.__SENTRY_INITIALIZED__) {
  window.__SENTRY_INITIALIZED__ = true;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.2,
    // Enable logs to be sent to Sentry
    enableLogs: true,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

