"use client";

// RootApp — the unlocked /root/.real window. Self-guarding: even if opened
// directly via `useDesktopStore.getState().open("root")`, it renders a
// permission-denied placeholder unless `unlocks.has("root.real")` is true.
//
// On unlock, decrypts the candid pitch using the in-memory session password.
// After a reload (sessionPassword cleared but unlocks persisted), it falls
// back to ELIJAH.__DEV_PLAINTEXT_PITCH__ if defined, otherwise prompts the
// user to re-auth via the terminal.

import { useEffect, useState } from "react";
import { ELIJAH } from "@/lib/elijah";
import { APPS } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";
import { useDesktopStore } from "@/lib/desktop-store";
import { decryptPitch } from "@/lib/zsh/crypto";
import { mailtoFor } from "./contact-helpers";

export function RootApp() {
  const hasUnlock = useDesktopStore((s) => s.hasUnlock("root.real"));
  const sessionPassword = useDesktopStore((s) => s.sessionPassword);
  // Async decryption result. Set only inside the async .then() so we never
  // synchronously setState inside an effect body — the React 19 lint
  // (react-hooks/set-state-in-effect) catches that. All synchronous derived
  // values come from `fallbackPitch` / `fallbackError` below.
  const [decrypted, setDecrypted] = useState<{
    pitch: string[] | null;
    error: string | null;
  }>({ pitch: null, error: null });

  useEffect(() => {
    if (!hasUnlock || !sessionPassword) return;
    let cancelled = false;
    decryptPitch(
      sessionPassword,
      ELIJAH.puzzle.pitchCiphertext,
      ELIJAH.puzzle.pitchIV,
    ).then((result) => {
      if (cancelled) return;
      if (result) {
        setDecrypted({ pitch: result, error: null });
      } else {
        setDecrypted({ pitch: null, error: "decryption failed." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasUnlock, sessionPassword]);

  // Synchronous fallbacks for the post-reload case (sessionPassword cleared
  // but `unlocks` persisted). Plain derivation — no state, no effects.
  const fallbackPitch =
    hasUnlock && !sessionPassword
      ? ELIJAH.__DEV_PLAINTEXT_PITCH__ ?? null
      : null;
  const fallbackError =
    hasUnlock && !sessionPassword && !ELIJAH.__DEV_PLAINTEXT_PITCH__
      ? "session credentials cleared. open /zsh and run 'sudo cat /root/.real' to re-decrypt."
      : null;
  // hasUnlock=false masks any stale decrypted state from a prior session.
  const pitch = hasUnlock ? decrypted.pitch ?? fallbackPitch : null;
  const error = hasUnlock ? decrypted.error ?? fallbackError : null;

  const mailtoHref = mailtoFor(ELIJAH.contact, `Re: ${APPS.root.title}`);

  if (!hasUnlock) {
    return (
      <div className="root-app root-app-denied">
        <pre className="root-app-deny-line">{UI_COPY.root.deniedLine}</pre>
        <p className="root-app-hint">{UI_COPY.root.deniedHint}</p>
      </div>
    );
  }

  return (
    <div className="root-app">
      <header className="root-app-head">
        <span className="app-kicker">{APPS.root.title}</span>
        <h1 className="root-app-title serif-i">{UI_COPY.root.title}</h1>
      </header>
      <div className="root-app-pitch">
        {error && <p className="root-app-error">{error}</p>}
        {pitch?.map((line, i) => (
          <p key={i} className="root-app-line">
            {line || " "}
          </p>
        ))}
      </div>
      <div className="root-app-actions">
        <a className="btn btn-primary" href={mailtoHref}>
          {UI_COPY.root.compose}
        </a>
      </div>
    </div>
  );
}
