"use client";

import { useEffect, useState } from "react";
import { WIDGETS, WIDGET_ORDER } from "@/lib/widgets";
import { useWidgetStore } from "@/lib/widget-store";

export function WidgetPanel() {
  const isOpen = useWidgetStore((s) => s.isOpen);
  const [hasOpened, setHasOpened] = useState(
    () => useWidgetStore.getState().isOpen,
  );

  useEffect(
    () =>
      useWidgetStore.subscribe((state) => {
        if (state.isOpen) setHasOpened(true);
      }),
    [],
  );
  const shouldRenderWidgets = hasOpened || isOpen;

  return (
    <aside
      className={`widget-panel${isOpen ? " is-open" : ""}`}
      aria-hidden={!isOpen}
      // Tab into widgets only when the panel is visible.
      {...(!isOpen ? { inert: true } : {})}
    >
      {shouldRenderWidgets && WIDGET_ORDER.map((id) => {
        const def = WIDGETS[id];
        if (!def) return null;
        const W = def.Component;
        return <W key={id} active={isOpen} />;
      })}
    </aside>
  );
}
