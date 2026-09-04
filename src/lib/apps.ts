// App registry. The window system reads from this to know what
// can be launched, the dock reads from this to know what to show,
// and routes / deep-links resolve to these ids.

export type AppDef = {
  id: string;
  title: string;          // path-style title shown in window titlebar (e.g. "/about")
  icon: string;           // single-glyph dock icon
  dock: boolean;          // appears in dock?
  defaultRect: { x: number; y: number; w: number; h: number };
  // When true, the dock button is hidden at viewports narrower than 768px.
  // Used for the terminal: typing the puzzle password on a phone keyboard
  // is a non-experience and recruiters/engineers evaluate on desktop.
  desktopOnly?: boolean;
  // When true, the app appears in the Launchpad grid. Defaults to false
  // so opt-in is explicit. `root` deliberately omits this so the unlocked
  // easter-egg window stays hidden until earned via the /zsh puzzle.
  launchpad?: boolean;
  // When false, the window cannot be resized or maximized (fixed-size app).
  // Omitting this field is equivalent to true.
  resizable?: boolean;
  // Short label rendered under the icon on the mobile shell's home grid.
  // Tile labels live in a ~70-90px wide column so anything longer than ~10
  // characters truncates. When omitted, the mobile shell falls back to the
  // app id. Use this to override when the id is awkward or the title would
  // be too long (e.g. `case_study/elijahos`).
  mobileLabel?: string;
};

// `satisfies` on the inner const preserves the literal key set so the
// derived `AppId` union is the concrete set of ids. `APP_COMPONENTS` in
// components/apps/registry.tsx uses this union to enforce that every
// registered app id has a matching component (and vice versa). The outer
// `APPS` keeps the wide `Record<string, AppDef>` shape so runtime callers
// that index by an unknown string still typecheck.
const APPS_DEF = {
  about: {
    id: "about",
    title: "/about",
    icon: "◇",
    dock: true,
    launchpad: true,
    // Height bumped from 540 to 780 so the longer real bio and CTAs fit
    // without scrolling. Original prototype had 3 short bullet sentences.
    defaultRect: { x: 60, y: 90, w: 540, h: 780 },
  },
  projects: {
    id: "projects",
    title: "/projects",
    icon: "◈",
    dock: true,
    launchpad: true,
    defaultRect: { x: 640, y: 90, w: 480, h: 620 },
  },
  case: {
    id: "case",
    title: "/case_study/elijahos",
    icon: "★",
    dock: true,
    launchpad: true,
    defaultRect: { x: 220, y: 110, w: 720, h: 680 },
    mobileLabel: "case study",
  },
  resume: {
    id: "resume",
    title: "/resume",
    icon: "≡",
    dock: true,
    launchpad: true,
    defaultRect: { x: 100, y: 130, w: 480, h: 600 },
  },
  contact: {
    id: "contact",
    title: "/contact",
    icon: "✉",
    dock: true,
    launchpad: true,
    defaultRect: { x: 140, y: 120, w: 500, h: 650 },
  },
  zsh: {
    id: "zsh",
    title: "/zsh",
    icon: "_",
    dock: false,
    desktopOnly: true,
    launchpad: true,
    defaultRect: { x: 260, y: 180, w: 620, h: 460 },
  },
  ask: {
    id: "ask",
    title: "/ask-elijah",
    icon: "✦",
    dock: true,
    launchpad: true,
    defaultRect: { x: 300, y: 100, w: 520, h: 640 },
    mobileLabel: "ask",
  },
  // Release notes for the portfolio itself. Curated, forward-facing entries
  // (see src/lib/changelog.ts) — what shipped, improved, or got deprecated.
  changelog: {
    id: "changelog",
    title: "/changelog",
    // U+27F3 clockwise gapped circle arrow — reads as "revisions / updates"
    // and stays in the monochrome geometric glyph language of the other icons.
    icon: "⟳",
    dock: true,
    launchpad: true,
    defaultRect: { x: 240, y: 100, w: 560, h: 680 },
    mobileLabel: "changelog",
  },
  // Hidden until the /zsh puzzle is solved. Stays out of Launchpad.
  root: {
    id: "root",
    title: "/root/.real",
    icon: "◉",
    dock: false,
    desktopOnly: true,
    defaultRect: { x: 320, y: 140, w: 560, h: 520 },
  },
  // Agent workspace: the visible face of the WebMCP tool surface — visit
  // intent controls, the registered tool list, and the live agent activity
  // log. Useful without WebMCP too (manual intent-to-evidence comparison).
  agent: {
    id: "agent",
    title: "/agent",
    icon: "◫",
    dock: true,
    launchpad: true,
    defaultRect: { x: 360, y: 120, w: 560, h: 700 },
    mobileLabel: "agent",
  },
  calculator: {
    id: "calculator",
    title: "/calculator",
    icon: "=",
    dock: false,
    launchpad: true,
    defaultRect: { x: 200, y: 140, w: 280, h: 420 },
  },
  clock: {
    id: "clock",
    title: "/clock",
    icon: "◷",
    dock: false,
    launchpad: true,
    resizable: false,
    defaultRect: { x: 240, y: 160, w: 360, h: 420 },
  },
  snake: {
    id: "snake",
    title: "/snake",
    icon: "▰",
    dock: false,
    launchpad: true,
    defaultRect: { x: 280, y: 120, w: 480, h: 560 },
  },
} satisfies Record<string, AppDef>;

