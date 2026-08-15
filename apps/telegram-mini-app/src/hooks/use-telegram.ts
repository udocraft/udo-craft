"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function getTg() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

export function useTelegram() {
  const [tg, setTg] = useState<typeof window.Telegram.WebApp | null>(null);

  useEffect(() => {
    const instance = getTg();
    if (instance) {
      instance.ready();
      instance.expand();
      setTg(instance);
    }
  }, []);

  const initDataRaw = useMemo(() => tg?.initData, [tg]);

  const showMainButton = useCallback((text: string, onClick: () => void, params?: {
    color?: string; textColor?: string; active?: boolean;
  }) => {
    if (!tg) return () => {};
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    if (params?.color) tg.MainButton.color = params.color;
    if (params?.textColor) tg.MainButton.textColor = params.textColor;
    if (params?.active === false) tg.MainButton.disable();
    else tg.MainButton.enable();
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
