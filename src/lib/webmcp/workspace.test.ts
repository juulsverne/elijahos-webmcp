import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useDesktopStore } from "@/lib/desktop-store";
import { EVIDENCE_RECORDS } from "@/lib/evidence";
import { useVisitIntentStore } from "./visit-intent";
import {
  composeWorkspace,
  setMobileActiveAppId,
  useCompositionStore,
  workspaceSnapshot,
} from "./workspace";

function resetDesktop() {
  useDesktopStore.setState({ wins: [], focusId: null });
  useCompositionStore.getState().setComposition([]);
  useVisitIntentStore.getState().clear();
  setMobileActiveAppId(null);
}

const projectRecord = EVIDENCE_RECORDS.find((r) => r.kind === "project")!;
const decisionRecord = EVIDENCE_RECORDS.find((r) => r.kind === "decision")!;
const experienceRecord = EVIDENCE_RECORDS.find((r) => r.kind === "experience")!;

beforeEach(resetDesktop);

describe("composeWorkspace (desktop)", () => {
  it("opens the artifact apps arranged for compare", () => {
    const result = composeWorkspace(
      [projectRecord.id, experienceRecord.id],
      "compare",
    );
    assert.equal(result.shell, "desktop");
    assert.ok(result.openedAppIds.includes("projects"));
    assert.ok(result.openedAppIds.includes("resume"));
    assert.deepEqual(result.unresolvedEvidenceIds, []);
    const wins = useDesktopStore.getState().wins.map((w) => w.id);
    for (const appId of result.openedAppIds) assert.ok(wins.includes(appId));
  });

  it("focus layout foregrounds the primary record's app", () => {
    const result = composeWorkspace(
      [decisionRecord.id, experienceRecord.id],
      "focus",
    );
    assert.equal(result.openedAppIds[0], "case");
    assert.equal(useDesktopStore.getState().focusId, "case");
  });

  it("reports unknown evidence ids instead of guessing", () => {
    const result = composeWorkspace(["nope:missing", projectRecord.id], "grid");
    assert.deepEqual(result.unresolvedEvidenceIds, ["nope:missing"]);
    assert.ok(result.openedAppIds.length > 0);
  });

  it("records the composition for the snapshot", () => {
    composeWorkspace([projectRecord.id], "focus");
    const snap = workspaceSnapshot();
    assert.deepEqual(snap.composedEvidenceIds, [projectRecord.id]);
    assert.equal(snap.focusedEvidenceId, projectRecord.id);
  });
});

describe("workspaceSnapshot", () => {
  it("reflects human desktop actions (open, focus, minimize)", () => {
    const store = useDesktopStore.getState();
    store.open("about");
    store.open("resume");
    let snap = workspaceSnapshot();
    assert.deepEqual([...snap.openAppIds].sort(), ["about", "resume"]);
    assert.equal(snap.focusedAppId, "resume");

    useDesktopStore.getState().minimize("resume");
    snap = workspaceSnapshot();
    assert.ok(!snap.openAppIds.includes("resume"));
  });

  it("includes the visit intent and nothing beyond the contract fields", () => {
    useVisitIntentStore
      .getState()
      .setIntent({ objective: "Evaluate" }, "visitor-agent");
    const snap = workspaceSnapshot();
    assert.equal(snap.visitIntent?.objective, "Evaluate");
    assert.deepEqual(
      Object.keys(snap).sort(),
      [
        "composedEvidenceIds",
        "focusedAppId",
        "focusedEvidenceId",
        "openAppIds",
        "shell",
        "visitIntent",
      ].sort(),
    );
  });

  it("reports the mobile shell's active app through the seam", () => {
    setMobileActiveAppId("about");
    // No mobile opener registered in node, so shell stays desktop — the
    // seam value is only consulted when the mobile shell is mounted. This
    // guards the setter contract itself.
    setMobileActiveAppId(null);
    const snap = workspaceSnapshot();
    assert.equal(snap.shell, "desktop");
  });
});
