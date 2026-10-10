import type { Page } from "@playwright/test";
import type { AxeResults } from "axe-core";

/** Preserve the complete automated finding set; existing debt stays visible in reviewed baselines. */
export async function accessibilityFindings(page: Page) {
  // Isolated popup previews are real documents; axe must also run inside those frames.
  for (const frame of page.frames()) await frame.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const results: AxeResults = await page.evaluate(async () => {
    const axe = (window as typeof window & { axe: typeof import("axe-core") }).axe;
    return axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  });
  return results.violations.map(({ id, impact, nodes }) => ({
    id, impact, targets: nodes.map(({ target }) => target).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en"))
  })).sort((a, b) => a.id.localeCompare(b.id, "en"));
}
