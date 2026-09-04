// End-to-end WebMCP behavior in a real browser.
//
// Chromium here has no native ModelContext, so an init script installs a
// minimal fake host BEFORE the app loads. That exercises the true
// integration path: feature detection, registration, schema validation,
// the five-tool agent journey (set_visit_intent → search_evidence →
// inspect_evidence → compose_workspace → get_workspace_state), and the
// visible agent workspace.

import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __webmcpTools: Map<
      string,
      {
        name: string;
        description: string;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute: (input: unknown) => Promise<unknown>;
      }
    >;
    __callTool: (name: string, input?: unknown) => Promise<unknown>;
  }
}

async function installFakeHost(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map();
    (window as unknown as { __webmcpTools: typeof tools }).__webmcpTools = tools;
    Object.defineProperty(navigator, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: { name: string }) => {
          tools.set(tool.name, tool);
        },
      },
    });
    (window as unknown as Window).__callTool = async (
      name: string,
      input: unknown = {},
    ) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`tool not registered: ${name}`);
      return tool.execute(input);
    };
  });
}

async function boot(page: Page, path = "/") {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(path);
  await page.locator(".boot-wrap").waitFor({ state: "detached", timeout: 15_000 });
  await expect(page.locator(".lc-root")).toBeVisible();
  expect(pageErrors).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await installFakeHost(page);
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("registers the tool surface with accurate annotations", async ({ page }) => {
  await boot(page);
  const registered = await page.evaluate(() =>
    [...window.__webmcpTools.values()].map((t) => ({
      name: t.name,
      readOnly: t.annotations?.readOnlyHint ?? false,
    })),
  );
  const names = registered.map((t) => t.name);
  for (const expected of [
    "set_visit_intent",
    "search_evidence",
    "inspect_evidence",
    "compose_workspace",
    "get_workspace_state",
    "get_candidate_profile",
    "get_resume",
    "get_contact",
  ]) {
    expect(names).toContain(expected);
  }
  const byName = new Map(registered.map((t) => [t.name, t]));
  expect(byName.get("search_evidence")?.readOnly).toBe(true);
  expect(byName.get("get_workspace_state")?.readOnly).toBe(true);
  expect(byName.get("set_visit_intent")?.readOnly).toBe(false);
  expect(byName.get("compose_workspace")?.readOnly).toBe(false);
});

test("search and inspect return evidence with honesty fields and gaps", async ({ page }) => {
  await boot(page);
  const search = (await page.evaluate(() =>
    window.__callTool("search_evidence", { query: "react nonexistentskill" }),
  )) as {
    matches: { id: string; contributionScope: string; limitations: string[] }[];
    unmatchedTerms: string[];
  };
  expect(search.matches.length).toBeGreaterThan(0);
  expect(search.unmatchedTerms).toContain("nonexistentskill");
  expect(search.matches[0].contributionScope.length).toBeGreaterThan(0);
  expect(search.matches[0].limitations.length).toBeGreaterThan(0);

  const detail = (await page.evaluate(
    (id) => window.__callTool("inspect_evidence", { id }),
    search.matches[0].id,
  )) as { found: boolean; record: { claim: string } };
  expect(detail.found).toBe(true);
  expect(detail.record.claim.length).toBeGreaterThan(0);
});

test("invalid input is rejected with a structured error", async ({ page }) => {
  await boot(page);
  const out = (await page.evaluate(() =>
    window.__callTool("compose_workspace", {
      evidence_ids: [],
      layout: "spiral",
    }),
  )) as { error: string; details: string[] };
  expect(out.error).toBe("invalid input");
});

test("the full agent journey composes real windows and stays visible", async ({ page }) => {
  await boot(page);

  // 1. Agent states the visit intent — the workspace opens showing it.
  await page.evaluate(() =>
    window.__callTool("set_visit_intent", {
      objective: "Screen Elijah for a Staff AI Engineer role",
      context_label: "Staff AI Engineer",
      priorities: ["agent systems and evals", "underwaterbasketweaving"],
    }),
  );
  await expect(page.locator(".agent-app")).toBeVisible();
  await expect(page.locator(".agent-intent-title")).toContainText(
    "Staff AI Engineer",
  );
  await expect(page.locator(".agent-gap").first()).toBeVisible();

  // 2-3. Agent searches and picks evidence.
  const search = (await page.evaluate(() =>
    window.__callTool("search_evidence", { query: "agent systems evals" }),
  )) as { matches: { id: string }[] };
  expect(search.matches.length).toBeGreaterThan(0);

  // 4. Agent composes a comparison workspace from the top two records.
  const ids = search.matches.slice(0, 2).map((m) => m.id);
  const composed = (await page.evaluate(
    (evidenceIds) =>
      window.__callTool("compose_workspace", {
        evidence_ids: evidenceIds,
        layout: "compare",
      }),
    ids,
  )) as { openedAppIds: string[] };
  expect(composed.openedAppIds.length).toBeGreaterThan(0);
  for (const appId of composed.openedAppIds) {
    await expect(page.locator(`.win[data-app-id="${appId}"], .win`).first()).toBeVisible();
  }

  // 5. Human acts (opens About by hand); the agent sees it in the snapshot.
  await page.locator(".dock").getByRole("button", { name: /about/i }).click();
  const state = (await page.evaluate(() =>
    window.__callTool("get_workspace_state"),
  )) as {
    snapshot: {
      shell: string;
      openAppIds: string[];
      focusedAppId: string | null;
      composedEvidenceIds: string[];
      visitIntent: { objective: string; suppliedBy: string } | null;
    };
  };
  expect(state.snapshot.shell).toBe("desktop");
  expect(state.snapshot.openAppIds).toContain("about");
  expect(state.snapshot.focusedAppId).toBe("about");
  expect(state.snapshot.composedEvidenceIds).toEqual(ids);
  expect(state.snapshot.visitIntent?.suppliedBy).toBe("visitor-agent");

  // The visible activity log recorded the whole journey.
  const logText = await page.locator(".agent-log").innerText();
  for (const tool of [
    "set_visit_intent",
    "search_evidence",
    "compose_workspace",
    "get_workspace_state",
  ]) {
    expect(logText).toContain(tool);
  }
});

test("human can edit and clear the agent-set intent", async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    window.__callTool("set_visit_intent", {
      objective: "Screen for platform role",
      priorities: ["pipelines"],
    }),
  );
  await expect(page.locator(".agent-app")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  const value = await page.locator(".agent-intent-input").inputValue();
  expect(value).toContain("Screen for platform role");
  expect(value).toContain("- pipelines");
  await page.getByRole("button", { name: "Set visit intent" }).isVisible();

  // Cancel edit by re-setting, then clear entirely.
  await page.getByRole("button", { name: "Set visit intent" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".agent-intent-input")).toBeVisible();
});

