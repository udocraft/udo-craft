"use client";

import { useEffect } from "react";

interface ClarityInitProps {
  clarityId: string;
}

export function ClarityInit({ clarityId }: ClarityInitProps) {
  useEffect(() => {
    // Prevent duplicate script injection
    if (typeof window !== "undefined" && (window as any).clarity) {
      return;
    }

    import("@microsoft/clarity").then((clarity) => {
      clarity.default.init(clarityId);
    }).catch(() => {
      // Fallback: inject script manually only if not already present
      if (typeof window !== "undefined" && !(window as any).clarity) {
        const existingScript = document.querySelector(`script[src="https://www.clarity.ms/tag/${clarityId}"]`);
        if (!existingScript) {
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://www.clarity.ms/tag/" + clarityId;
          document.head.appendChild(s);
        }
      }
    });
  }, [clarityId]);

  return null;
}
