// Canonical, crawlable document routes. These are deliberately separate from
// APPS.*.title: app titles are window chrome and may change cosmetically,
// while public URLs are stable navigation and indexing contracts.

export const PUBLIC_ROUTES = {
  home: "/",
  about: "/about",
  projects: "/projects",
  resume: "/resume",
  llms: "/llms.txt",
} as const;

export function projectRoute(id: string): string {
  return `${PUBLIC_ROUTES.projects}/${encodeURIComponent(id)}`;
}

export function aboutAnswerRoute(id: string): string {
  return `${PUBLIC_ROUTES.about}#${encodeURIComponent(id)}`;
}
