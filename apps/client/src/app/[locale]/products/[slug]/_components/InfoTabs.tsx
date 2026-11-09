"use client";

import { useRef, useState } from "react";

export interface InfoTab {
  id: string;
  label: string;
  /** Server-rendered panel content. All panels are in the HTML; inactive ones are `hidden`. */
  panel: React.ReactNode;
}

/** Tab switcher only. Panel content is rendered on the server and passed in. */
export function InfoTabs({ tabs, label }: { tabs: InfoTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (from: number, delta: number) => {
    const next = tabs[(from + delta + tabs.length) % tabs.length];
    setActive(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div>
      <div className="overflow-x-auto border-b border-border">
        <div role="tablist" aria-label={label} className="flex min-w-max items-end gap-8 sm:gap-12">
          {tabs.map((tab, i) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[tab.id] = el;
                }}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") { e.preventDefault(); move(i, 1); }
                  if (e.key === "ArrowLeft") { e.preventDefault(); move(i, -1); }
                }}
                className={`relative min-h-11 px-1 pb-3 text-h4 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="pt-8"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