export type AppId = keyof typeof APPS_DEF;

export const APPS: Record<string, AppDef> = { ...APPS_DEF };

// Historical app ids that shipped in shared deep links (`?app=<id>`) before
// a rename. Resolution keeps those links working without keeping dead
// registry entries around.
export const APP_ID_ALIASES: Record<string, string> = {
  // "Recruiter workspace" became the agent workspace once the tool surface
  // outgrew its recruiting-only framing.
  recruiter: "agent",
};

// Canonical id for a requested app id: passes registry ids through and maps
// retired aliases to their current id. Unknown ids resolve to null.
export function resolveAppId(requested: string | null): string | null {
  if (!requested) return null;
  const id = APPS[requested] ? requested : APP_ID_ALIASES[requested];
  return id && APPS[id] ? id : null;
}

export function appDeepLink(id: string): string {
  return `/?app=${encodeURIComponent(id)}`;
}

// Sentinel ids for non-app dock entries. Imported by name so the dock
// matches by reference, not by string literal.
export const DOCK_SEP_ID = "__sep__";
export const LAUNCHPAD_BTN_ID = "__launchpad__";

// Glyph for the launchpad dock button. Square-lattice pattern reads as
// "grid / all apps" without needing iconography.
export const LAUNCHPAD_ICON = "▦";

// Left-to-right dock order, DERIVED from the `dock` flag in declaration order,
// then the custom controls. A new app appears in the dock just by setting
// `dock: true` on its entry above — no second edit site to keep in sync.
export const DOCK_ORDER: string[] = [
  ...Object.values(APPS)
    .filter((a) => a.dock)
    .map((a) => a.id),
  DOCK_SEP_ID,
  LAUNCHPAD_BTN_ID,
];

// Launchpad grid order, DERIVED from the `launchpad` flag in declaration
// order. A new app appears in Launchpad just by setting `launchpad: true`.
// `root` omits the flag, so it stays excluded by design.
export const LAUNCHPAD_ORDER: string[] = Object.values(APPS)
  .filter((a) => a.launchpad)
  .map((a) => a.id);

// Mobile shell — apps pinned to the bottom dock. Mirrors iPhone's 4-app dock
// pattern (locked across home pages; primary entry points only). These apps
// ALSO appear on the home grid so it fills the screen — the dock is the
// always-visible quick row, not an exclusive surface. Matches the order
// rendered LTR.
export const MOBILE_DOCK_ORDER: string[] = [
  "about",
  "projects",
  "ask",
  "contact",
];

// Apps to auto-open on desktop boot. Last id wins focus.
// Just About; the dock advertises the rest. Avoids a stack of
// overlapping windows greeting the user on every reload.
export const INITIAL_OPEN: string[] = ["about"];
