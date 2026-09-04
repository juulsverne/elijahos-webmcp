import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { APPS } from "@/lib/apps";
import { useDesktopStore } from "@/lib/desktop-store";
import { useToolActivityStore } from "./activity";
import { executeTool } from "./register";
import { useVisitIntentStore } from "./visit-intent";
import { useCompositionStore } from "./workspace";
import { getToolDef } from "./tools";

type FixtureStep = {
  readonly tool: string;
  readonly input: Readonly<Record<string, unknown>>;
};

type EvalFixture = {
  readonly id: string;
  readonly prompt: string;
  readonly audience: string;
  readonly kind: "planned-tool-sequence";
  readonly modelEvaluated: false;
  readonly steps: readonly FixtureStep[];
};

async function loadFixtures(): Promise<readonly EvalFixture[]> {
  try {
    const fixtureModule = await import("./eval-fixtures");
    return fixtureModule.WEBMCP_EVAL_FIXTURES;
  } catch (error) {
    assert.fail(
      `eval fixture module must exist: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

beforeEach(() => {
  useVisitIntentStore.getState().clear();
  useToolActivityStore.getState().clear();
  useCompositionStore.getState().setComposition([]);
  useDesktopStore.setState({ wins: [], focusId: null });
});

describe("planned WebMCP acceptance fixtures", () => {
  it("defines exactly the three truthful planned sequences", async () => {
    const fixtures = await loadFixtures();

    assert.equal(fixtures.length, 3);
    assert.deepEqual(
      fixtures.map((fixture) => fixture.id),
      [
        "hiring-manager-evidence-loop",
        "technical-reviewer-architecture",
        "curious-peer-exploration",
      ],
    );
    assert.deepEqual(
      fixtures.map((fixture) => fixture.steps.map((step) => step.tool)),
      [
        [
          "set_visit_intent",
          "search_evidence",
          "inspect_evidence",
          "compose_workspace",
          "get_workspace_state",
        ],
        [
          "set_visit_intent",
          "search_evidence",
          "inspect_evidence",
          "compose_workspace",
        ],
        ["search_evidence", "inspect_evidence"],
      ],
    );
    for (const fixture of fixtures) {
      assert.equal(fixture.kind, "planned-tool-sequence", fixture.id);
      assert.equal(fixture.modelEvaluated, false, fixture.id);
      assert.ok(fixture.prompt.length > 0, `${fixture.id} has a prompt`);
      assert.ok(fixture.audience.length > 0, `${fixture.id} has an audience`);
    }
  });

  it("executes every planned step through the real dispatcher", async () => {
    const fixtures = await loadFixtures();

    for (const fixture of fixtures) {
      const searchedEvidenceIds = new Set<string>();

      for (const step of fixture.steps) {
        const tool = getToolDef(step.tool);
        assert.ok(tool, `${fixture.id}: tool ${step.tool} exists`);

        const result = executeTool(tool, step.input) as Record<string, unknown>;
        assert.equal(typeof result, "object", `${fixture.id}: structured result`);
        assert.ok(!Array.isArray(result), `${fixture.id}: result is not an array`);
        assert.ok(!("error" in result), `${fixture.id}: ${step.tool} succeeds`);

        if (step.tool === "search_evidence") {
          const matches = result.matches as { id: string }[];
          assert.ok(matches.length > 0, `${fixture.id}: search has matches`);
          for (const match of matches) searchedEvidenceIds.add(match.id);
        }

        if (step.tool === "inspect_evidence") {
          const record = result.record as {
            id: string;
            contributionScope: string;
            provenance: { type: string };
            limitations: string[];
          };
          assert.equal(result.found, true, `${fixture.id}: evidence is public`);
          assert.ok(
            searchedEvidenceIds.has(record.id),
            `${fixture.id}: inspected evidence came from the search result`,
          );
          assert.ok(record.contributionScope.length > 0, fixture.id);
          assert.equal(record.provenance.type, "candidate-authored", fixture.id);
          assert.ok(record.limitations.length > 0, fixture.id);
        }

        if (step.tool === "compose_workspace") {
          const openedAppIds = result.openedAppIds as string[];
          assert.ok(openedAppIds.length > 0, `${fixture.id}: apps opened`);
          assert.deepEqual(result.unresolvedEvidenceIds, [], fixture.id);
          for (const appId of openedAppIds) {
            assert.ok(
              APPS[appId]?.launchpad,
              `${fixture.id}: ${appId} is launchable and allowlisted`,
            );
          }
        }
      }
    }
  });
});
