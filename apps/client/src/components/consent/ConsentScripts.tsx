"use client";

import { Analytics } from "@vercel/analytics/next";
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
    </>
  );
}
