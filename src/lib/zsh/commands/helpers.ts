import { walk, type FsDir, type FsNode } from "../fs";

export const PUBLIC_COMMANDS: readonly { name: string; desc: string }[] = [
  { name: "open", desc: "open a window (about, projects, ask, …)" },
  { name: "theme", desc: "change appearance (default, mono, phosphor, paper)" },
  { name: "whoami", desc: "identify yourself" },
  { name: "man", desc: "show manual page (try: man elijah)" },
  { name: "exit", desc: "close this terminal" },
];

export const VALID_THEMES = ["default", "mono", "phosphor", "paper"] as const;
export type ThemeName = (typeof VALID_THEMES)[number];

// Returns true if `path` is /root or any descendant of /root.
export function isRootPath(path: string): boolean {
  return path === "/root" || path.startsWith("/root/");
}

export function listUnlockedRootDir(
  root: FsDir,
  path: string,
): { kind: "ok"; entries: { name: string; node: FsNode }[] } | null {
  const node = walk(root, path);
  if (!node || node.kind !== "dir") return null;
  return {
    kind: "ok",
    entries: Object.keys(node.children)
      .sort()
      .map((name) => ({ name, node: node.children[name]! })),
  };
}

// Default permission display for a node.
export function modeFor(node: FsNode): string {
  if (node.mode) return node.mode;
  if (node.kind === "dir") return "drwxr-xr-x";
  return "-rw-r--r--";
}

export function ownerFor(node: FsNode): string {
  return node.owner ?? "guest";
}

export function groupFor(node: FsNode): string {
  return node.group ?? "guest";
}

export function sizeFor(node: FsNode): number {
  if (node.kind === "dir") return 4096;
  if (node.size != null) return node.size;
  const text =
    typeof node.content === "function" ? node.content() : node.content;
  return text.length;
}
