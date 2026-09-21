import { expect, test, type Locator, type Page } from "@playwright/test";
import axe from "axe-core";

import componentApi from "../../../generated/component-api.json";

const releaseMode = process.env.LOOMA_DOCS_RELEASE_MODE ?? "preview";
const expectedAnnouncement = releaseMode === "candidate"
  ? "Release 1 Candidate 0.2.7 is available"
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

function contrastRatio(foreground: string, background: string): number {
  const parse = (color: string): [number, number, number] => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${color}`);
    return channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
  };
  const luminance = ([red, green, blue]: [number, number, number]) =>
    0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const foregroundLuminance = luminance(parse(foreground));
  const backgroundLuminance = luminance(parse(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

async function computedOpaqueColors(locator: Locator): Promise<{
  foreground: string;
  background: string;
}> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    type Rgba = [number, number, number, number];
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const parse = (color: string): Rgba => {
      if (!context) throw new Error("Canvas color conversion is unavailable");
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
      return [red!, green!, blue!, alpha! / 255];
    };
    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
        alpha
      ];
    };
    // WCAG compares rendered colors, so composite translucent ancestor layers before measuring.
    const layers: Rgba[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      layers.push(parse(getComputedStyle(node).backgroundColor));
    }
    const background = layers.reverse().reduce(
      (visible, layer) => composite(layer, visible),
      [255, 255, 255, 1] as Rgba
    );
    const foreground = composite(parse(style.color), background);
    const cssColor = ([red, green, blue]: Rgba) => `rgb(${red} ${green} ${blue})`;
    return { foreground: cssColor(foreground), background: cssColor(background) };
  });
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

test("the documentation shell uses the Looma mark", async ({ page }) => {
  await page.goto("./");

  const logo = page.locator(".navbar__logo img").first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/looma/img/looma-mark.svg");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/looma/img/looma-mark.svg"
  );
});

test("the context-menu docs expose both visible and pointer action paths", async ({
  page
}) => {
  await page.goto("components/ui-context-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const scenario = page.locator("[data-preview-scenario='Target binding']");
  const trigger = scenario.getByRole("button", { name: "Open menu", exact: true });
  const target = scenario.locator("#context-menu-target");

  await expect(trigger).toBeVisible();
  await expect(target).toBeVisible();
  await expect(target).toHaveText("Open menu");

  await target.click({ button: "right", position: { x: 24, y: 24 } });
  const firstItem = page.getByRole("menuitem", { name: "First item", exact: true });
  await expect(firstItem).toBeVisible();
  const contextSurface = page.locator("[data-component-root~='ui-context-menu'] [popover]").first();
  await expect(contextSurface).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const geometry = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>("#context-menu-target")!;
    const surface = document.querySelector<HTMLElement>("[data-component-root~='ui-context-menu'] [popover]")!;
    const targetBounds = target.getBoundingClientRect();
    const surfaceBounds = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    return {
      expectedLeft: targetBounds.left + 24,
      // Point-anchored overlays retain the shared 4px surface gap so the
      // pointer does not sit directly on the first menu item.
      expectedTop: targetBounds.top + 24 + 4,
      left: surfaceBounds.left,
      top: surfaceBounds.top,
      borderStyle: style.borderStyle,
      outlineStyle: style.outlineStyle,
      padding: style.padding,
      backgroundColor: style.backgroundColor
    };
  });
  expect(Math.abs(geometry.left - geometry.expectedLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.top - geometry.expectedTop)).toBeLessThanOrEqual(2);
  expect(geometry.borderStyle).toBe("none");
  expect(geometry.outlineStyle).toBe("none");
  expect(geometry.padding).toBe("0px");
  expect(geometry.backgroundColor).toBe("rgba(0, 0, 0, 0)");
});

test("menu for association toggles the anchored menu", async ({ page }) => {
  await page.goto("components/ui-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  const scenario = page.locator("[data-preview-scenario='for']");
  const trigger = scenario.getByRole("button", { name: "Open menu" });
  const menu = scenario.getByRole("menu", { name: "Document actions" });
  await expect(menu).not.toBeVisible();
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("affordance-scope visibly reveals an anticipatory Looma control near the pointer", async ({ page }) => {
  await page.goto("components/ui-affordance-scope", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default radius']");
  const affordance = scenario.locator("[data-component-root~='ui-icon-button']");
  await expect(affordance).toHaveRole("button", { name: "Add" });
  await expect(affordance).toHaveCSS("opacity", "0");
  const bounds = await affordance.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x - 8, bounds!.y + bounds!.height / 2);
  await expect(affordance).toHaveAttribute("data-ui-proximity", "near");
  await expect(affordance).toHaveCSS("opacity", "1");
});

test("popover trigger opens, positions, and closes the settled component", async ({ page }) => {
  await page.goto("components/ui-popover", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Trigger binding']");
  const trigger = scenario.getByRole("button", { name: "Open popover" });
  const popover = scenario.locator("[data-component-root~='ui-popover']");
  await expect(popover).not.toBeVisible();
  await trigger.click();
  await expect(popover).toBeVisible();
  expect(await popover.evaluate((element) => element.matches(":popover-open"))).toBe(true);
  const positions = await Promise.all([trigger.boundingBox(), popover.boundingBox()]);
  expect(positions[0]).not.toBeNull();
  expect(positions[1]).not.toBeNull();
  expect(positions[1]!.y).toBeGreaterThanOrEqual(positions[0]!.y + positions[0]!.height);
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
});

test("tooltip uses a Looma trigger and a crisp, pointed overlay surface", async ({ page }) => {
  await page.goto("components/ui-tooltip", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Target binding']");
  const trigger = scenario.locator("[data-component-root~='ui-button']");
  const tooltip = scenario.locator("[data-component-root~='ui-tooltip']");
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await expect(tooltip).toBeVisible();
  const treatment = await tooltip.evaluate((element) => {
    const rootStyle = getComputedStyle(element);
    const surface = element.querySelector<HTMLElement>(".tooltip__surface")!;
    const surfaceStyle = getComputedStyle(surface);
    const arrowStyle = getComputedStyle(surface, "::after");
    return {
      rootOutline: rootStyle.outlineStyle,
      radius: parseFloat(surfaceStyle.borderRadius),
      shadow: surfaceStyle.boxShadow,
      arrowContent: arrowStyle.content,
      arrowWidth: parseFloat(arrowStyle.width)
    };
  });
  expect(treatment.rootOutline).toBe("none");
  expect(treatment.radius).toBeGreaterThan(0);
  expect(treatment.shadow).not.toBe("none");
  expect(treatment.arrowContent).not.toBe("none");
  expect(treatment.arrowWidth).toBeGreaterThan(0);
});

test("toast-region starts empty, fires on demand, and uses a full-size dismiss control", async ({ page }) => {
  await page.goto("components/ui-toast-region", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default closed']");
  const region = scenario.locator("[data-component-root~='ui-toast-region']");
  await expect(region.locator(".toast")).toHaveCount(0);
  await scenario.getByRole("button", { name: "Show toast" }).click();
  const toast = region.locator(".toast");
  await expect(toast).toBeVisible();
  const dismiss = toast.getByRole("button", { name: /Dismiss page saved/i });
  const treatment = await region.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderStyle: style.borderStyle,
      outlineStyle: style.outlineStyle,
      backgroundColor: style.backgroundColor
    };
  });
  expect(treatment).toEqual({
    borderStyle: "none",
    outlineStyle: "none",
    backgroundColor: "rgba(0, 0, 0, 0)"
  });
  const dismissBounds = await dismiss.boundingBox();
  expect(dismissBounds).not.toBeNull();
  expect(dismissBounds!.width).toBeGreaterThanOrEqual(32);
  expect(dismissBounds!.height).toBeGreaterThanOrEqual(32);
  await dismiss.click();
  await expect(toast).toHaveCount(0);
});

test("the component catalog exposes the complete library and filters live previews", async ({
  page
}) => {
  await page.goto("components", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Components" })).toBeVisible();
  await expect(page.locator(".looma-catalog-hero")).toContainText(
    "Core, layout, form, display, and overlay building blocks"
  );
  await expect(page.locator(".looma-catalog-hero")).not.toContainText("Forty-nine");
  await expect(page.locator(".looma-component-card")).toHaveCount(36);
  await expect(page.getByText("Showing 36 components", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Cluster" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Chip" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Floating Action Button" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Menu Item" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Tree Item" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Search Result Row" })).toHaveCount(0);
  const sidebar = page.locator(".theme-doc-sidebar-menu");
  await expect(sidebar.getByRole("link", { name: "Button", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Floating Action Button", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Editor Table Overlay", exact: true })).toHaveCount(0);

  const affordanceCard = page.locator('[data-component-card="ui-affordance-scope"]');
  const anticipatoryControl = affordanceCard.locator(
    '[data-component-root~="ui-icon-button"][data-anticipatory="true"]'
  );
  await expect(anticipatoryControl).toBeVisible();
  await expect(anticipatoryControl).toHaveCSS("opacity", "1");
  const affordanceTreatment = await anticipatoryControl.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      background: style.backgroundColor,
      border: style.borderTopStyle,
      width: bounds.width,
      height: bounds.height
    };
  });
  expect(affordanceTreatment.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(affordanceTreatment.border).not.toBe("none");
  expect(affordanceTreatment.width).toBeGreaterThanOrEqual(32);
  expect(affordanceTreatment.height).toBeGreaterThanOrEqual(32);

  const search = page.getByRole("searchbox", { name: "Search components" });
  await search.fill("toast");
  await expect(page.getByText("Showing 1 component", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Toast Region" })).toBeVisible();
  await expect(page.locator(".looma-component-card")).toHaveCount(1);

  await search.fill("checkbox");
  const checkbox = page.getByLabel("Checkbox");
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});

test("Editor is a top-level subsystem with concise component names", async ({ page }) => {
  await page.goto("editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Editor" })).toBeVisible();
  await expect(page.getByText("Showing 7 components", { exact: true })).toBeVisible();
  const sidebar = page.locator(".theme-doc-sidebar-menu");
  await expect(sidebar.getByRole("link", { name: "Toolbar", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Table Overlay", exact: true })).toBeVisible();
  await expect(sidebar.getByText("Editor Table Overlay", { exact: true })).toHaveCount(0);
  await expect(page.locator(".navbar").getByRole("link", { name: "Editor", exact: true })).toBeVisible();
});

test("editor catalog overlays stay inside their preview cards", async ({ page }) => {
  await page.goto("editor", { waitUntil: "networkidle" });

  for (const name of ["Mention Menu", "Slash Menu"] as const) {
    const tag = `ui-editor-${name.toLowerCase().replace(" ", "-")}`;
    const card = page.locator(`[data-component-card="${tag}"]`);
    await page.evaluate((componentTag) => {
      document.querySelector(`[data-component-card="${componentTag}"]`)
        ?.scrollIntoView({ block: "center" });
    }, tag);
    await expect(card).toBeVisible();
    const preview = card.locator(".looma-component-card__preview");
    const surface = preview.locator(`[data-component-root~="${tag}"]`);
    await expect(surface).toBeVisible();

    const [previewBounds, surfaceBounds] = await Promise.all([
      preview.boundingBox(),
      surface.boundingBox()
    ]);
    expect(previewBounds).not.toBeNull();
    expect(surfaceBounds).not.toBeNull();
    expect(surfaceBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x - 1);
    expect(surfaceBounds!.y).toBeGreaterThanOrEqual(previewBounds!.y - 1);
    expect(surfaceBounds!.x + surfaceBounds!.width).toBeLessThanOrEqual(
      previewBounds!.x + previewBounds!.width + 1
    );
    expect(surfaceBounds!.y + surfaceBounds!.height).toBeLessThanOrEqual(
      previewBounds!.y + previewBounds!.height + 1
    );
  }

  const contextCard = page.locator('[data-component-card="ui-editor-table-context-menu"]');
  await page.evaluate(() => {
    document.querySelector('[data-component-card="ui-editor-table-context-menu"]')
      ?.scrollIntoView({ block: "center" });
  });
  const contextPreview = contextCard.locator(".looma-component-card__preview");
  const contextSurface = contextPreview.locator(".ui-editor-table-context-menu");
  await expect(contextSurface).toBeVisible();
  const [contextPreviewBounds, contextSurfaceBounds] = await Promise.all([
    contextPreview.boundingBox(),
    contextSurface.boundingBox()
  ]);
  expect(contextPreviewBounds).not.toBeNull();
  expect(contextSurfaceBounds).not.toBeNull();
  expect(contextSurfaceBounds!.y).toBeGreaterThanOrEqual(contextPreviewBounds!.y - 1);
  expect(contextSurfaceBounds!.y + contextSurfaceBounds!.height).toBeLessThanOrEqual(
    contextPreviewBounds!.y + contextPreviewBounds!.height + 1
  );

  const overlayCard = page.locator('[data-component-card="ui-editor-table-overlay"]');
  await page.evaluate(() => {
    document.querySelector('[data-component-card="ui-editor-table-overlay"]')
      ?.scrollIntoView({ block: "center" });
  });
  const tableStage = overlayCard.locator(".demo-editor-table-stage");
  const tableOverlay = tableStage.locator('[data-component-root~="ui-editor-table-overlay"]');
  await expect(tableStage.getByRole("table", { name: "Example table" })).toBeVisible();
  await expect(tableOverlay).toBeVisible();
  const [tableBounds, overlayBounds] = await Promise.all([
    tableStage.getByRole("table", { name: "Example table" }).boundingBox(),
    tableOverlay.boundingBox()
  ]);
  expect(tableBounds).not.toBeNull();
  expect(overlayBounds).not.toBeNull();
  expect(overlayBounds!.width).toBeGreaterThanOrEqual(tableBounds!.width - 1);
  expect(overlayBounds!.height).toBeGreaterThanOrEqual(tableBounds!.height - 1);
});

test("table overlay uses one structured geometry property", async ({ page }) => {
  await page.goto("components/ui-editor-table-overlay", { waitUntil: "domcontentloaded" });

  const primary = page.locator("[data-preview-scenario='Open with geometry']");
  const overlay = primary.locator('[data-component-root~="ui-editor-table-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("button", { name: "Cell actions" })).toBeVisible();
  await expect(overlay.getByRole("button", { name: /Insert row/ })).toHaveCount(3);
  await expect(overlay.getByRole("button", { name: /Insert column/ })).toHaveCount(3);

  const code = primary.locator(".looma-mode-code").first();
  await expect(code).toContainText(".geometry = tableGeometry");
  await expect(code).not.toContainText("row-boundaries");
  await expect(code).not.toContainText("column-boundaries");
  await expect(code).not.toContainText("active-cell");
});

test("editor table menus use one action capability set", async ({ page }) => {
  for (const tag of ["ui-editor-table-context-menu", "ui-editor-table-toolbar"] as const) {
    await page.goto(`components/${tag}`, { waitUntil: "domcontentloaded" });
    const configured = page.locator("[data-preview-scenario='Actions']");
    await expect(configured.locator("[data-action^='add-row']").first()).toBeVisible();
    const code = configured.locator(".looma-mode-code").first();
    await expect(code).toContainText(".actions = tableActions");
    await expect(code).not.toContainText("can-add-row");
    await expect(code).not.toContainText("can-delete");
    await expect(code).not.toContainText("can-merge");
  }

  await page.goto("components/ui-editor-table-toolbar", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  await expect(
    page.locator("[data-preview-scenario='Open']").getByRole("button", { name: "Table options" })
  ).toHaveCount(0);
  await expect(
    page.locator("[data-preview-scenario='Actions']").getByRole("button", { name: "Table options" })
  ).toBeVisible();
});

test("every component page renders distinct, visible, coded scenarios", async ({ page }) => {
  for (const component of componentApi.components) {
    await page.goto(`components/${component.tag}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
    const scenarios = page.locator("[data-preview-scenario]");
    const scenarioCount = await scenarios.count();
    expect(
      scenarioCount,
      `${component.tag} should render more than one scenario`
    ).toBeGreaterThanOrEqual(2);
    const labels = await scenarios.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-preview-scenario") ?? "")
    );
    expect(new Set(labels).size, `${component.tag} should use unique scenario labels`).toBe(labels.length);
    expect(labels.every(Boolean), `${component.tag} should label every scenario`).toBe(true);
    expect(
      await scenarios.locator(".looma-component-mode-example").count(),
      `${component.tag} should put matching code on every scenario`
    ).toBe(scenarioCount);
    expect(
      await scenarios.locator(".looma-preview-scenario__stage").evaluateAll((stages) =>
        stages.every((stage) => {
          const bounds = stage.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0;
        })
      ),
      `${component.tag} scenario stages should have visible geometry`
    ).toBe(true);
    expect(
      await page.locator(`[data-component-root~="${component.tag}"]`).count(),
      `${component.tag} should lower to its live native root`
    ).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "SSR Markup" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Framework Snippets" })).toHaveCount(0);
  }
});

