/**
 * Runs `setup` once and shares the result between callers. A failure is not
 * remembered, so the next call tries again instead of failing until restart.
 */
export function runOnce(setup: () => Promise<void>): () => Promise<void> {
  let pending: Promise<void> | null = null;
  return () => {
    pending ??= setup().catch((error) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}
