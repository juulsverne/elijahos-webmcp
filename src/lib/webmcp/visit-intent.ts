// Visit intent — why this visitor (or their agent) is here, on their terms.
//
// Browser-local and session-scoped by default (AGENTS.md): sessionStorage
// only, never sent to a server, cleared by the visible Clear control, the
// visitor's agent, or the end of the tab session. `suppliedBy` records
// whether a human typed it or an agent called set_visit_intent, and the
// workspace displays that honestly.
//
// Intent text is UNTRUSTED data: capped, rendered only as plain text, and
// never merged into tool descriptions.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const OBJECTIVE_MAX = 280;
export const CONTEXT_LABEL_MAX = 80;
export const PRIORITY_MAX = 120;
export const PRIORITIES_MAX = 4;
export const EVIDENCE_STANDARD_MAX = 200;

export type VisitIntent = {
  objective: string;
  contextLabel: string | null;
  priorities: string[];
  evidenceStandard: string | null;
  suppliedBy: "visitor-agent" | "human";
  // When the intent was set (ISO). Display-only.
  setAt: string;
};

export type VisitIntentInput = {
  objective: string;
  contextLabel?: string | null;
  priorities?: string[];
  evidenceStandard?: string | null;
};

export function normalizeIntent(
  input: VisitIntentInput,
  suppliedBy: VisitIntent["suppliedBy"],
): VisitIntent {
  return {
    objective: input.objective.trim().slice(0, OBJECTIVE_MAX),
    contextLabel:
      input.contextLabel?.trim().slice(0, CONTEXT_LABEL_MAX) || null,
    priorities: (input.priorities ?? [])
      .map((p) => p.trim().slice(0, PRIORITY_MAX))
      .filter(Boolean)
      .slice(0, PRIORITIES_MAX),
    evidenceStandard:
      input.evidenceStandard?.trim().slice(0, EVIDENCE_STANDARD_MAX) || null,
    suppliedBy,
    setAt: new Date().toISOString(),
  };
}

// Deterministic parse of pasted free text (the human path): first line
// becomes the objective, bullet/numbered lines become priorities. No
// inference, so the visitor can predict exactly what was captured.
export function intentFromText(raw: string): VisitIntentInput {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { objective: "" };
  const bulletRe = /^([-*•·]|\d+[.)])\s+/;
  const bullets = lines
    .filter((l) => bulletRe.test(l))
    .map((l) => l.replace(bulletRe, "").trim());
  const objective = bulletRe.test(lines[0])
    ? lines[0].replace(bulletRe, "").trim()
    : lines[0];
  const priorities = bullets.length ? bullets : lines.slice(1);
  return { objective, priorities };
}

// Reconstructs the editable text form of a stored intent (objective line,
// then one bullet per priority) so the human Edit control round-trips.
export function intentToText(intent: VisitIntent): string {
  return [intent.objective, ...intent.priorities.map((p) => `- ${p}`)].join(
    "\n",
  );
}

type VisitIntentStore = {
  intent: VisitIntent | null;
  setIntent: (
    input: VisitIntentInput,
    suppliedBy: VisitIntent["suppliedBy"],
  ) => VisitIntent;
  clear: () => void;
};

// SSR / node tests have no sessionStorage; fall back to an inert store so
// importing this module is always safe.
function storage(): Storage {
  if (typeof window === "undefined" || !window.sessionStorage) {
    const memory = new Map<string, string>();
    return {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  }
  return window.sessionStorage;
}

export const useVisitIntentStore = create<VisitIntentStore>()(
  persist(
    (set) => ({
      intent: null,
      setIntent: (input, suppliedBy) => {
        const intent = normalizeIntent(input, suppliedBy);
        set({ intent });
        return intent;
      },
      clear: () => set({ intent: null }),
    }),
    {
      name: "elijahos.visit-intent.v1",
      storage: createJSONStorage(storage),
      partialize: (s) => ({ intent: s.intent }),
    },
  ),
);

export function getVisitIntent(): VisitIntent | null {
  return useVisitIntentStore.getState().intent;
}
