"use client";

import { useEffect } from "react";

/**
 * Admin live preview. The CMS editor posts `CMS_UPDATE` into preview iframes
 * while an editor types. The home page is server-rendered now, so instead of
 * re-rendering React we patch text nodes tagged with `data-cms="slug.key"`.
 * Repeater fields (FAQ items, guarantees) show after saving and reloading.
 * Only active inside an iframe, and only ever writes `textContent`.
 */
export function CmsPreviewBridge() {
  useEffect(() => {
    if (window.self === window.top) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; slug?: unknown; body?: unknown } | null;
      if (data?.type !== "CMS_UPDATE" || typeof data.slug !== "string") return;
      if (!data.body || typeof data.body !== "object") return;
      for (const [key, value] of Object.entries(data.body as Record<string, unknown>)) {
        if (typeof value !== "string") continue;
        document
          .querySelectorAll(`[data-cms="${CSS.escape(`${data.slug}.${key}`)}"]`)
          .forEach((el) => {
            el.textContent = value;
          });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
