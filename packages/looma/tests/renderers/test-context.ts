import { AsyncLocalStorage } from "node:async_hooks";
import { aroundEach, expect as sharedExpect, type TestContext } from "vitest";

const active = new AsyncLocalStorage<{ context: TestContext; lane: number }>();
const count = JSON.parse(process.env.LOOMA_BROWSER_ENDPOINTS ?? "[]").length || 1;
const available = process.env.CI && process.env.LOOMA_PARALLEL_SCENARIOS !== "1"
  ? [(Number(process.env.VITEST_POOL_ID ?? 1) - 1) % count]
  : Array.from({ length: count }, (_, index) => index);
const waiting: ((lane: number) => void)[] = [];
aroundEach(async (run, context) => {
  const lane = available.length ? available.shift()! : await new Promise<number>(resolve => waiting.push(resolve));
  try { await active.run({ context, lane }, run); }
  finally { const next = waiting.shift(); if (next) next(lane); else available.push(lane); }
});
export function testLane(): number { return active.getStore()?.lane ?? 0; }
export function testContext(): TestContext {
  const context = active.getStore()?.context;
  if (!context) throw new Error("A browser fixture must belong to a running scenario.");
  return context;
}

// Vitest's per-test expect carries polling and assertion state for concurrent scenarios.
// Outside a scenario, retain collection-time helpers such as expect.extend.
export const expect: typeof sharedExpect = new Proxy(sharedExpect, {
  apply(_target, receiver, args) { return Reflect.apply(active.getStore()?.context.expect ?? sharedExpect, receiver, args); },
  get(_target, key) { return Reflect.get(active.getStore()?.context.expect ?? sharedExpect, key); },
});
