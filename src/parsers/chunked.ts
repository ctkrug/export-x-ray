export interface ChunkedIterationOptions {
  /** Yield back to the event loop once this many ms have elapsed since the last yield. */
  yieldEveryMs?: number;
  /** Injectable clock, for deterministic tests. Defaults to performance.now. */
  now?: () => number;
  /** Injectable yield primitive, for deterministic tests. Defaults to a macrotask via setTimeout. */
  yield?: () => Promise<void>;
  /** Checked before every item; once true, the loop stops without visiting the rest. */
  shouldStop?: () => boolean;
}

const DEFAULT_YIELD_EVERY_MS = 150;

function defaultYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Runs fn over items, periodically awaiting a macrotask so the caller never
 * holds the main thread for more than ~yieldEveryMs at a stretch — the
 * mechanism that keeps the UI responsive while a large archive parses.
 */
export async function forEachChunked<T>(
  items: Iterable<T>,
  fn: (item: T, index: number) => void | Promise<void>,
  options: ChunkedIterationOptions = {},
): Promise<void> {
  const now = options.now ?? (() => performance.now());
  const yieldToEventLoop = options.yield ?? defaultYield;
  const yieldEveryMs = options.yieldEveryMs ?? DEFAULT_YIELD_EVERY_MS;
  const shouldStop = options.shouldStop ?? (() => false);

  let lastYield = now();
  let index = 0;
  for (const item of items) {
    if (shouldStop()) return;
    await fn(item, index);
    index += 1;
    if (now() - lastYield >= yieldEveryMs) {
      await yieldToEventLoop();
      lastYield = now();
    }
  }
}
