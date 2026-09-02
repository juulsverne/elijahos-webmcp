// Widget registry. Mirrors the APPS pattern in src/lib/apps.ts so the
// panel can render in a stable order without hardcoding component refs
// in WidgetPanel.tsx.
//
// Widgets aren't full window apps — they don't have a default rect or
// dock entry. Just an id, a label, an icon, and the React component.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export type WidgetComponentProps = {
  active?: boolean;
};

export type WidgetDef = {
  id: string;
  // Short label for accessible names + dev tooling.
  title: string;
  // Compact label for constrained card heads. Falls back to title.
  shortTitle?: string;
  // Single-glyph icon (matches APPS pattern). Currently unused in the
  // panel chrome but available if we ever add a per-widget header.
  icon: string;
  // Optional path-style kicker shown inside the widget body
  // (e.g. "/wobbles/about"). Lives here so the literal isn't pasted
  // inline in the component.
  kicker?: string;
  Component: ComponentType<WidgetComponentProps>;
};

const IndexWidget = dynamic<WidgetComponentProps>(
  () => import("@/components/widgets/IndexWidget").then((m) => m.IndexWidget),
  { ssr: false },
);
const MusicWidget = dynamic<WidgetComponentProps>(
  () => import("@/components/widgets/MusicWidget").then((m) => m.MusicWidget),
  { ssr: false },
);
const SystemPulseWidget = dynamic<WidgetComponentProps>(
  () =>
    import("@/components/widgets/SystemPulseWidget").then(
      (m) => m.SystemPulseWidget,
    ),
  { ssr: false },
);
const WeatherWidget = dynamic<WidgetComponentProps>(
  () => import("@/components/widgets/WeatherWidget").then((m) => m.WeatherWidget),
  { ssr: false },
);
const WobblesWidget = dynamic<WidgetComponentProps>(
  () => import("@/components/widgets/WobblesWidget").then((m) => m.WobblesWidget),
  { ssr: false },
);

export const WIDGETS: Record<string, WidgetDef> = {
  index: {
    id: "index",
    title: "index",
    icon: "◈",
    Component: IndexWidget,
  },
  music: {
    id: "music",
    title: "now playing",
    icon: "♫",
    Component: MusicWidget,
  },
  pulse: {
    id: "pulse",
    title: "system pulse",
    shortTitle: "pulse",
    icon: "⚡",
    Component: SystemPulseWidget,
  },
  weather: {
    id: "weather",
    title: "weather",
    icon: "⛅",
    Component: WeatherWidget,
  },
  wobbles: {
    id: "wobbles",
    title: "wobbles cam",
    icon: "🐱",
    kicker: "/wobbles/about",
    Component: WobblesWidget,
  },
};

// Stable top→bottom order in the panel.
export const WIDGET_ORDER: string[] = [
  "weather",
  "music",
  "wobbles",
  "index",
  "pulse",
];
