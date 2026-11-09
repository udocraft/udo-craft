// Sentry's browser SDK is ~60 kB gzip and ~0.8 s of main-thread work on a throttled phone
// (Lighthouse: the largest long task on the home page). It is loaded after the page is
// interactive instead of in the first-load bundle. Errors thrown before it is ready are
// buffered and reported once it initialises, so nothing is lost; only the breadcrumbs and the
// pageload span of those first seconds are.
type SentryModule = typeof import("@sentry/nextjs");

declare global {
  interface Window { __SENTRY_INITIALIZED__?: boolean; }
}

const EARLY_ERROR_LIMIT = 10;
let sentry: SentryModule | null = null;
const early: unknown[] = [];

const bufferError = (e: ErrorEvent) => {
  if (early.length < EARLY_ERROR_LIMIT) early.push(e.error ?? e.message);
};
const bufferRejection = (e: PromiseRejectionEvent) => {
  if (early.length < EARLY_ERROR_LIMIT) early.push(e.reason);
};

function loadSentry() {
  if (window.__SENTRY_INITIALIZED__) return;
  window.__SENTRY_INITIALIZED__ = true;
  void import("@sentry/nextjs").then((S) => {
    S.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.2,
      enableLogs: true,
      sendDefaultPii: false,
    });
    sentry = S;
    window.removeEventListener("error", bufferError);
    window.removeEventListener("unhandledrejection", bufferRejection);
    for (const err of early.splice(0)) S.captureException(err);
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("error", bufferError);
  window.addEventListener("unhandledrejection", bufferRejection);

  const schedule = () => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(loadSentry, { timeout: 4000 });
    else window.setTimeout(loadSentry, 2000);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

export const onRouterTransitionStart = (...args: Parameters<SentryModule["captureRouterTransitionStart"]>) => {
  sentry?.captureRouterTransitionStart(...args);
};
