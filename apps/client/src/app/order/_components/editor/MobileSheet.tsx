"use client";

import React, { useEffect, useRef } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function MobileSheet({ open, onClose, title, children }: MobileSheetProps) {
  // ── Scroll lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = () => {
    if (touchCurrentY.current - touchStartY.current > 80) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only covers canvas area, not the tab bar */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-x-0 top-0 bottom-14 bg-black/40 z-[9994]"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Sheet — anchored just above the tab bar, no shadow upward */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-sheet-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed bottom-14 left-0 right-0 z-[9996] flex flex-col bg-card border-t border-border"
            style={{ maxHeight: "calc(100dvh - 56px - 44px)" } as React.CSSProperties}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-border">
              <h2 id="mobile-sheet-title" className="text-sm font-semibold">{title}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