test("component pages supply a live preview when no bespoke example exists", async ({
  page
}) => {
  await page.goto("components/ui-avatar", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Avatar" })).toBeVisible();
  await expect(page.locator(".looma-component-preview")).toBeVisible();
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
});

test("avatar authoring uses ordinary images and avatar groups visibly overlap", async ({ page }) => {
  await page.goto("components/ui-avatar", { waitUntil: "domcontentloaded" });
  const imageScenario = page.locator("[data-preview-scenario='Image']");
  const authoredImage = imageScenario.locator(".avatar img:not(.avatar__managed-image)");
  await expect(authoredImage).toHaveCount(1);
  await expect(authoredImage).toBeVisible();
  expect(await authoredImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(imageScenario.locator(".looma-mode-code")).toContainText("<img");
  await expect(imageScenario.locator(".looma-mode-code")).not.toContainText("data-ui-avatar-fallback");

  await page.goto("components/ui-avatar-group", { waitUntil: "domcontentloaded" });
  const group = page.locator("[data-preview-scenario='Default maximum'] [data-component-root~='ui-avatar-group']");
  const avatars = group.locator("[data-component-root~='ui-avatar']");
  await expect(avatars).toHaveCount(3);
  const boxes = await avatars.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, width: bounds.width };
  }));
  expect(boxes[1]!.left).toBeLessThan(boxes[0]!.right);
  expect(boxes[2]!.left).toBeLessThan(boxes[1]!.right);
  expect(boxes[1]!.left - boxes[0]!.left).toBeLessThan(boxes[0]!.width);
});

