import { ChevronDown } from "lucide-react";

export interface TopicOption {
  value: string;
  icon: string;
  label: string;
  desc: string;
}

export const TOPIC_TRIGGER_CLASS =
  "w-full h-[52px] flex items-center gap-3 bg-foreground/5 border border-input rounded-lg px-4 text-left hover:bg-foreground/10 hover:border-input transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring";

/** Trigger contents shared by the static button and the base-ui popover trigger. */
export function TopicTriggerBody({ selected, open }: { selected: TopicOption; open: boolean }) {
  return (
    <>
      <span className="text-xl shrink-0" aria-hidden="true">{selected.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium leading-tight">{selected.label}</p>
        <p className="text-muted-foreground text-xs mt-0.5 truncate">{selected.desc}</p>
      </div>
      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </>
  );
}
