import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_DEMAND_AREAS,
  MIN_DEMAND_TOTAL,
  selectIndexView,
  type IndexCluster,
} from "./index-view";

const CLUSTERS: IndexCluster[] = [
  { id: "core", chunks: 20, weight: 1 },
  { id: "about", chunks: 10, weight: 0.5 },
  { id: "projects", chunks: 8, weight: 0.4 },
  { id: "ask", chunks: 2, weight: 0.1 },
];
const TOTAL = 40;

const view = (hits?: Record<string, number>) =>
  selectIndexView(
    CLUSTERS,
    TOTAL,
    hits ? new Map(Object.entries(hits)) : null,
  );

/** Demand spread evenly over `areas`, summing to `total`. */
function spread(total: number, areas: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < areas; i++) out[CLUSTERS[i]!.id] = 0;
  for (let i = 0; i < total; i++) {
    const id = CLUSTERS[i % areas]!.id;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

describe("selectIndexView — composition fallback", () => {
  it("shows composition while the fetch is still in flight", () => {
    const v = view();
    assert.equal(v.asked, false);
    assert.equal(v.total, TOTAL);
    assert.deepEqual(v.values, [20, 10, 8, 2]);
    assert.deepEqual(v.weights, [1, 0.5, 0.4, 0.1]);
  });

  it("shows composition when the counter is disabled or unwritten", () => {
    assert.equal(view({}).asked, false);
  });

  // The bug this gate exists for: one visitor asking one question used to flip
  // the whole card into a single full-height column beside three stubs, with a
  // hero reading "1". A sample of one is not a distribution.
  it("does not flip on the first question", () => {
    const v = view({ about: 1 });
    assert.equal(v.asked, false);
    assert.equal(v.total, TOTAL, "hero still reads the index, not '1'");
  });

  it("does not flip just below the retrieval threshold", () => {
    assert.equal(view(spread(MIN_DEMAND_TOTAL - 1, MIN_DEMAND_AREAS)).asked, false);
  });

  it("does not flip when the retrievals are concentrated in too few areas", () => {
    // Plenty of volume, but it is one person's single interest.
    const v = view(spread(MIN_DEMAND_TOTAL * 3, MIN_DEMAND_AREAS - 1));
    assert.equal(v.asked, false);
  });
});

describe("selectIndexView — demand", () => {
  it("flips once there is enough spread across enough areas", () => {
    const v = view(spread(MIN_DEMAND_TOTAL, MIN_DEMAND_AREAS));
    assert.equal(v.asked, true, "thresholds are inclusive at the boundary");
    assert.equal(v.total, MIN_DEMAND_TOTAL);
  });

  it("reports the retrieval total and normalises columns to the busiest", () => {
    const v = view({ core: 5, about: 30, projects: 10, ask: 15 });
    assert.equal(v.asked, true);
    assert.equal(v.total, 60);
    assert.deepEqual(v.values, [5, 30, 10, 15]);
    assert.deepEqual(v.weights, [5 / 30, 1, 10 / 30, 15 / 30]);
  });

  it("keeps areas nobody asked about at zero rather than dropping them", () => {
    const v = view({ core: 20, about: 20, projects: 20 });
    // 'ask' has no demand; it still needs a slot so the card can draw it as a
    // stub. An area that is absent and an area that is empty are different.
    assert.equal(v.values.length, CLUSTERS.length);
    assert.equal(v.values[3], 0);
    assert.equal(v.weights[3], 0);
  });

  it("ignores counts for clusters the build no longer has", () => {
    const v = view({ core: 20, about: 20, projects: 20, retired: 500 });
    assert.equal(v.total, 60, "a stale cluster id must not inflate the total");
  });

  it("treats corrupt counts as no data", () => {
    const v = view({ core: 20, about: 20, projects: 20, ask: -5 });
    assert.equal(v.values[3], 0);
    assert.equal(v.total, 60);
    assert.ok(v.weights.every((w) => w >= 0));
  });
});
