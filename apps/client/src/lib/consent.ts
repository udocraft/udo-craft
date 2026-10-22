"use client";

import { useSyncExternalStore } from "react";

export const CONSENT_KEY = "udo_consent";
const CHANGE_EVENT = "udo-consent-change";

export type Consent = "granted" | "denied";

export function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice applies for this page view only
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** null = not decided yet. Analytics and third-party scripts need "granted". */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}

/** Clears the stored choice so the banner appears again (footer "Cookie settings"). */
export function resetConsent() {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Storage blocked: nothing stored to clear
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
