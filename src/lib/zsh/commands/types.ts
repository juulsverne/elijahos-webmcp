import type { FsDir } from "../fs";

export type SudoPromptHandle = {
  message: string;
  // True so the terminal masks input echo and excludes the line from history.
  masked: boolean;
  onSubmit: (input: string) => Promise<CommandResult>;
};

export type CommandResult = {
  output?: string[];
  // Wipe the rendered line buffer (Ctrl+L equivalent).
  clear?: boolean;
  // Close the terminal window.
  exit?: boolean;
  // Initiate an interactive prompt (sudo password).
  prompt?: SudoPromptHandle;
};

export type CommandContext = {
  cwd: string;
  setCwd: (cwd: string) => void;
  fs: FsDir;
  history: string[];
  // Unlock state — read reactively so post-unlock commands behave differently.
  hasUnlock: (id: string) => boolean;
  unlock: (id: string, password?: string) => void;
  clearUnlocks: () => void;
  // The session password used to decrypt /root/.real on demand. Null after
  // a reload (intentionally not persisted). cat /root/.real falls back to
  // a "use sudo to re-auth" message when null.
  sessionPassword: string | null;
  // Window-system passthrough.
  openWindow: (id: string) => void;
  closeTerminal: () => void;
  // Theme passthrough.
  setTheme: (name: string) => void;
  // Crypto passthrough.
  verifyPassword: (pw: string) => Promise<boolean>;
  decryptPitch: (pw: string) => Promise<string[] | null>;
};

export type CommandHandler = (
  args: string[],
  ctx: CommandContext,
) => Promise<CommandResult>;
