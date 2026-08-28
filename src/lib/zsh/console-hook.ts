// `window.__elijah` — the L4 "I see you, person who opened DevTools" hook.
//
// Registered when the /zsh terminal mounts (any environment, not just dev).
// Exists only after the terminal has been opened at least once in this
// session — gentle gate so the global namespace stays clean for visitors
// who never touched the puzzle surface.
//
// Surface:
//   window.__elijah.version     // "4.7.0"
//   window.__elijah.help()      // short usage string
//   window.__elijah.flags()     // { unlocked: boolean }
//   await window.__elijah.unlock("<password>")  // → true | false
//
// Calling unlock() with the right password fires the same store action the
// terminal's sudo flow uses, so the open terminal's `whoami` updates
// immediately (immutable Set semantics in desktop-store.ts make this safe).

import { useDesktopStore } from "@/lib/desktop-store";
import { ELIJAH } from "@/lib/elijah";
import { decryptPitch, verifyPassword } from "./crypto";

declare global {
  interface Window {
    __elijah?: ElijahHook;
  }
}

type ElijahHook = {
  version: string;
  help: () => string;
  flags: () => { unlocked: boolean };
  unlock: (code: string) => Promise<boolean>;
};

let installed = false;

export function installConsoleHook(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const hook: ElijahHook = {
    version: "4.7.0",
    help: () =>
      [
        `${ELIJAH.osSlug} console hook.`,
        "  flags()              { unlocked: boolean }",
        "  unlock(\"<code>\")     verify + unlock if correct",
      ].join("\n"),
    flags: () => ({
      unlocked: useDesktopStore.getState().hasUnlock("root.real"),
    }),
    unlock: async (code: string) => {
      const ok = await verifyPassword(code, ELIJAH.puzzle.passwordHash);
      if (!ok) return false;
      // Drive the same store action sudo uses so the open terminal's
      // `whoami` and any RootApp window flip state immediately.
      const pitch = await decryptPitch(
        code,
        ELIJAH.puzzle.pitchCiphertext,
        ELIJAH.puzzle.pitchIV,
      );
      if (!pitch) return false;
      const store = useDesktopStore.getState();
      store.unlock("root.real", code);
      store.open("root");
      return true;
    },
  };

  window.__elijah = hook;
}