test("the docs sidebar treatment reaches the footer on tall pages in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await page.goto("components/ui-avatar-group", { waitUntil: "domcontentloaded" });
    await page.evaluate((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".looma-component-preview")).toBeVisible();

    const geometry = await page.locator(".theme-doc-sidebar-container").evaluate((sidebar) => {
      const sidebarBounds = sidebar.getBoundingClientRect();
      const footerBounds = document.querySelector(".footer")!.getBoundingClientRect();
      return {
        sidebarBottom: sidebarBounds.bottom,
        footerTop: footerBounds.top,
        sidebarBackground: getComputedStyle(sidebar).backgroundColor
      };
    });
    expect(geometry.footerTop - geometry.sidebarBottom, `${theme} leaves a gap below the sidebar`).toBeLessThanOrEqual(1);
    expect(geometry.sidebarBackground).not.toBe("rgba(0, 0, 0, 0)");
  }
});

test("disclosure owns its trigger and animates one grid row between closed and open", async ({ page }) => {
  await page.goto("components/ui-disclosure", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default closed']");
  const disclosure = scenario.locator("[data-component-root~='ui-disclosure']");
  const trigger = disclosure.getByRole("button", { name: "Details" });
  const panel = disclosure.locator(".disclosure__panel");
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const closed = await panel.evaluate((element) => ({
    rows: getComputedStyle(element).gridTemplateRows,
    transition: getComputedStyle(element).transitionProperty
  }));
  expect(Number.parseFloat(closed.rows)).toBe(0);
  expect(closed.transition).toContain("grid-template-rows");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(disclosure).toHaveAttribute("data-state-open", "true");
  await expect.poll(() => panel.evaluate((element) => Number.parseFloat(getComputedStyle(element).gridTemplateRows)))
    .toBeGreaterThan(0);
  await expect(scenario.locator(".looma-mode-code").first()).not.toContainText("<button");
});

test("tabs generate a full-width tablist from labeled panels without raw button or ARIA wiring", async ({ page }) => {
  await page.goto("components/ui-tabs", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default horizontal']");
  const tabs = scenario.locator("[data-component-root~='ui-tabs']");
  const tablist = tabs.getByRole("tablist", { name: "View" });
  const tabButtons = tablist.getByRole("tab");
  await expect(tabButtons).toHaveCount(2);
  await expect(tabButtons.nth(0)).toHaveText("Preview");
  await expect(tabButtons.nth(1)).toHaveText("Code");

  const widths = await tabs.evaluate((root) => {
    const rootBounds = root.getBoundingClientRect();
    const listBounds = root.querySelector('[role="tablist"]')!.getBoundingClientRect();
    return { root: rootBounds.width, list: listBounds.width };
  });
  expect(Math.abs(widths.root - widths.list)).toBeLessThanOrEqual(1);
  const beforeWidth = widths.root;
  await tabButtons.nth(1).click();
  await expect(tabButtons.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tabpanel", { name: "Code" })).toBeVisible();
  expect(await tabs.evaluate((root) => root.getBoundingClientRect().width)).toBeCloseTo(beforeWidth, 0);

  const code = scenario.locator(".looma-mode-code").first();
  await expect(code).not.toContainText("<button");
  await expect(code).not.toContainText("role=\"tab");
  await expect(code).toContainText("<section");
});

test("tree infers containers from nesting and exposes an interactive default example", async ({ page }) => {
  await page.goto("components/ui-tree", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default']");
  const tree = scenario.getByRole("tree", { name: "Items" });
  const parent = tree.getByRole("treeitem", { name: "Parent" });
  const child = tree.getByRole("treeitem", { name: "Child" });
  const sibling = tree.getByRole("treeitem", { name: "Sibling" });
  const disclosure = parent.getByRole("button", { name: "Expand Parent" });
  await expect(disclosure).toBeVisible();
  await expect(sibling.getByRole("button", { name: "Expand Sibling" })).toBeHidden();
  await expect(sibling).not.toHaveAttribute("aria-expanded");
  await expect(parent).toHaveAttribute("aria-expanded", "false");
  await expect(child).toBeHidden();
  await disclosure.click();
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  await expect(child).toBeVisible();

  const code = scenario.locator(".looma-mode-code").first();
  await expect(code).not.toContainText("container");
  await expect(code).not.toContainText("slot=\"children\"");
  await expect(code).not.toContainText("<span>Parent");
  await expect(page.locator(".theme-doc-sidebar-menu").getByRole("link", { name: "Tree Item", exact: true })).toHaveCount(0);
  await expect(page.locator(".theme-doc-sidebar-menu").getByRole("link", { name: "Menu Item", exact: true })).toHaveCount(0);
});

test("compound-part API is documented on its owning component", async ({ page }) => {
  for (const [owner, part] of [
    ["ui-menu", "ui-menu-item"],
    ["ui-tree", "ui-tree-item"],
    ["ui-search-shell", "ui-search-result-row"],
  ] as const) {
    await page.goto(`components/${owner}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
    const apiTab = page.getByRole("tab", { name: "API" });
    await apiTab.click();
    await expect(apiTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".looma-compound-api").getByText(`<${part}>`, { exact: true })).toBeVisible();
  }
});

test("top bar stays visible and renders each authored region at desktop documentation widths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("components/ui-top-bar", { waitUntil: "domcontentloaded" });

  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const defaultBar = defaultScenario.locator("[data-component-root~='ui-top-bar']");
  await expect(defaultBar).toBeVisible();
  await expect(defaultBar).toContainText("Title");
  const defaultBounds = await defaultBar.boundingBox();
  expect(defaultBounds).not.toBeNull();
  expect(defaultBounds!.height).toBeGreaterThanOrEqual(48);

  const regionsScenario = page.locator("[data-preview-scenario='leading, search, and actions slots']");
  const regionsBar = regionsScenario.locator("[data-component-root~='ui-top-bar']");
  await expect(regionsBar).toBeVisible();
  await expect(regionsBar).toContainText("Back");
  await expect(regionsBar).toContainText("Search");
  await expect(regionsBar).toContainText("Save");
  await expect(regionsScenario.locator(".looma-mode-code")).not.toContainText("<button");
  await expect(regionsScenario.locator(".looma-mode-code")).toContainText("<ui-button");
});

test("search shell owns native dialog visibility and exposes configured regions without backdrop markup", async ({ page }) => {
  await page.goto("components/ui-search-shell", { waitUntil: "domcontentloaded" });

  const openScenario = page.locator("[data-preview-scenario='open']");
  const dialog = openScenario.getByRole("dialog", { name: "Search commands" });
  await expect(dialog).toBeVisible();
  await expect(openScenario.getByRole("searchbox", { name: "Search commands" })).toBeVisible();
  await expect(openScenario.locator(".search-shell__status")).toBeHidden();
  await expect(openScenario.locator(".search-shell__footer")).toBeHidden();
  await expect(openScenario.locator(".looma-mode-code")).not.toContainText('slot="backdrop"');
  await expect(openScenario.locator(".looma-mode-code")).toContainText("<ui-search-shell open");

  const configured = page.locator("[data-preview-scenario='label, dismissible, status, and footer']");
  const configuredDialog = configured.getByRole("dialog", { name: "Search documentation" });
  await expect(configuredDialog).toBeVisible();
  await expect(configuredDialog.getByText("3 results", { exact: true })).toBeVisible();
  await expect(configured.getByRole("button", { name: "Close" })).toBeVisible();
  const panelBounds = await configured.locator(".search-shell__panel").boundingBox();
  const inputBounds = await configured.getByRole("searchbox").boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(inputBounds).not.toBeNull();
  expect(panelBounds!.width).toBeGreaterThanOrEqual(400);
  expect(inputBounds!.width).toBeGreaterThan(panelBounds!.width * 0.85);
  const [stageBounds, closeBounds] = await Promise.all([
    configured.locator(".looma-preview-scenario__stage").boundingBox(),
    configured.getByRole("button", { name: "Close" }).boundingBox()
  ]);
  expect(stageBounds).not.toBeNull();
  expect(closeBounds).not.toBeNull();
  expect(closeBounds!.y + closeBounds!.height).toBeLessThanOrEqual(stageBounds!.y + stageBounds!.height + 1);
  const search = configured.getByRole("searchbox", { name: "Search documentation" });
  await search.fill("tokens");
  await expect(configured.getByText("2 results", { exact: true })).toBeVisible();
  await expect(configured.getByRole("button", { name: /Design tokens/ })).toBeVisible();
  await expect(configured.getByRole("button", { name: /Token overrides/ })).toBeVisible();
  await expect(configured.getByRole("button", { name: /Button variants/ })).toBeHidden();
  await search.fill("no matching component");
  await expect(configured.getByText("0 results", { exact: true })).toBeVisible();
  await expect(configured.locator("#docs-search-empty")).toBeVisible();
  await expect(configured.locator(".looma-mode-code").first()).toContainText("addEventListener(\"input\"");
  await configured.getByRole("button", { name: "Close" }).click();
  await expect(configuredDialog).toBeHidden();
});

test("ui-button authors one declarative element and lowers directly to a native button", async ({ page }) => {
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const button = defaultScenario.locator("button[data-component-root~='ui-button']");
  await expect(button).toHaveCount(1);
  await expect(button).toHaveText("Button");
  await expect(button.locator("button")).toHaveCount(0);
  await expect(defaultScenario.locator(".looma-mode-code")).toContainText("<ui-button>");
  await expect(defaultScenario.locator(".looma-mode-code")).not.toContainText("<button");

  const colors = await computedOpaqueColors(button);
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  const bounds = await button.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeLessThanOrEqual(38);

  const ghost = page.locator("[data-preview-scenario='Variant and size'] [data-component-root~='ui-button'][data-variant='ghost']");
  const before = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor);
  await ghost.hover();
  const after = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(after).not.toBe(before);
});

test("ui-input authors one declarative element and lowers directly to an editable native input", async ({ page }) => {
  await page.goto("components/ui-input", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const input = defaultScenario.locator("input[data-component-root~='ui-input']");
  await expect(input).toHaveCount(1);
  await expect(input).toHaveAttribute("placeholder", "Enter text");
  await expect(input.locator("input")).toHaveCount(0);
  await input.fill("Direct native input");
  await expect(input).toHaveValue("Direct native input");
  await expect(defaultScenario.locator(".looma-mode-code")).toContainText("<ui-input");
  await expect(defaultScenario.locator(".looma-mode-code")).not.toContainText("<input");

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
    await input.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
    const colors = await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        placeholder: getComputedStyle(element, "::placeholder").color
      };
    });
    expect(contrastRatio(colors.placeholder, colors.background), `${theme} placeholder contrast`)
      .toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.border, colors.background), `${theme} control boundary contrast`)
      .toBeGreaterThanOrEqual(3);
  }

  const states = page.locator("[data-preview-scenario='invalid, readonly, and disabled']");
  await expect(states.getByRole("textbox", { name: "Invalid" })).toHaveAttribute("aria-invalid", "true");
  await expect(states.getByRole("textbox", { name: "Read only" })).toHaveAttribute("readonly", "");
  await expect(states.getByRole("textbox", { name: "Disabled" })).toBeDisabled();
});

test("ui-select authors options directly and lowers to one native select", async ({ page }) => {
  await page.goto("components/ui-select", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const select = defaultScenario.locator("select[data-component-root~='ui-select']");
  await expect(select).toHaveCount(1);
  await expect(select.locator("select")).toHaveCount(0);
  await select.selectOption("two");
  await expect(select).toHaveValue("two");
  await expect(defaultScenario.locator(".looma-mode-code")).toContainText("<ui-select");
  await expect(defaultScenario.locator(".looma-mode-code")).not.toContainText("<select");

  const configured = page.locator("[data-preview-scenario='value, required, and invalid']");
  const configuredSelect = configured.getByRole("combobox", { name: "Workspace role" });
  await expect(configuredSelect).toHaveValue("editor");
  await expect(configuredSelect).toHaveAttribute("required", "");
  await expect(configuredSelect).toHaveAttribute("aria-invalid", "true");
});

test("ui-textarea authors one declarative element and lowers directly to a native textarea", async ({ page }) => {
  await page.goto("components/ui-textarea", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const textarea = defaultScenario.locator("textarea[data-component-root~='ui-textarea']");
  await expect(textarea).toHaveCount(1);
  await expect(textarea).toHaveAttribute("rows", "4");
  await expect(textarea.locator("textarea")).toHaveCount(0);
  await textarea.fill("Direct native textarea");
  await expect(textarea).toHaveValue("Direct native textarea");
  await expect(defaultScenario.locator(".looma-mode-code")).toContainText("<ui-textarea");
  await expect(defaultScenario.locator(".looma-mode-code")).not.toContainText("<textarea");

  const states = page.locator("[data-preview-scenario='rows, invalid, and readonly']");
  await expect(states.getByRole("textbox", { name: "Invalid" })).toHaveAttribute("rows", "4");
  await expect(states.getByRole("textbox", { name: "Invalid" })).toHaveAttribute("aria-invalid", "true");
  await expect(states.getByRole("textbox", { name: "Read only" })).toHaveAttribute("readonly", "");
});

test("component pages order representative configurations and show the exact code", async ({
  page
}) => {
  await page.goto("components/ui-inline", { waitUntil: "domcontentloaded" });

  await expect(page.locator("[data-preview-scenario]")).toHaveCount(4);
  expect(await page.locator("[data-preview-scenario]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-preview-scenario"))
  )).toEqual([
    "Default",
    `gap="l"`,
    `align="end" and justify="between"`,
    "wrap"
  ]);
  await expect(page.getByRole("heading", { level: 2, name: "wrap" })).toBeVisible();
  await expect(page.locator("[data-preview-scenario='wrap']")).toContainText("One");
  await expect(page.locator("[data-preview-scenario='wrap']")).toContainText("Four");
  const wrapping = page.locator("[data-preview-scenario='wrap']");
  await expect(wrapping.locator(".looma-mode-code")).toContainText("Four");
  await expect(wrapping.locator(".looma-mode-code")).toContainText('<ui-inline gap="s" wrap>');
  await expect(wrapping.getByRole("group", { name: "Example framework" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SSR Markup" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Framework Snippets" })).toHaveCount(0);
});

test("Examples and API keep configuration demos separate from exhaustive reference", async ({
  page
}) => {
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".looma-preview-scenario")).toHaveCount(2);
  await expect(page.locator(".looma-api")).toHaveCount(0);
  await page.getByRole("tab", { name: "API" }).click();
  await expect(page.locator(".looma-preview-scenario")).toHaveCount(0);
  await expect(page.locator(".looma-api")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Attributes" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Properties" })).toBeVisible();
});

test("code panes scroll inside the example and expose readable authored IDs", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto("components/ui-tooltip", { waitUntil: "domcontentloaded" });

  const code = page.locator(".looma-component-mode-example").first();
  const pre = code.locator("pre");
  await expect(code).toBeVisible();
  await expect(pre).toBeVisible();
  const sizes = await code.evaluate((element) => {
    const pre = element.querySelector("pre")!;
    return {
      cardRight: element.getBoundingClientRect().right,
      preRight: pre.getBoundingClientRect().right,
      preOverflowX: getComputedStyle(pre).overflowX,
      pageWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(sizes.cardRight).toBeLessThanOrEqual(sizes.pageWidth + 1);
  expect(sizes.preRight).toBeLessThanOrEqual(sizes.cardRight + 1);
  expect(sizes.preOverflowX).toBe("auto");
  expect(sizes.pageScrollWidth).toBeLessThanOrEqual(sizes.pageWidth + 1);
  await expect(code.locator(".looma-mode-code")).toContainText('id="tooltip-trigger"');
  await expect(code.locator(".looma-mode-code")).not.toContainText("_r_");
});

test("property-only inputs appear in the copyable framework examples", async ({ page }) => {
  await page.goto("components/ui-editor-mention-menu", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Open']");
  const code = scenario.locator(".looma-mode-code");
  const modes = scenario.getByRole("group", { name: "Example framework" });

  await expect(code).toContainText('document.querySelector("#mention-menu").items');
  await expect(code).toContainText("Maya Chen");
  await modes.getByRole("button", { name: "Vue" }).click();
  await expect(code).toContainText(':items="mentionItems"');
  await modes.getByRole("button", { name: "React" }).click();
  await expect(code).toContainText("items={mentionItems}");
  await modes.getByRole("button", { name: "Svelte" }).click();
  await expect(code).toContainText("items={mentionItems}");
});

test("ui-inline applies its declared spacing, alignment, and distribution values", async ({ page }) => {
  await page.goto("components/ui-inline", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const basicRow = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-inline']");
  await expect(basicRow).toBeVisible();
  await expect(basicRow).toHaveCSS("gap", "12px");
  await expect(basicRow).toHaveCSS("justify-content", "flex-start");
  await expect(basicRow.locator(":scope > [data-slotted]").first()).toHaveCSS("border-top-style", "solid");

  const largerSpacing = page.locator(`[data-preview-scenario='gap="l"'] [data-component-root~='ui-inline']`);
  await expect(largerSpacing).toHaveCSS("gap", "24px");

  const alignment = page.locator(`[data-preview-scenario='align="end" and justify="between"'] [data-component-root~='ui-inline']`);
  await expect(alignment).toHaveCSS("gap", "16px");
  await expect(alignment).toHaveCSS("align-items", "flex-end");
  await expect(alignment).toHaveCSS("justify-content", "space-between");

  const values = await page.evaluate(async () => {
    const fixture = document.createElement("div");
    fixture.style.cssText = "position:absolute;visibility:hidden";
    document.body.append(fixture);
    for (const gap of ["l", "xl"]) {
      const inline = document.createElement("ui-inline");
      inline.setAttribute("gap", gap);
      inline.setAttribute("align", "end");
      inline.setAttribute("justify", "center");
      fixture.append(inline);
    }
    // Observation and lowering are asynchronous; two frames include the resulting style pass.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return Array.from(fixture.querySelectorAll<HTMLElement>("[data-component-root~='ui-inline']")).map((inline) => {
      const style = getComputedStyle(inline);
      return { gap: style.gap, align: style.alignItems, justify: style.justifyContent };
    });
  });
  expect(values).toEqual([
    { gap: "24px", align: "flex-end", justify: "center" },
    { gap: "32px", align: "flex-end", justify: "center" }
  ]);
});

test("ui-stack examples expose spacing and stretching through bounded children", async ({ page }) => {
  await page.goto("components/ui-stack", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const defaultStack = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-stack']");
  const configuredStack = page.locator(`[data-preview-scenario='gap="xl" and align="center"'] [data-component-root~='ui-stack']`);
  await expect(defaultStack).toHaveCSS("gap", "16px");
  await expect(defaultStack).toHaveCSS("align-items", "stretch");
  await expect(defaultStack.locator(":scope > [data-slotted]").first()).toHaveCSS("border-top-style", "solid");
  await expect(configuredStack).toHaveCSS("gap", "32px");
  await expect(configuredStack).toHaveCSS("align-items", "center");

  const widths = await page.evaluate(() => {
    const defaultButton = document.querySelector<HTMLElement>(
      "[data-preview-scenario='Default'] [data-component-root~='ui-stack'] > [data-slotted]"
    )!;
    const centeredButton = document.querySelector<HTMLElement>(
      `[data-preview-scenario='gap="xl" and align="center"'] [data-component-root~='ui-stack'] > [data-slotted]`
    )!;
    return { defaultWidth: defaultButton.getBoundingClientRect().width, centeredWidth: centeredButton.getBoundingClientRect().width };
  });
  expect(widths.defaultWidth).toBeGreaterThan(widths.centeredWidth * 2);
});

test("layout previews expose their defining geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("components/ui-grid", { waitUntil: "domcontentloaded" });
  const grid = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-grid']");
  const gridItems = grid.locator(":scope > [data-slotted]");
  await expect(gridItems).toHaveCount(3);
  const gridRects = await gridItems.evaluateAll((items) => items.map((item) => {
    const { left, top, width } = item.getBoundingClientRect();
    return { left, top, width };
  }));
  expect(new Set(gridRects.map(({ top }) => Math.round(top))).size).toBe(1);
  expect(new Set(gridRects.map(({ left }) => Math.round(left))).size).toBe(3);
  expect(gridRects.every(({ width }) => width > 100)).toBe(true);

  await page.goto("components/ui-center", { waitUntil: "domcontentloaded" });
  const centers = page.locator("[data-component-root~='ui-center']");
  await expect(centers).toHaveCount(2);
  const centerOffsets = await centers.evaluateAll((centerElements) => centerElements.map((center) => {
    const stage = center.closest(".looma-preview-scenario__stage")!;
    const centerBounds = center.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    return Math.abs(
      (centerBounds.left + centerBounds.width / 2) - (stageBounds.left + stageBounds.width / 2)
    );
  }));
  expect(centerOffsets).toHaveLength(2);
  expect(centerOffsets.every((offset) => offset <= 1)).toBe(true);

  await page.goto("components/ui-sidebar", { waitUntil: "domcontentloaded" });
  const sidebar = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-sidebar']");
  const sidebarRegions = sidebar.locator(":scope > aside, :scope > main");
  await expect(sidebarRegions).toHaveCount(2);
  const sidebarRects = await sidebarRegions.evaluateAll((regions) => regions.map((region) => {
    const { left, top, width } = region.getBoundingClientRect();
    return { left, top, width };
  }));
  expect(sidebarRects[0]!.top).toBeCloseTo(sidebarRects[1]!.top, 0);
  expect(sidebarRects[0]!.left).toBeLessThan(sidebarRects[1]!.left);
  expect(sidebarRects.every(({ width }) => width > 150)).toBe(true);
});

test("ui-switcher can be exercised above and below its intrinsic threshold", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("components/ui-switcher", { waitUntil: "domcontentloaded" });
  const control = page.getByRole("slider", { name: "Preview width" }).first();
  const switcher = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-switcher']");
  const itemTops = () => switcher.locator(":scope > [data-slotted]").evaluateAll((items) =>
    items.map((item) => Math.round(item.getBoundingClientRect().top))
  );

  await control.fill("720");
  expect(new Set(await itemTops()).size).toBe(1);
  await control.fill("280");
  expect(new Set(await itemTops()).size).toBe(3);
});

test("ui-reel exposes a discoverable, keyboard-scrollable overflow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("components/ui-reel", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Gap, item width, and snap']");
  const reel = scenario.locator("[data-component-root~='ui-reel']");
  await expect(reel).toBeVisible();
  const overflow = await reel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  expect(overflow.overflowX).toBe("auto");
  await reel.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => reel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("every dialog scenario opens and closes through the component state contract", async ({ page }) => {
  await page.goto("components/ui-dialog", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const scenarios = page.locator("[data-preview-scenario]");
  for (let index = 0; index < await scenarios.count(); index += 1) {
    const scenario = scenarios.nth(index);
    const trigger = scenario.getByRole("button", { name: "Open dialog" });
    const dialog = scenario.locator("dialog");
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    const isModal = await dialog.evaluate((element: HTMLDialogElement) => element.matches(":modal"));
    expect(isModal).toBe(index === 1);
    await dialog.getByRole("button", { name: index === 0 ? "Cancel" : "Close" }).click();
    await expect(dialog).not.toHaveAttribute("open", "");
  }
});

test("every combobox scenario receives its authored native options", async ({ page }) => {
  await page.goto("components/ui-combobox", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const comboboxes = page.locator("[data-component-root~='ui-combobox']");
  await expect(comboboxes).toHaveCount(2);
  await expect(comboboxes.nth(0).locator(".authored-options option")).toHaveCount(2);
  await expect(comboboxes.nth(1).locator(".authored-options option")).toHaveCount(2);
  await comboboxes.nth(0).evaluate((element) => {
    element.addEventListener("options-change", (event) => {
      const rows = (event as CustomEvent<Array<Record<string, unknown>>>).detail;
      element.setAttribute(
        "data-test-options",
        JSON.stringify(rows.map((row) => ({
          id: row.id,
          value: row.value,
          label: row.label,
          description: row.description
        })))
      );
    }, { once: true });
  });
  const input = comboboxes.nth(0).getByRole("combobox");
  await input.fill("North");
  await input.press("ArrowDown");
  await expect.poll(async () => JSON.parse(
    await comboboxes.nth(0).getAttribute("data-test-options") ?? "[]"
  )).toMatchObject([
      { id: "north", value: "north", label: "North terminal", description: "Harbor district" }
    ]);
  await expect(page.getByRole("option", { name: /North terminal/ })).toHaveCount(1);
  await input.press("Enter");
  await expect(input).toHaveValue("North terminal");
});

test("the desktop hero stays inside the content column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./", { waitUntil: "networkidle" });

  const main = page.getByRole("main");
  const heading = page.getByRole("heading", { level: 1, name: "Getting Started" });
  await expect(main).toBeVisible();
  await expect(heading).toBeVisible();
  const mainBounds = await main.boundingBox();
  const headingBounds = await heading.boundingBox();

  expect(mainBounds).not.toBeNull();
  expect(headingBounds).not.toBeNull();
  expect(headingBounds!.x).toBeGreaterThanOrEqual(
    mainBounds!.x + 16
  );
});

test("framework mode defaults to HTML Next and follows the reader between pages", async ({
  page
}) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });

  const modeGroup = page.getByRole("group", { name: "Example framework" }).first();
  await expect(modeGroup.getByRole("button", { name: "HTML Next" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.locator(".looma-mode-code").first()).toContainText("<ui-button");

  await modeGroup.getByRole("button", { name: "Vue" }).click();
  await expect(page.locator(".looma-mode-code").first()).toContainText(
    '@threadlabs/looma/vue'
  );

  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("group", { name: "Example framework" }).first()
      .getByRole("button", { name: "Vue" })
  ).toHaveAttribute("aria-pressed", "true");
});

test("framework examples preserve typed inputs and authored semantics", async ({ page }) => {
  await page.goto("components/ui-affordance-scope", { waitUntil: "domcontentloaded" });
  const configured = page.locator(`[data-preview-scenario='near-radius="8"']`);
  const modeGroup = configured.getByRole("group", { name: "Example framework" });
  const modeCode = configured.locator(".looma-mode-code");

  await modeGroup.getByRole("button", { name: "Vue" }).click();
  await expect(modeCode).toContainText('near-radius="8"');
  await modeGroup.getByRole("button", { name: "React" }).click();
  await expect(modeCode).toContainText("nearRadius={8}");
  await modeGroup.getByRole("button", { name: "Svelte" }).click();
  await expect(modeCode).toContainText('near-radius="8"');

  await page.goto("components/ui-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code").first()).toContainText("First item");

  await page.getByRole("group", { name: "Example framework" }).first()
    .getByRole("button", { name: "Svelte" }).click();
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code").first()).toContainText("Button");
});

test("an invalid saved framework mode falls back to HTML Next", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("looma-docs-framework-mode", "unknown-adapter");
  });
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("group", { name: "Example framework" }).first()
      .getByRole("button", { name: "HTML Next" })
  ).toHaveAttribute("aria-pressed", "true");
});

test("dark mode tab labels meet WCAG AA text contrast", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("components/ui-button", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  for (const label of ["Examples", "API"]) {
    const tab = page.getByRole("tab", { name: label });
    await expect(tab).toBeVisible();
    const colors = await computedOpaqueColors(tab);
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  }

  const ghostButtonColors = await computedOpaqueColors(page.getByRole("button", { name: "Ghost" }));
  expect(
    contrastRatio(ghostButtonColors.foreground, ghostButtonColors.background)
  ).toBeGreaterThanOrEqual(4.5);

  await expectNoAxeViolations(page);
});

for (const darkPage of ["./", "components"] as const) {
  test(`${darkPage} has no automated dark-mode accessibility violations`, async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
    await page.goto(darkPage, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoAxeViolations(page);
  });
}

test("Looma navigation only points to Looma resources", async ({ page }) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: /Knit/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View on GitHub", exact: true })).toBeVisible();
});

test("checkbox, switch, and radio APIs generate their own aligned native controls", async ({ page }) => {
  await page.goto("components/ui-checkbox", { waitUntil: "domcontentloaded" });
  const checkboxScenario = page.locator("[data-preview-scenario='Default']");
  const checkbox = checkboxScenario.getByRole("checkbox", { name: "Checkbox" });
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  const checkboxCode = checkboxScenario.locator(".looma-mode-code").first();
  await expect(checkboxCode).toContainText("<ui-checkbox>");
  await expect(checkboxCode).not.toContainText("<input");

  const multiline = page.locator("[data-preview-scenario='Multi-line label']");
  const alignment = await multiline.locator("[data-component-root~='ui-checkbox']").evaluate((root) => {
    const input = root.querySelector("input")!;
    const label = root.querySelector(".label")!;
    const inputBounds = input.getBoundingClientRect();
    const labelBounds = label.getBoundingClientRect();
    return {
      firstLineOffset: Math.abs(inputBounds.top - labelBounds.top),
      labelHeight: labelBounds.height,
      gap: labelBounds.left - inputBounds.right
    };
  });
  expect(alignment.firstLineOffset).toBeLessThanOrEqual(4);
  expect(alignment.labelHeight).toBeGreaterThan(30);
  expect(alignment.gap).toBeGreaterThanOrEqual(6);
  expect(alignment.gap).toBeLessThanOrEqual(12);

  await page.goto("components/ui-switch", { waitUntil: "domcontentloaded" });
  const switchControl = page.locator("[data-preview-scenario='Default']").getByRole("switch", { name: "Switch" });
  const offGeometry = await switchControl.evaluate((input) => {
    const track = input.getBoundingClientRect();
    const thumb = getComputedStyle(input, "::after");
    return {
      checked: (input as HTMLInputElement).checked,
      trackWidth: track.width,
      trackHeight: track.height,
      thumbWidth: Number.parseFloat(thumb.width),
      thumbHeight: Number.parseFloat(thumb.height),
      thumbTop: Number.parseFloat(thumb.top),
      transform: thumb.transform,
      background: getComputedStyle(input).backgroundColor
    };
  });
  expect(offGeometry.checked).toBe(false);
  expect(offGeometry.trackWidth).toBe(40);
  expect(offGeometry.trackHeight).toBe(24);
  expect(offGeometry.thumbWidth).toBe(16);
  expect(offGeometry.thumbHeight).toBe(16);
  expect(offGeometry.thumbTop).toBe(3);
  await switchControl.check();
  await expect(switchControl).toBeChecked();
  const onGeometry = await switchControl.evaluate((input) => ({
    transform: getComputedStyle(input, "::after").transform,
    background: getComputedStyle(input).backgroundColor
  }));
  expect(onGeometry.transform).not.toBe("none");
  expect(onGeometry.background).not.toBe(offGeometry.background);
  const switchCode = page.locator("[data-preview-scenario='Default'] .looma-mode-code").first();
  await expect(switchCode).not.toContainText("<input");

  await page.goto("components/ui-radio-group", { waitUntil: "domcontentloaded" });
  const group = page.getByRole("radiogroup", { name: "Options" });
  await expect(group).toBeVisible();
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(2);
  await radios.nth(1).check();
  await expect(radios.nth(1)).toBeChecked();

  await page.goto("components/ui-radio", { waitUntil: "domcontentloaded" });
  const radioScenario = page.locator("[data-preview-scenario='Default']");
  const radio = radioScenario.getByRole("radio", { name: "Radio" });
  await expect(radio).toBeVisible();
  await radio.check();
  await expect(radio).toBeChecked();
  await expect(radioScenario.locator(".looma-mode-code").first()).not.toContainText("<input");
});

test("every badge tone remains legible and visually distinct in light and dark themes", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await page.goto("components/ui-badge", { waitUntil: "domcontentloaded" });
    await page.evaluate((selectedTheme) => window.localStorage.setItem("theme", selectedTheme), theme);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const badges = page.locator("[data-preview-scenario] [data-component-root~='ui-badge'] .badge__surface");
    await expect(badges).toHaveCount(11);
    const treatments = await badges.evaluateAll((surfaces) => surfaces.map((surface) => {
      const style = getComputedStyle(surface);
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const rgb = (color: string) => {
        if (!context) throw new Error("Canvas color conversion is unavailable");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
        return `rgb(${red} ${green} ${blue})`;
      };
      return {
        color: rgb(style.color),
        background: rgb(style.backgroundColor),
        border: rgb(style.borderTopColor),
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: Number.parseInt(style.fontWeight, 10)
      };
    }));
    for (const [index, treatment] of treatments.entries()) {
      expect(
        contrastRatio(treatment.color, treatment.background),
        `${theme} badge treatment ${index}: ${JSON.stringify(treatment)}`
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(treatments[0]!.fontSize).toBeGreaterThanOrEqual(14);
    expect(treatments[0]!.fontWeight).toBeGreaterThanOrEqual(500);
    expect(contrastRatio(treatments[0]!.border, treatments[0]!.background)).toBeGreaterThanOrEqual(3);
    expect(new Set(treatments.slice(1, 6).map(({ background }) => background)).size).toBe(5);
    expect(new Set(treatments.slice(6).map(({ background }) => background)).size).toBe(5);
  }
});

test("every callout tone renders its icon without an empty oversized indent", async ({ page }) => {
  await page.goto("components/ui-callout", { waitUntil: "domcontentloaded" });
  const callouts = page.locator("[data-preview-scenario] [data-component-root~='ui-callout']");
  await expect(callouts).toHaveCount(4);
  const treatments = await callouts.evaluateAll((roots) => roots.map((root) => {
    const surface = root.querySelector(".callout__surface")!;
    const content = root.querySelector(".content")!;
    const surfaceBounds = surface.getBoundingClientRect();
    const contentBounds = content.getBoundingClientRect();
    return {
      icons: root.querySelectorAll(".icon svg").length,
      contentInset: contentBounds.left - surfaceBounds.left
    };
  }));
  for (const treatment of treatments) {
    expect(treatment.icons).toBe(1);
    expect(treatment.contentInset).toBeGreaterThanOrEqual(28);
    expect(treatment.contentInset).toBeLessThanOrEqual(44);
  }
});
