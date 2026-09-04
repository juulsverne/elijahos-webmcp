import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useCaseAnchorStore } from "@/lib/case-anchor";
import { useDesktopStore } from "@/lib/desktop-store";
import { ELIJAH } from "@/lib/elijah";
import { EVIDENCE_RECORDS } from "@/lib/evidence";
import {
  __resetMusicRemoteForTests,
  registerMusicController,
  type MusicCommand,
} from "@/lib/music-remote";
import { useWidgetStore } from "@/lib/widget-store";
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
  useWidgetStore.setState({ isOpen: false });
  __resetMusicRemoteForTests();
});

describe("tool surface contract", () => {
  it("ships the five core tools plus lookups and personality tools", () => {
    const names = WEBMCP_TOOLS.map((t) => t.name);
    for (const name of CORE_TOOLS) assert.ok(names.includes(name), name);
    assert.ok(names.includes("open_app"));
    assert.ok(names.includes("play_music"));
    assert.equal(new Set(names).size, names.length);
    assert.ok(names.length <= 10, "surface stays small enough to reason about");
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
    const mutating = [
      "set_visit_intent",
      "compose_workspace",
      "open_app",
      "play_music",
    ];
    for (const t of WEBMCP_TOOLS) {
      assert.equal(t.readOnly, !mutating.includes(t.name), t.name);
    }
  });

  it("marks every tool that can echo caller-controlled content as untrusted", () => {
    const untrusted = new Set([
      "set_visit_intent",
      "search_evidence",
      "inspect_evidence",
      "compose_workspace",
      "get_workspace_state",
    ]);
    for (const t of WEBMCP_TOOLS) {
      assert.equal(t.untrustedContent ?? false, untrusted.has(t.name), t.name);
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

  it("evidence responses point at first-hand sources instead of self-grading", () => {
    const out = run("search_evidence", { query: "finance" }) as {
      firstHandSources: { label: string; url: string | null }[];
    };
    assert.ok(out.firstHandSources.length > 0);
    const urls = out.firstHandSources.map((s) => s.url);
    assert.ok(urls.includes("https://github.com/juulsverne"));

    const record = EVIDENCE_RECORDS[0];
    const detail = run("inspect_evidence", { id: record.id }) as {
      firstHandSources: unknown[];
    };
    assert.ok(detail.firstHandSources.length > 0);
  });

  it("project hits carry their public repository as an external link", () => {
    const out = run("search_evidence", {
      query: "glyph",
      kinds: ["project"],
    }) as {
      matches: { id: string; externalLinks: { label: string; url: string }[] }[];
    };
    const glyph = out.matches.find((m) => m.id.includes("glyph"));
    assert.ok(glyph, "glyph project found");
    assert.ok(
      glyph.externalLinks.some((l) =>
        l.url.includes("github.com/juulsverne/glyph"),
      ),
      "glyph repo link present",
    );
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

  it("set_visit_intent rejects a whitespace-only objective without storing", () => {
    const out = run("set_visit_intent", { objective: "   " });
    assert.equal(out.error, "invalid input");
    assert.equal(useVisitIntentStore.getState().intent, null);
  });

  it("set_visit_intent stores an agent-supplied visit_type", () => {
    const out = run("set_visit_intent", {
      objective: "Scope an enterprise AI engagement",
      visit_type: "client-project",
    }) as { stored: { visitType: string | null } };
    assert.equal(out.stored.visitType, "client-project");
    assert.equal(
      useVisitIntentStore.getState().intent?.visitType,
      "client-project",
    );
  });

  it("set_visit_intent rejects a visit_type outside the enum", () => {
    const out = run("set_visit_intent", {
      objective: "x",
      visit_type: "acquisition-target",
    });
    assert.equal(out.error, "invalid input");
  });

  it("compose_workspace queues the primary record's case-study anchor", () => {
    const section = EVIDENCE_RECORDS.find(
      (r) => r.kind === "case-study-section",
    )!;
    const anchor = section.artifacts.find((a) => a.appId === "case")?.anchorId;
    assert.ok(anchor, "section record carries an anchor");
    run("compose_workspace", {
      evidence_ids: [section.id],
      layout: "focus",
    });
    assert.equal(useCaseAnchorStore.getState().anchorId, anchor);
    useCaseAnchorStore.getState().clear();
  });

  it("compose_workspace deduplicates repeated evidence ids", () => {
    const project = EVIDENCE_RECORDS.find((r) => r.kind === "project")!;
    run("compose_workspace", {
      evidence_ids: [project.id, project.id],
      layout: "compare",
    });
    const state = run("get_workspace_state") as {
      snapshot: { composedEvidenceIds: string[] };
    };
    assert.deepEqual(state.snapshot.composedEvidenceIds, [project.id]);
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

  it("get_candidate_profile carries pillars, creative facts, and first-hand sources", () => {
    const profile = run("get_candidate_profile") as {
      pillars: { k: string; v: string }[];
      creative: {
        music: { tracks: { title: string }[]; spotifyArtist: string };
        note: string;
      };
      firstHandSources: unknown[];
    };
    assert.equal(profile.pillars.length, ELIJAH.pillars.length);
    assert.equal(
      profile.creative.music.tracks.length,
      ELIJAH.music.tracks.length,
    );
    assert.equal(
      profile.creative.music.spotifyArtist,
      ELIJAH.music.spotifyArtistUrl,
    );
    assert.ok(profile.firstHandSources.length > 0);
    // The creative block states facts and artifacts, never trait adjectives.
    const text = JSON.stringify(profile.creative).toLowerCase();
    for (const adjective of ["talented", "brilliant", "exceptional"]) {
      assert.ok(!text.includes(adjective), adjective);
    }
  });
});

describe("personality tools", () => {
  it("open_app opens a launchpad app in the desktop shell", () => {
    const out = run("open_app", { app: "snake" }) as {
      opened: string;
      title: string;
      shell: string;
    };
    assert.equal(out.opened, "snake");
    assert.equal(out.title, "/snake");
    assert.equal(out.shell, "desktop");
    assert.ok(useDesktopStore.getState().wins.some((w) => w.id === "snake"));
  });

  it("open_app refuses non-launchpad ids at the schema boundary", () => {
    // `root` stays gated behind the /zsh puzzle — it must not be in the enum.
    const out = run("open_app", { app: "root" });
    assert.equal(out.error, "invalid input");
    assert.equal(
      useDesktopStore.getState().wins.some((w) => w.id === "root"),
      false,
    );
  });

  it("play_music opens the widget panel and queues the command until the player mounts", () => {
    const out = run("play_music", { action: "play", track: 1 }) as {
      delivered: boolean;
      nowPlaying: unknown;
      tracks: { track: number; title: string }[];
    };
    // No player is mounted in node, so the command queues honestly.
    assert.equal(out.delivered, false);
    assert.equal(out.nowPlaying, null);
    assert.equal(out.tracks.length, ELIJAH.music.tracks.length);
    assert.equal(useWidgetStore.getState().isOpen, true);

    const received: MusicCommand[] = [];
    registerMusicController({
      command: (cmd) => received.push(cmd),
      snapshot: () => ({ playing: true, trackIndex: 0, trackTitle: "t" }),
    });
    assert.deepEqual(received, [{ action: "play", trackIndex: 0 }]);
  });

  it("play_music reports the live player state when one is mounted", () => {
    registerMusicController({
      command: () => {},
      snapshot: () => ({ playing: true, trackIndex: 1, trackTitle: "Two" }),
    });
    const out = run("play_music", { action: "next" }) as {
      delivered: boolean;
      nowPlaying: { trackTitle: string };
    };
    assert.equal(out.delivered, true);
    assert.equal(out.nowPlaying.trackTitle, "Two");
  });

  it("play_music validates the track number against the real track list", () => {
    const out = run("play_music", {
      track: ELIJAH.music.tracks.length + 1,
    });
    assert.equal(out.error, "invalid input");
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
        assert.equal(
          reg.annotations?.untrustedContentHint,
          t.untrustedContent ?? false,
          t.name,
        );
      }
      // Idempotent: a second call must not double-register.
      registerWebMCPTools();
      assert.equal(seen.length, WEBMCP_TOOLS.length);
    } finally {
      delete (globalThis as { window?: unknown }).window;
      __resetRegistrationForTests();
    }
  });

  it("registers through the document.modelContext fallback", () => {
    __resetRegistrationForTests();
    const seen: WebMCPTool[] = [];
    const host: ModelContextLike = { registerTool: (t) => void seen.push(t) };
    (globalThis as { window?: unknown }).window = {
      navigator: {},
      document: { modelContext: host },
    };
    try {
      const result = registerWebMCPTools();
      assert.equal(result.supported, true);
      assert.equal(result.registered.length, WEBMCP_TOOLS.length);
      assert.deepEqual(
        seen.map((tool) => tool.name),
        WEBMCP_TOOLS.map((tool) => tool.name),
      );
    } finally {
      delete (globalThis as { window?: unknown }).window;
      __resetRegistrationForTests();
    }
  });
});
