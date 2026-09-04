// Video demo driver: opens a visible browser and performs the agent journey
// against the live site with recording-friendly pacing. Run, hit record,
// narrate over the beats (script: docs/superpowers/plans/2026-09-03-video-script.md).
//
//   node scripts/demo-driver.mjs [url]     (default: https://webmcp.elijahos.com)
//
// Beats are logged to the terminal with elapsed time so you can follow the
// narration script. Total runtime ~2m15s.

import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "https://webmcp.elijahos.com";
const t0 = Date.now();
const beat = (label) => {
  const s = Math.round((Date.now() - t0) / 1000);
  console.log(`[${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}] ${label}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: false,
  args: ["--window-size=1920,1080", "--window-position=0,0"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(() => {
  const tools = new Map();
  Object.defineProperty(navigator, "modelContext", {
    configurable: true,
    value: { registerTool: (tool) => tools.set(tool.name, tool) },
  });
  window.__callTool = async (name, input = {}) =>
    tools.get(name).execute(input);
});
const call = (name, input = {}) =>
  page.evaluate(({ name, input }) => window.__callTool(name, input), {
    name,
    input,
  });

beat("BEAT 0 — loading the live site (boot animation plays)");
await page.goto(BASE);
await page.locator(".boot-wrap").waitFor({ state: "detached", timeout: 30000 });
await wait(12000); // linger on the desktop; narration: the two-visitor thesis

beat("BEAT 1 — agent orients itself (get_candidate_profile, invisible)");
await call("get_candidate_profile");
await wait(5000);

beat("BEAT 2 — agent states the visit intent -> workspace opens");
await call("set_visit_intent", {
  objective: "Screen Elijah for an applied AI engineering role",
  context_label: "Applied AI Engineer",
  priorities: ["agent systems", "evals", "prompt injection defenses", "kubernetes"],
  evidence_standard: "shipped work with verifiable public artifacts",
  visit_type: "hiring",
});
await wait(24000); // workspace front: intent card, "set by your agent", gap on kubernetes

beat("BEAT 3 — agent searches and inspects evidence (invisible reads)");
const search = await call("search_evidence", {
  query: "agent systems evals prompt injection",
  limit: 3,
});
if (!search.matches?.length) {
  throw new Error(
    "search_evidence returned no matches — check the BASE url and deployed content before recording",
  );
}
await call("inspect_evidence", { id: search.matches[0].id });
await wait(14000);

beat("BEAT 4 — agent composes the workspace -> windows tile, case study scrolls to its section");
await call("compose_workspace", {
  evidence_ids: search.matches.slice(0, 2).map((m) => m.id),
  layout: "compare",
});
await wait(20000);

beat("BEAT 5 — the HUMAN takes over: opens About from the dock");
await page.locator(".dock").getByRole("button", { name: /about/i }).click();
await wait(4000);

beat("BEAT 6 — agent reads the workspace back (sees the human's action)");
const state = await call("get_workspace_state");
console.log(
  `        snapshot: focused=${state.snapshot.focusedAppId}, open=[${state.snapshot.openAppIds.join(",")}]`,
);
if (state.snapshot.focusedAppId !== "about") {
  console.log(
    "        WARNING: narration says the agent sees the human's focus, but focused!=about — re-run before recording",
  );
}
await wait(16000);

beat("BEAT 7 — personality: snake + the candidate's own music");
await call("open_app", { app: "snake" });
await wait(2500);
await call("play_music", { action: "play", track: 1 });
await wait(12000); // widget panel opens with the player

beat("BEAT 8 — the receipts: agent workspace shows the full activity log");
await page.locator(".dock").getByRole("button", { name: /agent/i }).click();
await wait(14000); // linger on activity log + intent card; closing narration

beat("DONE — hold this frame, then stop recording");
await wait(8000);
await browser.close();
