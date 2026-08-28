// Command registry for the /zsh terminal.
//
// Each handler is `(args, ctx) => Promise<CommandResult>`. Side effects flow
// through `ctx` so handlers stay testable and the terminal component stays
// the single source of UI truth.
//
// Handlers live in ./handlers/, completion in ./completion, types in ./types,
// helpers (mode/perm) in ./helpers, and man-page content in ./man-pages.

import { cat, cd, ls, pwd } from "./handlers/fs";
import {
  clear,
  echo,
  exitCmd,
  help,
  history,
  reset,
  theme,
  whoami,
} from "./handlers/shell";
import { man, openCmd, sudo } from "./handlers/sys";
import { buildCommandCompleter } from "./completion";
import type { CommandHandler } from "./types";

const registry: Record<string, CommandHandler> = {
  ls,
  cd,
  cat,
  pwd,
  echo,
  clear,
  history,
  help,
  whoami,
  exit: exitCmd,
  open: openCmd,
  theme,
  man,
  sudo,
  reset,
};

export function getCommand(name: string): CommandHandler | null {
  return registry[name] ?? null;
}

export const completeCommand = buildCommandCompleter(Object.keys(registry));

export type {
  CommandContext,
  CommandHandler,
  CommandResult,
  SudoPromptHandle,
} from "./types";

export {
  completeApp,
  completeMan,
  completePath,
  completeTheme,
  publicCommandNames,
} from "./completion";
