"use client";

import { lazy, Suspense, useState } from "react";
import { TOPIC_TRIGGER_CLASS, TopicTriggerBody, type TopicOption } from "./TopicTrigger";

const loadMenu = () => import("./TopicPickerMenu").then((m) => m.TopicPickerMenu);

interface Props {
  topics: TopicOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function StaticTrigger({ topics, value, disabled, onActivate }: Omit<Props, "onChange"> & { onActivate?: () => void }) {
  const selected = topics.find((t) => t.value === value) ?? topics[0];
  return (
    <button
      type="button"
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={false}
      className={TOPIC_TRIGGER_CLASS}
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onClick={onActivate}
    >
      <TopicTriggerBody selected={selected} open={false} />
    </button>
  );
}

const Menu = lazy(() => loadMenu().then((C) => ({ default: C })));

/**
 * The popover (base-ui + floating-ui, ~35 kB gzip) loads on the first hover,
 * focus or tap of this static trigger instead of with the page.
 */
export function TopicPicker(props: Props) {
  const [activated, setActivated] = useState(false);
  if (activated) {
    return (
      <Suspense fallback={<StaticTrigger {...props} />}>
        <Menu {...props} defaultOpen />
      </Suspense>
    );
  }
  return <StaticTrigger {...props} onActivate={() => setActivated(true)} />;
}
