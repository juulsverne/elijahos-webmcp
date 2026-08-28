// What the index card's columns measure.
//
// Two readings of the same 47 particles:
//   composition — how much knowledge sits in each area (always available)
//   demand      — how often each area was actually drawn on to answer
//
// Demand is the better reading, but only once there is enough of it. Switching
// on the first question would render a single full-height column beside five
// stubs and a hero reading "1", which is both uglier than the composition and a
// worse claim: one question is not a distribution. The gates below make the
// card wait until the shape means something.
//
// Kept free of React (and of the generated JSON) so it can be unit-tested
// directly — `--conditions=react-server` leaves useState/useEffect undefined,
// so anything importing them is untestable in this repo's runner.

export type IndexCluster = { id: string; chunks: number; weight: number };

export type IndexView = {
  /** True when the columns are showing real demand rather than composition. */
  asked: boolean;
  total: number;
  values: number[];
  /** Column heights, normalised so the busiest area is 1. */
  weights: number[];
};

/**
 * Minimum retrievals before demand replaces composition. Each answered question
 * credits every area it drew on, so this is roughly ten questions, not twenty —
 * low enough to flip within a day of real traffic, high enough that one curious
 * visitor can't define the shape.
 */
export const MIN_DEMAND_TOTAL = 20;

/**
 * …spread across at least this many areas. Twenty retrievals that all landed in
 * one area is a single interest, not a distribution, and drawing it as a lone
 * column beside five stubs would misrepresent both.
 */
export const MIN_DEMAND_AREAS = 3;

/**
 * Pick the reading. `hits` is null while the fetch is in flight and empty when
 * the counter is disabled or nobody has asked yet; both fall back to
 * composition, so an unconfigured deploy shows a real shape rather than a
 * placeholder.
 */
export function selectIndexView(
  clusters: IndexCluster[],
  total: number,
  hits: Map<string, number> | null,
): IndexView {
  const demand = clusters.map((c) => {
    const n = hits?.get(c.id) ?? 0;
    // A negative or non-finite count can only be corrupt; treat it as no data
    // rather than letting it drag the normalisation negative.
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const demandTotal = demand.reduce((a, b) => a + b, 0);
  const areasWithDemand = demand.filter((d) => d > 0).length;

  if (demandTotal >= MIN_DEMAND_TOTAL && areasWithDemand >= MIN_DEMAND_AREAS) {
    const max = Math.max(...demand);
    return {
      asked: true,
      total: demandTotal,
      values: demand,
      weights: demand.map((d) => d / max),
    };
  }

  return {
    asked: false,
    total,
    values: clusters.map((c) => c.chunks),
    weights: clusters.map((c) => c.weight),
  };
}
