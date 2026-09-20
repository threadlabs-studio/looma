import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

const releaseMode = process.env.LOOMA_DOCS_RELEASE_MODE ?? "preview";
const expectedAnnouncement = releaseMode === "candidate"
  ? "Release 1 Candidate 0.2.5 is available"
  : "Release 1 Candidate documentation preview";

const candidatePages = [
  { path: "./", heading: "Getting Started" },
  { path: "release-1-support", heading: "Release 1 Support and Limitations" },
  { path: "components/ui-context-menu", heading: "Context Menu" }
] as const;

async function expectNoAxeViolations(page: Page): Promise<void> {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document);
    return results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target)
    }));
  });

  expect(violations).toEqual([]);
}

declare global {
  interface Window {
    axe: typeof axe;
  }
}

for (const candidatePage of candidatePages) {
  test(`${candidatePage.heading} is accessible and reflows at 320 CSS pixels`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(candidatePage.path, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: candidatePage.heading })
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByText(expectedAnnouncement, { exact: false })).toBeVisible();

    const robotsContent = await page.locator('meta[name="robots"]').getAttribute("content");
    if (releaseMode === "preview") {
      expect(robotsContent).toMatch(/noindex/i);
    } else {
      expect(robotsContent).not.toMatch(/noindex/i);
    }

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await expectNoAxeViolations(page);
  });
}

test("the install path exposes the facade package and the Candidate boundary", async ({
  page
}) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("@threadlabs/looma", { exact: true }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /not published yet|publication pending|become usable when the Candidate is published/i
  );
  const supportLink = page
    .locator("main")
    .getByRole("link", { name: "Release 1 support and limitations", exact: true });
  await supportLink.focus();
  await expect(supportLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Release 1 Support and Limitations" })
  ).toBeVisible();
});

test("the context-menu docs expose both visible and pointer action paths", async ({
  page
}) => {
  await page.goto("components/ui-context-menu", { waitUntil: "domcontentloaded" });

  const trigger = page.getByRole("button", { name: "Document actions", exact: true });
  const target = page.locator("#docs-context-menu-target");

  await expect(trigger).toBeVisible();
  await expect(target).toBeVisible();
  await expect(target).toContainText("Right-click this document");

  await target.click({ button: "right", position: { x: 24, y: 24 } });
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
});

test("the component catalog exposes the complete library and filters live previews", async ({
  page
}) => {
  await page.goto("components", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Components" })).toBeVisible();
  await expect(page.locator(".looma-component-card")).toHaveCount(49);
  await expect(page.getByText("Showing 49 components", { exact: true })).toBeVisible();

  const sidebar = page.locator(".theme-doc-sidebar-menu");
  await expect(sidebar.getByRole("link", { name: "Button", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Editor Table Overlay", exact: true })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search components" });
  await search.fill("toast");
  await expect(page.getByText("Showing 1 component", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Toast Region" })).toBeVisible();
  await expect(page.locator(".looma-component-card")).toHaveCount(1);

  await search.fill("checkbox");
  const checkbox = page.getByLabel("Product updates");
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
});

test("component pages supply a live preview when no bespoke example exists", async ({
  page
}) => {
  await page.goto("components/ui-avatar", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Avatar" })).toBeVisible();
  await expect(page.locator(".looma-component-preview")).toBeVisible();
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
});
