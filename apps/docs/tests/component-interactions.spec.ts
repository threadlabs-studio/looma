import { test, ready } from "./docs-fixture";
import { interactionCases } from "./interaction-cases";

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  test.describe(`${viewport.width}px reader actions`, () => {
    test.use({ viewport });
    for (const state of interactionCases) {
      test(`${state.component}: ${state.name}`, async ({ page }) => {
        await page.goto(`components/${state.component}/`);
        await ready(page);
        const scenario = page.locator(`[data-preview-example="${state.example}"] .looma-preview-scenario__stage`);
        await state.run(page, scenario);
      });
    }
  });
}
