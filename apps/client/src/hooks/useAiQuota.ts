"use client";

import { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";

export interface AiQuotaState {
  attemptsUsed: number;
  limit: number;
  isExhausted: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const LIMIT = 3;

export function useAiQuota(isAuthenticated: boolean): AiQuotaState {
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    fetch("/api/ai/quota")
      .then((res) => {
        if (res.status === 404) {
          setAttemptsUsed(0);
          return;
        }
        return res.json().then((data) => {
          setAttemptsUsed(data.attempts_used ?? 0);
        });
      })
      .catch((err) => {
        Sentry.captureException(err, { extra: { context: "useAiQuota fetch" } });
        // Fail-open: default to 0 so the user isn't blocked
        setAttemptsUsed(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated]);

  // The server reserves quota inside /api/ai/generate; the client only re-reads it.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/quota");
      if (!res.ok) return;
      const data = await res.json();
      setAttemptsUsed(data.attempts_used ?? 0);
    } catch (err) {
      Sentry.captureException(err, { extra: { context: "useAiQuota refresh" } });
    }
  }, []);

  if (!isAuthenticated) {
    return {
      attemptsUsed: 0,
      limit: LIMIT,
      isExhausted: false,
      loading: false,
      refresh: async () => {},
    };
  }

  return {
    attemptsUsed,
    limit: LIMIT,
    isExhausted: attemptsUsed >= LIMIT,
    loading,
    refresh,
  };
}
