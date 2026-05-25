"use client";

import React from "react";
import { ArrowLeft, Layers, LayoutList, Pencil, Type, Upload } from "lucide-react";
import { type SidebarTabId } from "@udo-craft/shared";

export interface EditorSidebarProps {
  activeTab: SidebarTabId | null;
  onTabChange: (tab: SidebarTabId | null) => void;
  onBack: () => void;
  layerCount?: number;
}

const TABS: { id: SidebarTabId; label: string; Icon: React.ElementType }[] = [
  { id: "prints",  label: "Принти",  Icon: Layers      },
  { id: "draw",    label: "Малюнок", Icon: Pencil      },
  { id: "text",    label: "Текст",   Icon: Type        },
  { id: "upload",  label: "Файл",    Icon: Upload      },
  { id: "layers",  label: "Шари",    Icon: LayoutList  },
];

export default function EditorSidebar({ activeTab, onTabChange, onBack, layerCount = 0 }: EditorSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-14 shrink-0 h-full bg-card" aria-label="Інструменти редактора">
      {/* Back button */}
      <div className="flex items-center justify-center pt-2 pb-1 px-1">
        <button
          type="button"
          aria-label="Назад"
          onClick={onBack}
          className="flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" />
          <span className="text-[9px] font-medium leading-none">Назад</span>
        </button>
      </div>

      <div className="mx-2 border-t border-border" />

      {/* Tool tabs */}
      <nav className="flex flex-col items-center gap-1 pt-1 px-1">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => onTabChange(activeTab === id ? null : id)}
              className={[
                "relative flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
              <Icon className="size-4" />
              {id === "layers" && layerCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-primary text-[8px] font-black text-primary-foreground flex items-center justify-center px-0.5 leading-none">
                  {layerCount > 9 ? "9+" : layerCount}
                </span>
              )}
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