test("mobile shell registers the same tools and composes its primary app", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await expect(page.locator(".mobile-root")).toBeVisible();
  const count = await page.evaluate(() => window.__webmcpTools.size);
  expect(count).toBeGreaterThanOrEqual(10);

  const search = (await page.evaluate(() =>
    window.__callTool("search_evidence", { query: "finance", kinds: ["experience"] }),
  )) as { matches: { id: string }[] };
  const composed = (await page.evaluate(
    (id) =>
      window.__callTool("compose_workspace", {
        evidence_ids: [id],
        layout: "focus",
      }),
    search.matches[0].id,
  )) as { shell: string; openedAppIds: string[] };
  expect(composed.shell).toBe("mobile");
  expect(composed.openedAppIds).toHaveLength(1);

  const state = (await page.evaluate(() =>
    window.__callTool("get_workspace_state"),
  )) as { snapshot: { shell: string; openAppIds: string[] } };
  expect(state.snapshot.shell).toBe("mobile");
  expect(state.snapshot.openAppIds).toEqual(composed.openedAppIds);
});

test("open_app opens the snake game and play_music surfaces the player", async ({ page }) => {
  await boot(page);

  const opened = (await page.evaluate(() =>
    window.__callTool("open_app", { app: "snake" }),
  )) as { opened: string; shell: string };
  expect(opened.opened).toBe("snake");
  expect(opened.shell).toBe("desktop");
  await expect(page.locator('.win[data-window-id="snake"]')).toBeVisible();

  const music = (await page.evaluate(() =>
    window.__callTool("play_music", { action: "play", track: 1 }),
  )) as { tracks: { track: number; title: string }[] };
  expect(music.tracks.length).toBeGreaterThan(0);
  // The tool makes playback visible: the widget panel opens with the player.
  await expect(page.locator(".widget-panel.is-open")).toBeVisible();
  await expect(page.locator(".music-widget")).toBeVisible();

  // Both calls are on the visible record.
  await page.locator(".dock").getByRole("button", { name: /agent/i }).click();
  const logText = await page.locator(".agent-log").innerText();
  expect(logText).toContain("open_app");
  expect(logText).toContain("play_music");
});

test("a preset chip fills the visit intent in one tap", async ({ page }) => {
  await boot(page);
  await page.locator(".dock").getByRole("button", { name: /agent/i }).click();
  await expect(page.locator(".agent-app")).toBeVisible();
  await page.locator(".agent-chip").first().click();
  await expect(page.locator(".agent-intent-title")).toBeVisible();
  // A preset is a human action and is labeled that way.
  await expect(page.locator(".agent-badge[data-kind='read']").first()).toContainText(
    "set by you",
  );
});

test("without a WebMCP host the workspace reports unsupported", async ({ browser }) => {
  // Fresh context WITHOUT the fake host.
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const clean = await ctx.newPage();
  await clean.setViewportSize({ width: 1440, height: 900 });
  await clean.goto("/");
  await clean.locator(".boot-wrap").waitFor({ state: "detached", timeout: 15_000 });
  await clean.locator(".dock").getByRole("button", { name: /agent/i }).click();
  await expect(clean.locator(".agent-status")).toHaveAttribute(
    "data-supported",
    "false",
  );
  await ctx.close();
});
