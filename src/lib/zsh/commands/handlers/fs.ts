import { listDir, normalizePath, readFile, walk } from "../../fs";
import {
  groupFor,
  isRootPath,
  listUnlockedRootDir,
  modeFor,
  ownerFor,
  sizeFor,
} from "../helpers";
import type { CommandHandler } from "../types";

export const ls: CommandHandler = async (args, ctx) => {
  // Parse flags. Combined (-la) and separate (-l -a) both work.
  const flags = new Set<string>();
  const targets: string[] = [];
  for (const a of args) {
    if (a.startsWith("-")) {
      for (const ch of a.slice(1)) flags.add(ch);
    } else {
      targets.push(a);
    }
  }
  const showLong = flags.has("l");
  const showAll = flags.has("a");

  const lines: string[] = [];
  for (const target of targets.length > 0 ? targets : [ctx.cwd]) {
    const path = normalizePath(ctx.cwd, target);

    // Honor /root permission unless puzzle is unlocked.
    if (isRootPath(path) && !ctx.hasUnlock("root.real")) {
      const result = listDir(ctx.fs, path);
      if (result.kind === "denied" || result.kind === "ok") {
        lines.push(`ls: cannot open directory '${target}': Permission denied`);
        continue;
      }
    }

    const result =
      isRootPath(path) && ctx.hasUnlock("root.real")
        ? (listUnlockedRootDir(ctx.fs, path) ?? listDir(ctx.fs, path))
        : listDir(ctx.fs, path);
    if (result.kind === "missing") {
      lines.push(`ls: cannot access '${target}': No such file or directory`);
      continue;
    }
    if (result.kind === "is-file") {
      // ls of a file just prints the file name (POSIX-ish).
      lines.push(target);
      continue;
    }
    if (result.kind === "denied") {
      lines.push(`ls: cannot open directory '${target}': Permission denied`);
      continue;
    }

    let entries = result.entries;
    if (!showAll) entries = entries.filter((e) => !e.name.startsWith("."));

    if (!showLong) {
      lines.push(entries.map((e) => e.name).join("  ") || "");
      continue;
    }

    lines.push(`total ${entries.length}`);
    for (const e of entries) {
      const m = modeFor(e.node);
      const o = ownerFor(e.node).padEnd(8);
      const g = groupFor(e.node).padEnd(8);
      const sz = String(sizeFor(e.node)).padStart(5);
      lines.push(`${m} 1 ${o} ${g} ${sz} Apr 28 03:14 ${e.name}`);
    }
  }
  return { output: lines };
};

export const cd: CommandHandler = async (args, ctx) => {
  const target = args[0] ?? "~";
  if (target === "-") {
    // We don't track OLDPWD; just no-op with a friendly note.
    return { output: ["cd: OLDPWD not set"] };
  }
  const path = normalizePath(ctx.cwd, target);

  if (isRootPath(path) && !ctx.hasUnlock("root.real")) {
    return { output: [`cd: ${target}: Permission denied`] };
  }

  const node = walk(ctx.fs, path);
  if (!node) return { output: [`cd: ${target}: No such file or directory`] };
  if (node.kind !== "dir") return { output: [`cd: ${target}: Not a directory`] };
  if (node.perm === "denied" && !(isRootPath(path) && ctx.hasUnlock("root.real"))) {
    return { output: [`cd: ${target}: Permission denied`] };
  }

  ctx.setCwd(path);
  return {};
};

export const cat: CommandHandler = async (args, ctx) => {
  if (args.length === 0) {
    return { output: ["cat: missing operand"] };
  }
  const lines: string[] = [];
  for (const target of args) {
    const path = normalizePath(ctx.cwd, target);

    // Special case: /root/.real post-unlock. Try to decrypt with the
    // session password; if missing, instruct the user to re-auth.
    if (path === "/root/.real" && ctx.hasUnlock("root.real")) {
      if (!ctx.sessionPassword) {
        lines.push(
          `cat: ${target}: session credentials cleared. run 'sudo cat /root/.real' to re-authenticate.`,
        );
        continue;
      }
      const pitch = await ctx.decryptPitch(ctx.sessionPassword);
      if (!pitch) {
        lines.push(`cat: ${target}: decryption failed.`);
        continue;
      }
      lines.push(...pitch);
      continue;
    }

    if (isRootPath(path) && !ctx.hasUnlock("root.real")) {
      lines.push(`cat: ${target}: Permission denied`);
      continue;
    }

    const result = readFile(ctx.fs, path);
    if (result.kind === "missing") {
      lines.push(`cat: ${target}: No such file or directory`);
    } else if (result.kind === "is-dir") {
      lines.push(`cat: ${target}: Is a directory`);
    } else if (result.kind === "denied") {
      lines.push(`cat: ${target}: Permission denied`);
    } else {
      // Strip a single trailing newline so we don't print a blank line at
      // the end of every file.
      const text = result.text.endsWith("\n") ? result.text.slice(0, -1) : result.text;
      lines.push(...text.split("\n"));
    }
  }
  return { output: lines };
};

export const pwd: CommandHandler = async (_args, ctx) => ({ output: [ctx.cwd] });
