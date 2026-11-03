"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function getTg() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

export function useTelegram() {
  const [tg] = useState<typeof window.Telegram.WebApp | null>(getTg);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
  }, [tg]);

  const initDataRaw = useMemo(() => tg?.initData, [tg]);

  const showMainButton = useCallback((text: string, onClick: () => void, params?: {
    color?: string; textColor?: string; active?: boolean;
  }) => {
    if (!tg) return () => {};
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    tg.MainButton.setParams({
      ...(params?.color && { color: params.color }),
      ...(params?.textColor && { text_color: params.textColor }),
      is_active: params?.active !== false,
    });
    tg.MainButton.show();
    return () => {
      tg.MainButton.offClick(onClick);
      tg.MainButton.hide();
    };
  }, [tg]);

  const hideMainButton = useCallback(() => {
    tg?.MainButton.hide();
  }, [tg]);

  const showBackButton = useCallback((onClick: () => void) => {
    if (!tg?.BackButton) return () => {};
    tg.BackButton.show();
    tg.BackButton.onClick(onClick);
    return () => {
      tg.BackButton.offClick(onClick);
      tg.BackButton.hide();
    };
  }, [tg]);

  const haptic = useCallback((type: 'impact' | 'notification' | 'selection') => {
    if (!tg?.HapticFeedback) return;
    if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
    else if (type === 'notification') tg.HapticFeedback.notificationOccurred('success');
    else if (type === 'selection') tg.HapticFeedback.selectionChanged();
  }, [tg]);

  const theme = tg?.themeParams || {};
  const user = tg?.initDataUnsafe?.user;

  return {
    initDataRaw,
    tg,
    showMainButton,
    hideMainButton,
    showBackButton,
    haptic,
    theme,
    user,
  };
}
