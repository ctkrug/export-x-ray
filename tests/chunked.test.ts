import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { forEachChunked } from "../src/parsers/chunked";

describe("forEachChunked", () => {
  it("visits every item in order", async () => {
    const seen: number[] = [];
    await forEachChunked([1, 2, 3, 4], (item) => {
      seen.push(item);
    });
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it("passes the item's index alongside the item", async () => {
    const pairs: Array<[string, number]> = [];
    await forEachChunked(["a", "b", "c"], (item, index) => {
      pairs.push([item, index]);
    });
    expect(pairs).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("yields once elapsed time crosses the threshold, then resets its clock", async () => {
    let yieldCount = 0;
    let tick = 0;
    // Advances 100ms per item, so a 150ms threshold trips every other item.
    const now = () => {
      tick += 100;
      return tick;
    };

    await forEachChunked([1, 2, 3, 4], () => {}, {
      now,
      yieldEveryMs: 150,
      yield: async () => {
        yieldCount += 1;
      },
    });

    expect(yieldCount).toBe(2);
  });

  it("never yields when the clock never advances past the threshold", async () => {
    let yieldCount = 0;
    await forEachChunked([1, 2, 3], () => {}, {
      now: () => 0,
      yieldEveryMs: 150,
      yield: async () => {
        yieldCount += 1;
      },
    });
    expect(yieldCount).toBe(0);
  });

  it("handles an empty sequence without invoking fn or yielding", async () => {
    let calls = 0;
    let yields = 0;
    await forEachChunked(
      [],
      () => {
        calls += 1;
      },
      {
        yield: async () => {
          yields += 1;
        },
      },
    );
    expect(calls).toBe(0);
    expect(yields).toBe(0);
  });

  it("stops visiting items as soon as shouldStop reports true", async () => {
    const seen: number[] = [];
    let stop = false;

    await forEachChunked(
      [1, 2, 3, 4, 5],
      (item) => {
        seen.push(item);
        if (item === 2) stop = true;
      },
      { shouldStop: () => stop },
    );

    expect(seen).toEqual([1, 2]);
  });

  it("never calls fn when shouldStop is already true", async () => {
    const seen: number[] = [];
    await forEachChunked(
      [1, 2, 3],
      (item) => {
        seen.push(item);
      },
      { shouldStop: () => true },
    );
    expect(seen).toEqual([]);
  });

  it("awaits an async fn before moving to the next item", async () => {
    const order: string[] = [];
    await forEachChunked([1, 2], async (item) => {
      order.push(`start-${item}`);
      await Promise.resolve();
      order.push(`end-${item}`);
    });
    expect(order).toEqual(["start-1", "end-1", "start-2", "end-2"]);
  });

  it("[property] visits exactly the items before shouldStop trips, for any stop point", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), fc.nat(), async (items, stopAt) => {
        const seen: number[] = [];
        let count = 0;
        await forEachChunked(
          items,
          (item) => {
            seen.push(item);
            count += 1;
          },
          { shouldStop: () => count >= stopAt },
        );
        expect(seen).toEqual(items.slice(0, Math.min(stopAt, items.length)));
      }),
    );
  });
});
