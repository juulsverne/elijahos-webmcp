import { PUBLIC_COMMANDS, VALID_THEMES, type ThemeName } from "../helpers";
import type { CommandHandler } from "../types";

export const echo: CommandHandler = async (args, ctx) => {
  const expand = (token: string): string => {
    return token
      .replace(/\$USER\b/g, ctx.hasUnlock("root.real") ? "elijah" : "guest")
      .replace(/\$HOME\b/g, "/home/guest")
      .replace(/\$PWD\b/g, ctx.cwd)
      .replace(/\$SHELL\b/g, "/bin/zsh");
  };
  return { output: [args.map(expand).join(" ")] };
};

export const clear: CommandHandler = async () => ({ clear: true });

export const history: CommandHandler = async (_args, ctx) => {
  // Print numbered history (sudo password lines are already excluded
  // upstream when they were typed, so this is safe to dump verbatim).
  const lines = ctx.history.map((cmd, i) => `  ${String(i + 1).padStart(3, " ")}  ${cmd}`);
  return { output: lines };
};

export const help: CommandHandler = async () => {
  const lines: string[] = ["Available commands:"];
  for (const c of PUBLIC_COMMANDS) {
    lines.push(`  ${c.name.padEnd(8)}  ${c.desc}`);
  }
  lines.push("");
  lines.push("Standard shell tools (ls, cd, cat, pwd, echo, clear, history) work as expected.");
  return { output: lines };
};

export const whoami: CommandHandler = async (_args, ctx) => ({
  output: [ctx.hasUnlock("root.real") ? "elijah" : "guest"],
});

export const exitCmd: CommandHandler = async (_args, ctx) => {
  ctx.closeTerminal();
  return { exit: true };
};

export const theme: CommandHandler = async (args, ctx) => {
  const name = args[0];
  if (!name) {
    return { output: [`theme: usage: theme <${VALID_THEMES.join("|")}>`] };
  }
  if (!VALID_THEMES.includes(name as ThemeName)) {
    return { output: [`theme: '${name}' is not one of ${VALID_THEMES.join(", ")}`] };
  }
  ctx.setTheme(name);
  return { output: [`theme set to ${name}`] };
};

export const reset: CommandHandler = async (_args, ctx) => {
  ctx.clearUnlocks();
  return { output: ["[ok] state cleared. reload to start over."] };
};
