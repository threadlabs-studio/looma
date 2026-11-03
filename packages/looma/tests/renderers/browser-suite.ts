import { startSuiteBrowsers } from "./browser-pool.ts";
import { startFixtureServers } from "./fixture-server.ts";
import prepare from "./prepare-library.ts";

/** Share transformed modules and a browser process, with fresh pages for each scenario. */
export default async function setup() {
  const release = await prepare();
  let closeFixtures: (() => Promise<void>) | undefined;
  let closeBrowsers: (() => Promise<void>) | undefined;
  const cleanup = async () => {
    try { await closeBrowsers?.(); }
    finally { try { await closeFixtures?.(); } finally { await release?.(); } }
  };
  try {
    closeFixtures = await startFixtureServers();
    closeBrowsers = await startSuiteBrowsers();
    return cleanup;
  } catch (error) { await cleanup(); throw error; }
}
