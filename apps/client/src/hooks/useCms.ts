"use client";

import { useEffect, useState } from "react";

type CmsBody = Record<string, string>;
type CmsMap  = Record<string, CmsBody>;

let cache: CmsMap | null = null;
let fetchPromise: Promise<CmsMap> | null = null;

async function fetchAll(): Promise<CmsMap> {
  if (cache) return cache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/cms")
    .then((r) => r.json())
    .then((data) => {
      const map: CmsMap = {};
      for (const item of (data.content ?? [])) {
        map[item.slug] = item.body ?? {};
      }
      cache = map;
      return map;
    })
    .catch(() => ({}));

  return fetchPromise;
}

/** Returns a flat map of all CMS slugs → body objects. */
export function useCms(initialData?: CmsMap) {
  const [cms, setCms] = useState<CmsMap>(() => {
    if (initialData) {
      cache = initialData;
      return initialData;
    }
    return cache ?? {};
  });

  useEffect(() => {
    if (initialData) return; // already have it
    if (cache) { setCms(cache); return; }
    fetchAll().then(setCms);
  }, [initialData]);

  // Listen for live updates from admin builder
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "CMS_UPDATE") {
        const { slug, body } = event.data;
        setCms((prev) => ({
          ...prev,
          [slug]: {
            ...(prev[slug] || {}),
            ...body,
          },
        }));
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /** Get a field value with a fallback. */
  function get(slug: string, key: string, fallback = ""): string {
    return (cms[slug]?.[key] as string) || fallback;
  }

  return { cms, get };
}
