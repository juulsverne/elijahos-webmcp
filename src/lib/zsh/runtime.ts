// Shell runtime utilities.
//
// Pure functions only — no state, no React. The TerminalApp component owns
// command history and the line buffer; runtime exposes the parsing,
// completion, and reflex-matching primitives the component composes.
//
// Parser is intentionally minimal: split on `&&`, then on whitespace. No
// quote handling, no escapes, no pipes, no redirects, no globs. Writing a
// robust shell tokenizer is a tar pit and the puzzle doesn't require any
// of those features.

export type ParsedCommand = string[]; // [command, ...args]
export type ParsedLine = ParsedCommand[]; // chained via &&

// Split an input line into one or more commands. Empty / whitespace-only
// commands are dropped.
export function parseInput(line: string): ParsedLine {
  return line
    .split(/\s*&&\s*/)
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0)
    .map((cmd) => cmd.split(/\s+/));
}

// Longest common prefix among a set of strings — used for tab completion
// when multiple candidates share an initial run.
export function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  if (strs.length === 1) return strs[0];
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}

// Find the start index of the last whitespace-separated word in `input`.
// Used by tab completion to know what slice to replace.
export function lastWordStart(input: string): number {
  const m = /\S*$/.exec(input);
  return m ? m.index : input.length;
}

// Replace the trailing word of `input` with `replacement`. Adds a trailing
// space if `appendSpace` is true (we add it on a fully-resolved completion
// but not when the completion is itself a directory whose user might want
// to keep typing — caller decides).
export function replaceLastWord(
  input: string,
  replacement: string,
  appendSpace: boolean,
): string {
  const start = lastWordStart(input);
  const head = input.slice(0, start);
  return head + replacement + (appendSpace ? " " : "");
}

// L5 reflex moments — matched by the parser layer before commands execute.
// Order matters: rmRfRoot is a strict subset of rm-anything, so we test
// the most specific patterns first.

export function isRmRfRoot(line: string): boolean {
  // Catches: `rm -rf /`, `rm -fr /`, `rm -rf /*`, `rm -rf ~`, `rm -rf .`,
  // `sudo rm -rf /`, etc. Not exhaustive — any reasonable variant a hacker
  // would type for the joke.
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens[0] === "sudo") tokens.shift();
  if (tokens.shift() !== "rm") return false;

  let sawRecursiveOrForce = false;
  while (tokens[0]?.startsWith("-")) {
    const flag = tokens.shift() ?? "";
    if (!/^-[rf]+$/.test(flag)) return false;
    sawRecursiveOrForce = true;
  }

  if (!sawRecursiveOrForce || tokens.length !== 1) return false;
  return tokens[0] === "/" || tokens[0] === "/*" || tokens[0] === "~" || tokens[0] === ".";
}

export function isInjectionAttempt(line: string): boolean {
  // Common XSS / SQL-injection shapes. We don't actually parse them — we
  // just detect the *attempt* and acknowledge it.
  if (/<script[\s>]/i.test(line)) return true;
  if (/\bjavascript:/i.test(line)) return true;
  if (/('|")\s*OR\s+(['"]?)1\1?\s*=\s*\1?1\1?/i.test(line)) return true;
  if (/--\s*$/.test(line) && /['"]/.test(line)) return true;
  return false;
}

// Glitch-text generator for the rm-rf wink. Produces a short stream of
// fake "deleting" lines that look destructive but mutate nothing.
export function rmRfGlitchOutput(): string[] {
  return [
    "rm: removing /etc/passwd",
    "rm: removing /etc/shadow",
    "rm: removing /home/guest",
    "rm: removing /var/log/auth.log",
    "rm: removing /root/.real",
    "rm: removing /",
    "[denied] kernel: nice try",
  ];
}
