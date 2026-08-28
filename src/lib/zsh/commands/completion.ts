import { APPS } from "@/lib/apps";
import { listDir, normalizePath, type FsNode } from "../fs";
import {
  isRootPath,
  listUnlockedRootDir,
  PUBLIC_COMMANDS,
  VALID_THEMES,
} from "./helpers";
import { MAN_PAGES } from "./man-pages";
import type { CommandContext } from "./types";

type CompletionDir =
  | { kind: "ok"; entries: { name: string; node: FsNode }[] }
  | null;

export function buildCommandCompleter(commandNames: readonly string[]) {
  const sorted = [...commandNames].sort();
  return function completeCommand(prefix: string): string[] {
    return sorted.filter((n) => n.startsWith(prefix));
  };
}

function listCompletableDir(ctx: CommandContext, path: string): CompletionDir {
  if (isRootPath(path)) {
    if (!ctx.hasUnlock("root.real")) return null;
    return listUnlockedRootDir(ctx.fs, path);
  }

  const result = listDir(ctx.fs, path);
  return result.kind === "ok" ? result : null;
}

// Tab-complete a path argument relative to cwd.
export function completePath(prefix: string, ctx: CommandContext): string[] {
  // Split prefix into directory portion and partial filename.
  const slash = prefix.lastIndexOf("/");
  const dirPart = slash >= 0 ? prefix.slice(0, slash + 1) : "";
  const namePart = slash >= 0 ? prefix.slice(slash + 1) : prefix;

  const baseAbs = dirPart
    ? normalizePath(ctx.cwd, dirPart || ".")
    : ctx.cwd;

  const result = listCompletableDir(ctx, baseAbs);
  if (!result) return [];

  return result.entries
    .filter((e) => e.name.startsWith(namePart))
    // Hide hidden files unless the user has typed at least a leading '.'.
    .filter((e) => namePart.startsWith(".") || !e.name.startsWith("."))
    .map((e) => dirPart + e.name + (e.node.kind === "dir" ? "/" : ""));
}

// Tab-complete an `open` argument against APPS ids — filtered to dock-visible
// or already-unlocked entries.
export function completeApp(prefix: string, ctx: CommandContext): string[] {
  const stripped = prefix.startsWith("/") ? prefix.slice(1) : prefix;
  const lead = prefix.startsWith("/") ? "/" : "";
  return Object.values(APPS)
    .filter((a) => a.dock || ctx.hasUnlock(`${a.id}.real`))
    .map((a) => a.id)
    .filter((id) => id.startsWith(stripped))
    .map((id) => lead + id)
    .sort();
}

export function completeTheme(prefix: string): string[] {
  return VALID_THEMES.filter((t) => t.startsWith(prefix));
}

export function completeMan(prefix: string, ctx: CommandContext): string[] {
  const topics = Object.keys(MAN_PAGES);
  if (ctx.hasUnlock("root.real")) topics.push("root");
  return topics.filter((t) => t.startsWith(prefix)).sort();
}

export function publicCommandNames(): string[] {
  return PUBLIC_COMMANDS.map((c) => c.name);
}
