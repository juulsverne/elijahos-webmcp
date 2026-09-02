import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useDesktopStore } from "@/lib/desktop-store";
import { ELIJAH } from "@/lib/elijah";
import { EVIDENCE_RECORDS } from "@/lib/evidence";
import { useToolActivityStore } from "./activity";
import type { ModelContextLike, WebMCPTool } from "./model-context";
import {
  __resetRegistrationForTests,
  executeTool,
  registerWebMCPTools,
} from "./register";
import { useVisitIntentStore } from "./visit-intent";
import { useCompositionStore } from "./workspace";
import { WEBMCP_TOOLS, getToolDef } from "./tools";

const CORE_TOOLS = [
  "set_visit_intent",
  "search_evidence",
  "inspect_evidence",
  "compose_workspace",
  "get_workspace_state",
];

function run(name: string, input: unknown = {}): Record<string, unknown> {
  const tool = getToolDef(name);
  assert.ok(tool, `tool ${name} exists`);
  return executeTool(tool, input) as Record<string, unknown>;
}

beforeEach(() => {
  useVisitIntentStore.getState().clear();
  useToolActivityStore.getState().clear();
  useCompositionStore.getState().setComposition([]);
  useDesktopStore.setState({ wins: [], focusId: null });
});

describe("tool surface contract", () => {
  it("ships the five core tools plus the small read-only lookups", () => {
    const names = WEBMCP_TOOLS.map((t) => t.name);
    for (const name of CORE_TOOLS) assert.ok(names.includes(name), name);
    assert.equal(new Set(names).size, names.length);
    assert.ok(names.length <= 8, "surface stays small enough to reason about");
  });

  it("uses snake_case names, honest descriptions, and closed schemas", () => {
    for (const t of WEBMCP_TOOLS) {
      assert.match(t.name, /^[a-z][a-z0-9_]+$/);
      assert.ok(t.description.length > 20, t.name);
      assert.equal(t.inputSchema.additionalProperties, false, t.name);
    }
  });

  it("keeps inputs narrow: no personal-data parameters anywhere", () => {
    // Over-parameterization guard (WebMCP spec §6.3.3): the tool surface
    // must never ask an agent for visitor attributes.
    const banned = /location|age|gender|salary|email|phone|address|company/;
    for (const t of WEBMCP_TOOLS) {
      for (const key of Object.keys(t.inputSchema.properties)) {
        assert.doesNotMatch(key, banned, `${t.name}.${key}`);
      }
    }
  });

  it("marks only genuinely read-only tools read-only", () => {
    const mutating = ["set_visit_intent", "compose_workspace"];
    for (const t of WEBMCP_TOOLS) {
      assert.equal(t.readOnly, !mutating.includes(t.name), t.name);
    }
  });

  it("rejects invalid input with a structured error, not a throw", () => {
    const out = run("inspect_evidence", { id: 42 });
    assert.equal(out.error, "invalid input");
    assert.ok(Array.isArray(out.details));
  });
});

describe("evidence tools", () => {
  it("search_evidence returns ranked hits with the full honesty fields", () => {
    const out = run("search_evidence", { query: "finance workflows" }) as {
      matches: {
        id: string;
        contributionScope: string;
        provenance: { type: string };
        limitations: string[];
      }[];
      unmatchedTerms: string[];
      disclosure: string[];
    };
    assert.ok(out.matches.length > 0);
    for (const m of out.matches) {
      assert.ok(m.contributionScope.length > 0);
      assert.equal(m.provenance.type, "candidate-authored");
      assert.ok(m.limitations.length > 0);
    }
    assert.ok(out.disclosure.length > 0);
  });

  it("search_evidence surfaces unmatched terms and a typed empty result", () => {
    const gap = run("search_evidence", { query: "underwaterbasketweaving" }) as {
      matches: unknown[];
      unmatchedTerms: string[];
      note?: string;
    };
    assert.equal(gap.matches.length, 0);
    assert.ok(gap.unmatchedTerms.includes("underwaterbasketweaving"));
    assert.match(String(gap.note), /No documented evidence/);
  });

  it("search_evidence honors the kinds filter", () => {
    const out = run("search_evidence", {
      query: "finance",
      kinds: ["experience"],
    }) as { matches: { kind: string }[] };
    assert.ok(out.matches.length > 0);
    for (const m of out.matches) assert.equal(m.kind, "experience");
  });

  it("inspect_evidence round-trips a search hit and types not-found", () => {
    const search = run("search_evidence", { query: "react" }) as {
      matches: { id: string }[];
    };
    const detail = run("inspect_evidence", { id: search.matches[0].id }) as {
      found: boolean;
      record: { claim: string; artifacts: unknown[] };
    };
    assert.equal(detail.found, true);
    assert.ok(detail.record.claim.length > 0);
    assert.ok(detail.record.artifacts.length > 0);

    const missing = run("inspect_evidence", { id: "nope:missing" }) as {
      found: boolean;
      note: string;
    };
    assert.equal(missing.found, false);
    assert.match(missing.note, /search_evidence/);
  });
});

