"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sound } from "@/lib/sound";
import { TOPIC_TRIGGER_CLASS, TopicTriggerBody, type TopicOption } from "./TopicTrigger";

interface Props {
  topics: TopicOption[];
  value: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  onChange: (value: string) => void;
}

/** base-ui popover version of the topic picker. Loaded on first interaction by TopicPicker. */
export function TopicPickerMenu({ topics, value, disabled, defaultOpen = false, onChange }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const selected = topics.find((t) => t.value === value) ?? topics[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={disabled} className={TOPIC_TRIGGER_CLASS}>
        <TopicTriggerBody selected={selected} open={open} />
      </PopoverTrigger>

      {/* Portalled out of the inverse section, so it opts into the scope itself. */}
      <PopoverContent
        align="start"
        sideOffset={6}
        style={{ width: "var(--anchor-width)" }}
        className="inverse border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl rounded-xl"
      >
        {topics.map((t) => (
          <button key={t.value} type="button"
            onClick={() => { onChange(t.value); setOpen(false); sound.select(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === t.value ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5"
            }`}
          >
            <span className="text-xl shrink-0" aria-hidden="true">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight text-foreground">{t.label}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">{t.desc}</p>
            </div>
            {value === t.value && <Check className="w-4 h-4 shrink-0 text-foreground" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
