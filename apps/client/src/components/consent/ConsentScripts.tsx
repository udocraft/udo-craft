"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClarityInit } from "@udo-craft/ui";
import { useConsent } from "@/lib/consent";

const CLARITY_ID = "w7kk9avzfh";

/** Loads measurement scripts only after the visitor accepts. */
export function ConsentScripts() {
  const consent = useConsent();
  if (consent !== "granted") return null;

  return (
    <>
      <ClarityInit clarityId={CLARITY_ID} />
      <Analytics />
      {/* Field Core Web Vitals (Plan.md 4.2). Behind consent like the other measurement scripts. */}
      <SpeedInsights />
    </>
  );
}