describe("visit intent and workspace tools", () => {
  it("set_visit_intent stores session intent marked as agent-supplied", () => {
    const out = run("set_visit_intent", {
      objective: "Screen for a Staff AI Engineer",
      context_label: "Staff AI Engineer",
      priorities: ["agent systems", "evals"],
    }) as { stored: { suppliedBy: string; priorities: string[] } };
    assert.equal(out.stored.suppliedBy, "visitor-agent");
    assert.deepEqual(out.stored.priorities, ["agent systems", "evals"]);
    assert.equal(
      useVisitIntentStore.getState().intent?.objective,
      "Screen for a Staff AI Engineer",
    );
  });

  it("set_visit_intent rejects over-limit priorities", () => {
    const out = run("set_visit_intent", {
      objective: "x",
      priorities: ["a", "b", "c", "d", "e"],
    });
    assert.equal(out.error, "invalid input");
  });

  it("compose_workspace opens real windows and get_workspace_state reports them", () => {
    const project = EVIDENCE_RECORDS.find((r) => r.kind === "project")!;
    const exp = EVIDENCE_RECORDS.find((r) => r.kind === "experience")!;
    const composed = run("compose_workspace", {
      evidence_ids: [project.id, exp.id],
      layout: "compare",
    }) as { openedAppIds: string[]; unresolvedEvidenceIds: string[] };
    assert.ok(composed.openedAppIds.length >= 2);
    assert.deepEqual(composed.unresolvedEvidenceIds, []);

    const state = run("get_workspace_state") as {
      snapshot: {
        shell: string;
        openAppIds: string[];
        composedEvidenceIds: string[];
      };
    };
    assert.equal(state.snapshot.shell, "desktop");
    for (const appId of composed.openedAppIds) {
      assert.ok(state.snapshot.openAppIds.includes(appId));
    }
    assert.deepEqual(state.snapshot.composedEvidenceIds, [project.id, exp.id]);
  });

  it("get_workspace_state reflects a human action after composition", () => {
    const project = EVIDENCE_RECORDS.find((r) => r.kind === "project")!;
    run("compose_workspace", { evidence_ids: [project.id], layout: "focus" });
    // Human opens another app by hand.
    useDesktopStore.getState().open("about");
    const state = run("get_workspace_state") as {
      snapshot: { openAppIds: string[]; focusedAppId: string | null };
    };
    assert.ok(state.snapshot.openAppIds.includes("about"));
    assert.equal(state.snapshot.focusedAppId, "about");
  });

  it("never emits fit scores or hiring verdicts", () => {
    run("set_visit_intent", {
      objective: "Screen",
      priorities: ["react", "python"],
    });
    const corpus = JSON.stringify([
      run("search_evidence", { query: "react python" }),
      run("get_workspace_state"),
    ]);
    for (const banned of [/fit score/i, /\bverdict\b/i, /recommend hiring/i]) {
      assert.doesNotMatch(corpus, banned);
    }
  });
});

describe("read-only lookups", () => {
  it("get_candidate_profile and get_resume return typed-source data", () => {
    const profile = run("get_candidate_profile") as { name: string };
    assert.equal(profile.name, ELIJAH.name);
    const resume = run("get_resume") as { experience: unknown[]; updated: string };
    assert.equal(resume.experience.length, ELIJAH.experience.length);
    assert.match(resume.updated, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("activity log", () => {
  it("records every invocation with a neutral summary", () => {
    run("get_resume");
    run("inspect_evidence", { id: 42 });
    const entries = useToolActivityStore.getState().entries;
    assert.equal(entries.length, 2);
    assert.equal(entries[1].tool, "get_resume");
    assert.equal(entries[1].ok, true);
    assert.equal(entries[0].ok, false);
  });
});

describe("registration", () => {
  it("is a no-op without a ModelContext host", () => {
    __resetRegistrationForTests();
    const result = registerWebMCPTools();
    assert.equal(result.supported, false);
    assert.deepEqual(result.registered, []);
  });

  it("registers every tool with accurate annotations on a fake host", () => {
    __resetRegistrationForTests();
    const seen: WebMCPTool[] = [];
    const host: ModelContextLike = { registerTool: (t) => void seen.push(t) };
    (globalThis as { window?: unknown }).window = {
      navigator: { modelContext: host },
      document: {},
    };
    try {
      const result = registerWebMCPTools();
      assert.equal(result.supported, true);
      assert.equal(result.registered.length, WEBMCP_TOOLS.length);
      for (const t of WEBMCP_TOOLS) {
        const reg = seen.find((s) => s.name === t.name);
        assert.ok(reg, t.name);
        assert.equal(reg.annotations?.readOnlyHint, t.readOnly, t.name);
      }
      // Idempotent: a second call must not double-register.
      registerWebMCPTools();
      assert.equal(seen.length, WEBMCP_TOOLS.length);
    } finally {
      delete (globalThis as { window?: unknown }).window;
      __resetRegistrationForTests();
    }
  });
});
