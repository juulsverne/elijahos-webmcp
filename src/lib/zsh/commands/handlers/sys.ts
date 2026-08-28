import { APPS } from "@/lib/apps";
import { MAN_PAGES } from "../man-pages";
import type { CommandHandler, SudoPromptHandle } from "../types";
import { cat } from "./fs";

// `open <app>` — opens a window, tolerates leading-slash aliases,
// hides `root` from listing/completion until unlocked.
export const openCmd: CommandHandler = async (args, ctx) => {
  const raw = args[0];
  if (!raw) return { output: ["open: missing app name"] };
  // Tolerate `open /about` as alias for `open about`.
  const id = raw.startsWith("/") ? raw.slice(1) : raw;

  const app = APPS[id];
  if (!app) return { output: [`open: ${raw}: not found`] };

  // root is hidden until the puzzle is solved.
  if (id === "root" && !ctx.hasUnlock("root.real")) {
    return { output: [`open: ${raw}: not found`] };
  }

  ctx.openWindow(id);
  return { output: [`opening ${app.title}…`] };
};

export const man: CommandHandler = async (args, ctx) => {
  const topic = args[0];
  if (!topic) return { output: ["What manual page do you want? (try `man elijah`)"] };

  // root is hidden until unlocked.
  if (topic === "root" && !ctx.hasUnlock("root.real")) {
    return { output: [`No manual entry for ${topic}`] };
  }
  if (topic === "root") {
    return {
      output: [
        "ROOT(1)",
        "    privileged user. /root/.real holds the candid pitch.",
        "    use the email button on /root/.real to reach elijah directly.",
      ],
    };
  }

  const page = MAN_PAGES[topic];
  if (!page) return { output: [`No manual entry for ${topic}`] };
  return { output: page };
};

// sudo — the puzzle gate. Only `sudo cat /root/.real` triggers the password
// flow. Other sudo invocations get a "this incident will be reported" line.
export const sudo: CommandHandler = async (args, ctx) => {
  if (args.length === 0) {
    return { output: ["sudo: a command is required"] };
  }
  // Already unlocked? Just run the inner command without prompting.
  if (ctx.hasUnlock("root.real") && args[0] === "cat" && args[1] === "/root/.real") {
    return cat([args[1]], ctx);
  }
  // Only `sudo cat /root/.real` opens the prompt. Everything else is rejected.
  if (args[0] !== "cat" || args[1] !== "/root/.real") {
    return {
      output: [
        "Sorry, user guest is not allowed to execute that as root.",
        "This incident will be reported.",
      ],
    };
  }

  let attempts = 0;
  const buildPrompt = (): SudoPromptHandle => ({
    message: "[sudo] password for guest:",
    masked: true,
    onSubmit: async (pw) => {
      attempts++;
      const ok = await ctx.verifyPassword(pw);
      if (!ok) {
        if (attempts >= 3) {
          return {
            output: ["Sorry, try again.", "sudo: 3 incorrect password attempts"],
          };
        }
        return {
          output: ["Sorry, try again."],
          prompt: buildPrompt(),
        };
      }

      const pitch = await ctx.decryptPitch(pw);
      if (!pitch) {
        return {
          output: ["[err] verification ok but decryption failed. report to elijah."],
        };
      }
      ctx.unlock("root.real", pw);
      ctx.openWindow("root");
      return {
        output: [
          "[ok] access granted.",
          "",
          ...pitch,
          "",
          "→ /root/.real opened. (use the email button — subject is pre-filled.)",
        ],
      };
    },
  });

  return { prompt: buildPrompt() };
};
