import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { AppId } from "@/lib/apps";

const APP_LOADERS = {
  about: () => import("./AboutApp").then((m) => m.AboutApp),
  projects: () => import("./ProjectsApp").then((m) => m.ProjectsApp),
  case: () => import("./CaseStudyApp").then((m) => m.CaseStudyApp),
  resume: () => import("./ResumeApp").then((m) => m.ResumeApp),
  contact: () => import("./ContactApp").then((m) => m.ContactApp),
  zsh: () => import("./TerminalApp").then((m) => m.TerminalApp),
  ask: () => import("./AskApp").then((m) => m.AskApp),
  root: () => import("./RootApp").then((m) => m.RootApp),
  calculator: () => import("./CalculatorApp").then((m) => m.CalculatorApp),
  clock: () => import("./ClockApp").then((m) => m.ClockApp),
  snake: () => import("./SnakeApp").then((m) => m.SnakeApp),
  changelog: () => import("./ChangelogApp").then((m) => m.ChangelogApp),
  agent: () =>
    import("./AgentWorkspaceApp").then((m) => m.AgentWorkspaceApp),
} satisfies Record<AppId, () => Promise<ComponentType>>;

const AboutApp = dynamic(APP_LOADERS.about, {
  ssr: false,
});
const ProjectsApp = dynamic(APP_LOADERS.projects, { ssr: false });
const CaseStudyApp = dynamic(APP_LOADERS.case, { ssr: false });
const ResumeApp = dynamic(APP_LOADERS.resume, { ssr: false });
const ContactApp = dynamic(APP_LOADERS.contact, { ssr: false });
const TerminalApp = dynamic(APP_LOADERS.zsh, { ssr: false });
const AskApp = dynamic(APP_LOADERS.ask, {
  ssr: false,
});
const RootApp = dynamic(APP_LOADERS.root, {
  ssr: false,
});
const CalculatorApp = dynamic(APP_LOADERS.calculator, { ssr: false });
const ClockApp = dynamic(APP_LOADERS.clock, {
  ssr: false,
});
const SnakeApp = dynamic(APP_LOADERS.snake, {
  ssr: false,
});
const ChangelogApp = dynamic(APP_LOADERS.changelog, {
  ssr: false,
});
const AgentWorkspaceApp = dynamic(APP_LOADERS.agent, { ssr: false });

// Internal map constrained via `satisfies Record<AppId, …>` so adding a
// new app id without registering its component (or vice versa) is a
// compile error. The exported alias widens the index signature so runtime
// callers that look up by an arbitrary `string` (e.g. WindowHost iterating
// over windows) typecheck cleanly and can rely on `undefined` for misses.
const APP_COMPONENTS_DEF = {
  about: AboutApp,
  projects: ProjectsApp,
  case: CaseStudyApp,
  resume: ResumeApp,
  contact: ContactApp,
  zsh: TerminalApp,
  ask: AskApp,
  root: RootApp,
  calculator: CalculatorApp,
  clock: ClockApp,
  snake: SnakeApp,
  changelog: ChangelogApp,
  agent: AgentWorkspaceApp,
} satisfies Record<AppId, ComponentType>;

export const APP_COMPONENTS: Record<string, ComponentType | undefined> = {
  ...APP_COMPONENTS_DEF,
};

export async function preloadAppComponent(id: string): Promise<void> {
  const coreLoader = APP_LOADERS[id as AppId];
  if (coreLoader) {
    await coreLoader();
  }
}
