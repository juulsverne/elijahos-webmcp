"use client";

// TerminalApp — the interactive /zsh shell.
//
// Owns the rendered line buffer, the input field, history, and the sudo
// prompt-mode state machine. Delegates parsing + command execution to
// `lib/zsh/*`. The component intentionally rebuilds CommandContext fresh
// on each command run so post-unlock state changes (from the DevTools
// console hook, for example) are reflected immediately.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ELIJAH } from "@/lib/elijah";
import { useDesktopStore } from "@/lib/desktop-store";
import { buildFs, readFile } from "@/lib/zsh/fs";
import {
  isInjectionAttempt,
  isRmRfRoot,
  lastWordStart,
  longestCommonPrefix,
  parseInput,
  replaceLastWord,
  rmRfGlitchOutput,
} from "@/lib/zsh/runtime";
import {
  type CommandContext,
  type CommandResult,
  type SudoPromptHandle,
  completeApp,
  completeCommand,
  completeMan,
  completePath,
  completeTheme,
  getCommand,
} from "@/lib/zsh/commands";
import { decryptPitch, verifyPassword } from "@/lib/zsh/crypto";
import { installConsoleHook } from "@/lib/zsh/console-hook";

type TerminalLineKind = "input" | "output" | "system";
type TerminalLine = { id: number; kind: TerminalLineKind; text: string };
type TerminalMode = { kind: "normal" } | { kind: "sudo"; prompt: SudoPromptHandle };

const HISTORY_LIMIT = 100;

function promptString(cwd: string): string {
  const home = cwd === "/home/guest" ? "~" : cwd.replace(/^\/home\/guest/, "~");
  return `guest@${ELIJAH.osSlug} ${home} %`;
}

// Decide what kind of completion candidates apply to the trailing word of
// `input`, then return the new input value (LCP-extended), the candidate
// list to display when the LCP can't extend further, or null if no match.
function computeCompletion(
  input: string,
  ctx: CommandContext,
):
  | { kind: "extend"; newInput: string }
  | { kind: "candidates"; list: string[] }
  | null {
  const start = lastWordStart(input);
  const partial = input.slice(start);
  const head = input.slice(0, start).trim();

  let candidates: string[];
  if (head === "") {
    candidates = completeCommand(partial);
  } else if (/(?:^|\s)open$/.test(head)) {
    candidates = completeApp(partial, ctx);
  } else if (/(?:^|\s)theme$/.test(head)) {
    candidates = completeTheme(partial);
  } else if (/(?:^|\s)man$/.test(head)) {
    candidates = completeMan(partial, ctx);
  } else {
    candidates = completePath(partial, ctx);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    const candidate = candidates[0];
    return {
      kind: "extend",
      newInput: replaceLastWord(input, candidate, !candidate.endsWith("/")),
    };
  }
  const lcp = longestCommonPrefix(candidates);
  if (lcp.length > partial.length) {
    return { kind: "extend", newInput: replaceLastWord(input, lcp, false) };
  }
  return { kind: "candidates", list: candidates };
}

