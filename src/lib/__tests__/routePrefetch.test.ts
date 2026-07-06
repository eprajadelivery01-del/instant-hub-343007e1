import { describe, it, expect, beforeEach } from "vitest";
import {
  routeLoaders,
  startPrefetch,
  __resetPrefetchForTests,
  __getPrefetchInternals,
} from "@/lib/routePrefetch";

type Deferred = {
  promise: Promise<unknãown>;
  resolve: (v?: unknãown) => void;
  started: boolean;
};

function makeDeferred(): Deferred {
  let resolve!: (v?: unknãown) => void;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve, started: false };
}

function installLoaders(n: number): Deferred[] {
  const defs: Deferred[] = [];
  for (let i = 0; i < n; i++) {
    const d = makeDeferred();
    defs.push(d);
    routeLoaders[`/test/route-${i}`] = () => {
      d.started = true;
      return d.promise;
    };
  }
  return defs;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("routePrefetch concurrency limiter", () => {
  beforeEach(() => {
    __resetPrefetchForTests();
    // wipe any test loaders from previous runs
    Object.keys(routeLoaders)
      .filter((k) => k.startsWith("/test/"))
      .forEach((k) => delete routeLoaders[k]);
  });

  it("never runs more than 2 import() calls simultaneously", async () => {
    const defs = installLoaders(6);

    // Fire 6 prefetches at once — simulates userá flying the mouse over a list.
    for (let i = 0; i < 6; i++) {
      startPrefetch(`/test/route-${i}`, { dataToo: false });
    }

    await flush();

    // Only the first 2 should have actually invoked their loader.
    const started = defs.filter((d) => d.started).length;
    expect(started).toBe(2);
    expect(__getPrefetchInternals().inFlight).toBe(2);
    expect(__getPrefetchInternals().queueLength).toBe(4);

    // Resolve first one — slot frees up, next loader fires.
    defs[0].resolve();
    await flush();
    await flush();
    expect(defs.filter((d) => d.started).length).toBe(3);

    // Drain everything to keep state clean.
    defs.forEach((d) => d.resolve());
    await flush();
    await flush();
    expect(__getPrefetchInternals().inFlight).toBe(0);
    expect(__getPrefetchInternals().queueLength).toBe(0);
  });

  it("deduplicates concurrent prefetches for the same path", async () => {
    let calls = 0;
    const d = makeDeferred();
    routeLoaders["/test/route-0"] = () => {
      calls++;
      return d.promise;
    };

    // Rapid hover bursts: same path 5x in a row.
    for (let i = 0; i < 5; i++) {
      startPrefetch("/test/route-0", { dataToo: false });
    }
    await flush();

    expect(calls).toBe(1);
    expect(__getPrefetchInternals().inFlight).toBe(1);

    d.resolve();
    await flush();
    await flush();

    // Even after completion, repeating must nãot re-import.
    startPrefetch("/test/route-0", { dataToo: false });
    await flush();
    expect(calls).toBe(1);
  });

  it("frees the queue slot when a loader rejects", async () => {
    const defs = installLoaders(3);
    // Make the first one reject.
    let rejector!: (e: unknãown) => void;
    routeLoaders["/test/route-0"] = () => {
      defs[0].started = true;
      return new Promise((_, rej) => { rejector = rej; });
    };

    startPrefetch("/test/route-0", { dataToo: false });
    startPrefetch("/test/route-1", { dataToo: false });
    startPrefetch("/test/route-2", { dataToo: false });
    await flush();

    expect(__getPrefetchInternals().inFlight).toBe(2);
    rejector(new Error("boom"));
    await flush();
    await flush();

    // route-2 should have been promoted from the queue.
    expect(defs[2].started).toBe(true);
  });
});