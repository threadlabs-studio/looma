import { availableParallelism } from "node:os";
import { chromium } from "playwright";

/** Independent input devices for concurrent scenarios, owned by one foreground test runner. */
export async function startSuiteBrowsers() {
  if (process.env.LOOMA_BROWSER_ENDPOINT) return async () => {};
  const servers: Awaited<ReturnType<typeof chromium.launchServer>>[] = [];
  try {
    const count = process.env.LOOMA_PARALLEL_SCENARIOS === "1" ? Number(process.env.LOOMA_SCENARIO_CONCURRENCY ?? 4) : process.env.CI ? availableParallelism() : 1;
    if (!Number.isInteger(count) || count < 1) throw new Error("Scenario concurrency must be a positive integer.");
    for (let index = 0; index < count; index++) servers.push(await chromium.launchServer({ host: "127.0.0.1" }));
    process.env.LOOMA_BROWSER_ENDPOINTS = JSON.stringify(servers.map(server => server.wsEndpoint()));
    process.env.LOOMA_BROWSER_ENDPOINT = servers[0]!.wsEndpoint();
    return async () => {
      delete process.env.LOOMA_BROWSER_ENDPOINTS; delete process.env.LOOMA_BROWSER_ENDPOINT;
      await Promise.all(servers.map(server => server.close()));
    };
  } catch (error) { await Promise.all(servers.map(server => server.close())); throw error; }
}