export function TerminalApp() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("/home/guest");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mode, setMode] = useState<TerminalMode>({ kind: "normal" });

  const lineIdRef = useRef(0);
  const motdPrintedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // FS is built once with a closure over live unlock state — `cat /etc/motd`
  // will reflect the current state at read time even though buildFs ran once.
  const fs = useMemo(
    () => buildFs(() => useDesktopStore.getState().hasUnlock("root.real")),
    [],
  );

  const pushLines = useCallback(
    (batch: Array<{ kind: TerminalLineKind; text: string }>) => {
      setLines((prev) => {
        const next = prev.slice();
        for (const item of batch) {
          next.push({ id: ++lineIdRef.current, ...item });
        }
        return next;
      });
    },
    [],
  );

  // Print MOTD on first mount + register the DevTools console hook so the
  // L4 surface is available to anyone who pops open Sources.
  //
  // Guarded by a ref so the banner is printed exactly once: React StrictMode
  // runs mount effects twice in development (setup → cleanup → setup), which
  // would otherwise duplicate the entire MOTD block in the buffer.
  useEffect(() => {
    if (motdPrintedRef.current) return;
    motdPrintedRef.current = true;
    installConsoleHook();
    const motd = readFile(fs, "/etc/motd");
    if (motd.kind === "ok") {
      pushLines(
        motd.text.split("\n").map((t) => ({ kind: "system" as const, text: t })),
      );
    }
  }, [fs, pushLines]);

  const buildCtx = useCallback((): CommandContext => {
    const store = useDesktopStore.getState();
    return {
      cwd,
      setCwd,
      fs,
      history,
      hasUnlock: (id) => store.hasUnlock(id),
      unlock: (id, pw) => store.unlock(id, pw),
      clearUnlocks: () => store.clearUnlocks(),
      sessionPassword: store.sessionPassword,
      openWindow: (id) => store.open(id),
      closeTerminal: () => store.close("zsh"),
      setTheme: (name) => {
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", name);
        }
      },
      verifyPassword: (pw) => verifyPassword(pw, ELIJAH.puzzle.passwordHash),
      decryptPitch: (pw) =>
        decryptPitch(pw, ELIJAH.puzzle.pitchCiphertext, ELIJAH.puzzle.pitchIV),
    };
  }, [cwd, fs, history]);

  const renderResult = useCallback(
    (result: CommandResult) => {
      if (result.clear) {
        setLines([]);
      }
      if (result.output && result.output.length > 0) {
        pushLines(result.output.map((t) => ({ kind: "output" as const, text: t })));
      }
      if (result.prompt) {
        setMode({ kind: "sudo", prompt: result.prompt });
        pushLines([{ kind: "system", text: result.prompt.message }]);
      }
    },
    [pushLines],
  );

  const runLine = useCallback(
    async (raw: string) => {
      pushLines([{ kind: "input", text: `${promptString(cwd)} ${raw}` }]);

      // Push to history (skip empty lines and duplicates of the previous line).
      const trimmed = raw.trim();
      if (trimmed.length > 0 && history[history.length - 1] !== raw) {
        setHistory((h) => [...h, raw].slice(-HISTORY_LIMIT));
      }
      setHistoryIndex(-1);

      // L5 reflex moments — match before parsing so they catch even when the
      // input doesn't tokenize cleanly.
      if (isRmRfRoot(raw)) {
        pushLines(
          rmRfGlitchOutput().map((t) => ({ kind: "output" as const, text: t })),
        );
        return;
      }
      if (isInjectionAttempt(raw)) {
        pushLines([
          { kind: "output", text: "[parser] yeah, i see what you tried there. respect." },
        ]);
        return;
      }

      const chain = parseInput(raw);
      if (chain.length === 0) return;

      for (const cmd of chain) {
        const [name, ...args] = cmd;
        if (!name) continue;
        const handler = getCommand(name);
        if (!handler) {
          pushLines([{ kind: "output", text: `zsh: command not found: ${name}` }]);
          return; // && short-circuits on failure
        }
        try {
          const result = await handler(args, buildCtx());
          renderResult(result);
          if (result.prompt) return; // sudo flow takes over until resolved
          if (result.exit) return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          pushLines([{ kind: "output", text: `zsh: error: ${msg}` }]);
          return;
        }
      }
    },
    [cwd, history, buildCtx, renderResult, pushLines],
  );

  const submit = useCallback(async () => {
    const value = input;
    setInput("");

    if (mode.kind === "sudo") {
      // Real sudo doesn't echo — clear input, run the prompt's onSubmit,
      // and let renderResult handle whatever comes back (success, retry,
      // or final failure).
      const handle = mode.prompt;
      setMode({ kind: "normal" });
      try {
        const result = await handle.onSubmit(value);
        renderResult(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        pushLines([{ kind: "output", text: `sudo: error: ${msg}` }]);
      }
      return;
    }

    await runLine(value);
  }, [input, mode, renderResult, runLine, pushLines]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      // Ctrl+L — clear buffer
      if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        setLines([]);
        return;
      }
      // Ctrl+C — interrupt
      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        if (mode.kind === "sudo") {
          pushLines([{ kind: "system", text: "^C" }]);
          setMode({ kind: "normal" });
        } else {
          pushLines([{ kind: "input", text: `${promptString(cwd)} ${input}^C` }]);
        }
        setInput("");
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        void submit();
        return;
      }

      if (mode.kind !== "normal") return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(next);
        setInput(history[next] ?? "");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex < 0) return;
        const next = historyIndex + 1;
        if (next >= history.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(next);
          setInput(history[next] ?? "");
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const completion = computeCompletion(input, buildCtx());
        if (!completion) return;
        if (completion.kind === "extend") {
          setInput(completion.newInput);
        } else {
          // Show candidates inline; keep the input intact.
          pushLines([
            { kind: "input", text: `${promptString(cwd)} ${input}` },
            { kind: "output", text: completion.list.join("  ") },
          ]);
        }
      }
    },
    [history, historyIndex, input, mode, cwd, buildCtx, submit, pushLines],
  );

  // Auto-scroll to bottom whenever the buffer grows.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // Auto-focus on mount and on click anywhere in the body.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const promptVisible = mode.kind === "normal";

  return (
    <div
      ref={scrollerRef}
      className="terminal-app"
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line) => (
        <div key={line.id} className={`terminal-line terminal-line-${line.kind}`}>
          {line.text || " "}
        </div>
      ))}
      <div className="terminal-input-row">
        {promptVisible && (
          <span className="terminal-prompt">{promptString(cwd)}</span>
        )}
        <input
          ref={inputRef}
          className="terminal-input"
          type={mode.kind === "sudo" ? "password" : "text"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          aria-label={mode.kind === "sudo" ? "sudo password" : "terminal input"}
        />
      </div>
    </div>
  );
}
