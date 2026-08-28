// Memoize async setup once it succeeds, but do not cache transient failures.
// Useful for route-level schema/bootstrap work that should be shared in-flight
// without poisoning the process until the next cold start if the first attempt
// fails.

export function createRetryableSetup(setup: () => Promise<void>): () => Promise<void> {
  let ready: Promise<void> | null = null;

  return () => {
    ready ??= setup().catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  };
}
