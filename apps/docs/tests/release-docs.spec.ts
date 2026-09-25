import { expect, test, type Locator, type Page } from "@playwright/test";
import axe from "axe-core";

import componentApi from "../../../generated/component-api.json";

const candidatePages = [
  { path: "./", heading: "Looma" },
  { path: "getting-started", heading: "Getting Started" },
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

/** Linear sRGB from any colour the browser hands back: rgb(), color(srgb ...), oklab(), oklch(). */
function linearChannels(color: string): [number, number, number] {
  const numbers = (color.match(/-?[\d.]+/g) ?? []).map(Number);
  if (numbers.length < 3) throw new Error(`Unsupported color: ${color}`);
  const gamma = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  if (color.startsWith("oklab(") || color.startsWith("oklch(")) {
    const [lightness, second, third] = numbers;
    const [a, b] = color.startsWith("oklch(")
      ? [second * Math.cos((third * Math.PI) / 180), second * Math.sin((third * Math.PI) / 180)]
      : [second, third];
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }

  // color(srgb ...) states channels 0–1; rgb() states them 0–255.
  const scale = color.startsWith("color(") ? 1 : 1 / 255;
  return numbers.slice(0, 3).map((channel) => gamma(channel * scale)) as [number, number, number];
}

function contrastRatio(foreground: string, background: string): number {
  const parse = linearChannels;
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
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await expectNoAxeViolations(page);
  });
}

test("the install path exposes the facade package and the support boundary", async ({
  page
}) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("pnpm add @threadlabs/looma", { exact: true }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /not published yet|publication pending|become usable when the package is published/i
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

test("the context menu opens on a context click, not a plain click", async ({
  page
}) => {
  await page.goto("components/ui-context-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const scenario = page.locator("[data-preview-scenario='Target binding']");
  const target = scenario.locator("#context-menu-target");
  const firstItem = page.getByRole("menuitem", { name: "First item", exact: true });

  await expect(target).toBeVisible();
  // Leave room below the pointer so the menu opens downward instead of flipping.
  await target.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));

  await target.click();
  await expect(firstItem).not.toBeVisible();

  await target.focus();
  await page.keyboard.press("Shift+F10");
  await expect(firstItem).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(firstItem).not.toBeVisible();

  // iOS fires no contextmenu on long-press, so a held touch opens the menu on its own.
  await target.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 40, clientY: 40 });
  await expect(firstItem).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(firstItem).not.toBeVisible();

  await target.click({ button: "right", position: { x: 24, y: 24 } });
  await expect(firstItem).toBeVisible();
  const contextSurface = page.locator("[data-component~='ui-context-menu'] [popover]").first();
  await expect(contextSurface).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const geometry = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>("#context-menu-target")!;
    const surface = document.querySelector<HTMLElement>("[data-component~='ui-context-menu'] [popover]")!;
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
      height: surfaceBounds.height,
      borderStyle: style.borderStyle,
      outlineStyle: style.outlineStyle,
      padding: style.padding,
      backgroundColor: style.backgroundColor
    };
  });
  expect(Math.abs(geometry.left - geometry.expectedLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.top - geometry.expectedTop)).toBeLessThanOrEqual(2);
  // The top-layer surface is the menu itself: one box, holding the items.
  expect(geometry.height).toBeGreaterThan(40);
  expect(geometry.borderStyle).toBe("solid");
  expect(geometry.outlineStyle).toBe("none");
  expect(geometry.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
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
  const affordance = scenario.locator("[data-component~='ui-icon-button']").first();
  await expect(affordance).toHaveRole("button", { name: "Add" });
  // At rest only the guide dot shows: the icon (currentColor) and surface are transparent.
  await expect(affordance).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  expect(await affordance.evaluate((element) => getComputedStyle(element, "::before").opacity)).not.toBe("0");
  const bounds = await affordance.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x - 8, bounds!.y + bounds!.height / 2);
  await expect(affordance).toHaveAttribute("data-ui-proximity", "near");
  await expect(affordance).not.toHaveCSS("color", "rgba(0, 0, 0, 0)");
});

test("popover trigger opens, positions, and closes the settled component", async ({ page }) => {
  await page.goto("components/ui-popover", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  await expect(page.locator("[data-component~='ui-popover'] .surface:visible")).toHaveCount(0);
  const scenario = page.locator("[data-preview-scenario='Trigger binding']");
  const trigger = scenario.getByRole("button", { name: "Open popover" });
  const popover = scenario.locator("[data-component~='ui-popover']");
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

  const placed = page.locator(`[data-preview-scenario='placement="top-end"']`);
  const placedPopover = placed.locator("[data-component~='ui-popover']");
  await expect(placedPopover).not.toBeVisible();
  const placedTrigger = placed.getByRole("button", { name: "Open popover" });
  await placedTrigger.click();
  await expect(placedPopover).toBeVisible();
  // Poll past the brief open scale transition before comparing edges.
  await expect.poll(async () => {
    const [anchorBox, surfaceBox] = await Promise.all([placedTrigger.boundingBox(), placedPopover.boundingBox()]);
    return surfaceBox!.y + surfaceBox!.height <= anchorBox!.y + 1
      && Math.abs((surfaceBox!.x + surfaceBox!.width) - (anchorBox!.x + anchorBox!.width)) <= 1;
  }).toBe(true);
});

test("tooltip uses a Looma trigger and a crisp, pointed overlay surface", async ({ page }) => {
  await page.goto("components/ui-tooltip", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Target binding']");
  const trigger = scenario.locator("[data-component~='ui-button']");
  const tooltip = scenario.locator("[data-component~='ui-tooltip']");
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await expect(tooltip).toBeVisible();
  const treatment = await tooltip.evaluate((element) => {
    const rootStyle = getComputedStyle(element);
    const surface = element.querySelector<HTMLElement>(".surface")!;
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

test("toast-region starts empty, fires on demand, and uses a compact round dismiss control", async ({ page }) => {
  await page.goto("components/ui-toast-region", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default closed']");
  const region = scenario.locator("[data-component~='ui-toast-region']");
  // The region answers "show a toast" only once the runtime has lowered it and its controller ran.
  // It is a manual popover, so it stays hidden until it holds one.
  await expect(region).toBeAttached();
  await expect(region.locator(".toast")).toHaveCount(0);
  const toast = region.locator(".toast");
  await expect(async () => {
    await scenario.getByRole("button", { name: "Show toast" }).click();
    await expect(toast).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
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
  // Compact but above the WCAG 2.5.8 24px minimum target size, and circular.
  expect(dismissBounds!.width).toBeGreaterThanOrEqual(24);
  expect(dismissBounds!.width).toBeLessThanOrEqual(32);
  expect(dismissBounds!.height).toBeGreaterThanOrEqual(24);
  await expect(dismiss).toHaveCSS("border-radius", /^(999px|50%)$/);
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
  await expect(page.locator(".looma-component-card")).toHaveCount(50);
  await expect(page.getByText("Showing 50 components", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Chip" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Floating Action Button" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Menu Item" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Tree Item" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Search Result Row" })).toHaveCount(0);
  const sidebar = page.locator(".theme-doc-sidebar-menu");
  await expect(sidebar.getByRole("link", { name: "Button", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Floating Action Button", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Editor Table Overlay", exact: true })).toHaveCount(0);

  // Cards are live like the component pages: a guide dot at rest, the button as the pointer nears it.
  const anticipatoryControl = page.locator('[data-component-card="ui-affordance-scope"] [data-component~="ui-icon-button"]').first();
  await anticipatoryControl.scrollIntoViewIfNeeded();
  await expect(anticipatoryControl).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  expect(await anticipatoryControl.evaluate((element) => getComputedStyle(element, "::before").opacity)).not.toBe("0");
  const controlBounds = await anticipatoryControl.boundingBox();
  await page.mouse.move(controlBounds!.x - 8, controlBounds!.y + controlBounds!.height / 2);
  await expect(anticipatoryControl).toHaveAttribute("data-ui-proximity", "near");
  await expect(anticipatoryControl).not.toHaveCSS("color", "rgba(0, 0, 0, 0)");

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
        ?.scrollIntoView({ block: "center", behavior: "instant" });
    }, tag);
    await expect(card).toBeVisible();
    const preview = card.locator(".looma-component-card__preview");
    const surface = preview.locator(`[data-component~="${tag}"]`);
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
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const contextPreview = contextCard.locator(".looma-component-card__preview");
  const contextSurface = contextPreview.locator("[data-component~='ui-editor-table-context-menu']");
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
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const tableStage = overlayCard.locator(".demo-editor-table-stage");
  const tableOverlay = tableStage.locator('[data-component~="ui-editor-table-overlay"]');
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
  const overlay = primary.locator('[data-component~="ui-editor-table-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("button", { name: "Cell actions" })).toBeVisible();
  await expect(overlay.getByRole("button", { name: /Insert row/ })).toHaveCount(3);
  await expect(overlay.getByRole("button", { name: /Insert column/ })).toHaveCount(3);

  const code = primary.locator(".looma-mode-code").first();
  await expect(code).toContainText("geometry='{");
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
    await expect(code).toContainText("actions='[");
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
  // Visits every component page in one test.
  test.setTimeout(90_000);
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
      await page.locator(`[data-component~="${component.tag}"]`).count(),
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
  const authoredImage = imageScenario.locator("[data-component~='ui-avatar'] img:not(.image)");
  await expect(authoredImage).toHaveCount(1);
  await expect(authoredImage).toBeVisible();
  expect(await authoredImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(imageScenario.locator(".looma-mode-code")).toContainText("<img");
  await expect(imageScenario.locator(".looma-mode-code")).not.toContainText("data-ui-avatar-fallback");

  await page.goto("components/ui-avatar-group", { waitUntil: "domcontentloaded" });
  const group = page.locator("[data-preview-scenario='Default maximum'] [data-component~='ui-avatar-group']");
  const avatars = group.locator("[data-component~='ui-avatar']");
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
  const disclosure = scenario.locator("[data-component~='ui-disclosure']");
  const trigger = disclosure.getByRole("button", { name: "Details" });
  const panel = disclosure.locator(".panel");
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
  await expect(disclosure).toHaveAttribute("data-ui-disclosure-state", /\binternalOpen\b/);
  await expect.poll(() => panel.evaluate((element) => Number.parseFloat(getComputedStyle(element).gridTemplateRows)))
    .toBeGreaterThan(0);
  await expect(scenario.locator(".looma-mode-code").first()).not.toContainText("<button");
});

test("tabs generate a full-width tablist from labeled panels without raw button or ARIA wiring", async ({ page }) => {
  await page.goto("components/ui-tabs", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Default horizontal']");
  const tabs = scenario.locator("[data-component~='ui-tabs']");
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
  const tree = scenario.getByRole("tree", { name: "Project files" });
  const parent = tree.getByRole("treeitem", { name: "docs", exact: true });
  const child = tree.getByRole("treeitem", { name: "guide.md" });
  const sibling = tree.getByRole("treeitem", { name: "README.md" });
  const disclosure = parent.getByRole("button", { name: "Expand docs" });
  await expect(disclosure).toBeVisible();
  await expect(sibling.getByRole("button", { name: "Expand README.md" })).toBeHidden();
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
  const defaultBar = defaultScenario.locator("[data-component~='ui-top-bar']");
  await expect(defaultBar).toBeVisible();
  await expect(defaultBar).toContainText("Title");
  const defaultBounds = await defaultBar.boundingBox();
  expect(defaultBounds).not.toBeNull();
  expect(defaultBounds!.height).toBeGreaterThanOrEqual(48);

  const regionsScenario = page.locator("[data-preview-scenario='leading, search, and actions slots']");
  const regionsBar = regionsScenario.locator("[data-component~='ui-top-bar']");
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
  await expect(openScenario.locator(".status")).toBeHidden();
  await expect(openScenario.locator(".footer")).toBeHidden();
  await expect(openScenario.locator(".looma-mode-code")).not.toContainText('slot="backdrop"');
  await expect(openScenario.locator(".looma-mode-code")).toContainText("<ui-search-shell open");

  const configured = page.locator("[data-preview-scenario='label, dismissible, status, and footer']");
  const configuredDialog = configured.getByRole("dialog", { name: "Search documentation" });
  await expect(configuredDialog).toBeVisible();
  await expect(configuredDialog.getByText("3 results", { exact: true })).toBeVisible();
  await expect(configured.getByRole("button", { name: "Close" })).toBeVisible();
  const panelBounds = await configured.locator(".panel").boundingBox();
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
  const button = defaultScenario.locator("button[data-component~='ui-button']");
  await expect(button).toHaveCount(1);
  await expect(button).toHaveText("Button");
  await expect(button.locator("button")).toHaveCount(0);
  await expect(defaultScenario.locator(".looma-mode-code")).toContainText("<ui-button>");
  await expect(defaultScenario.locator(".looma-mode-code")).not.toContainText("<button");

  const colors = await computedOpaqueColors(button);
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  const bounds = await button.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeLessThanOrEqual(40);

  const ghost = page.locator("[data-preview-scenario='variant'] [data-component~='ui-button'][data-ui-button-state~='variant=ghost']");
  const before = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor);
  await ghost.hover();
  const after = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(after).not.toBe(before);

  const links = page.locator("[data-preview-scenario='as a link'] a[data-component~='ui-button']");
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveAttribute("href", "#get-started");
  await expect(links.last()).not.toHaveAttribute("href");
  await expect(links.last()).toHaveAttribute("aria-disabled", "true");
});

test("ui-input authors one declarative element and lowers directly to an editable native input", async ({ page }) => {
  await page.goto("components/ui-input", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const input = defaultScenario.locator("input[data-component~='ui-input']");
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

test("ui-input-group frames its input like a lone Input, in readable text", async ({ page }) => {
  await page.goto("components/ui-input-group", { waitUntil: "domcontentloaded" });
  const group = page.locator("[data-preview-scenario='Suffix'] [data-component~='ui-input-group']");
  const input = group.getByRole("textbox", { name: "Site address" });
  await expect(input).toHaveAttribute("aria-describedby", /\S/);

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
    await group.evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });
    const colors = await group.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderTopColor,
      affix: getComputedStyle(element.querySelector(".affix")!).color
    }));
    expect(contrastRatio(colors.affix, colors.background), `${theme} affix contrast`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.border, colors.background), `${theme} control boundary contrast`).toBeGreaterThanOrEqual(3);
  }
});

test("ui-select authors options directly and lowers to one native select", async ({ page }) => {
  await page.goto("components/ui-select", { waitUntil: "domcontentloaded" });
  const defaultScenario = page.locator("[data-preview-scenario='Default']");
  const select = defaultScenario.locator("select[data-component~='ui-select']");
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
  const textarea = defaultScenario.locator("textarea[data-component~='ui-textarea']");
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
  await page.goto("components/ui-cluster", { waitUntil: "domcontentloaded" });

  await expect(page.locator("[data-preview-scenario]")).toHaveCount(3);
  expect(await page.locator("[data-preview-scenario]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-preview-scenario"))
  )).toEqual([
    "Default",
    `gap="l"`,
    `align="end"`
  ]);
  const wrapping = page.locator("[data-preview-scenario='Default']");
  await expect(wrapping.locator(".looma-mode-code")).toContainText("Release");
  await expect(wrapping.locator(".looma-mode-code")).toContainText("<ui-cluster>");
  await expect(wrapping.getByRole("group", { name: "Example framework" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SSR Markup" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Framework Snippets" })).toHaveCount(0);
});

test("Examples and API keep configuration demos separate from exhaustive reference", async ({
  page
}) => {
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });

  // Default, variant, Link, size, disabled, align and stretch, as a link.
  await expect(page.locator(".looma-preview-scenario")).toHaveCount(7);
  await expect(page.locator(".looma-api")).toHaveCount(0);
  await page.getByRole("tab", { name: "API" }).click();
  await expect(page.locator(".looma-preview-scenario")).toHaveCount(0);
  await expect(page.locator(".looma-api")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Attributes" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Framework props" })).toBeVisible();

  // Each option carries its authored description, including the polymorphic `as` root.
  const attributes = page.locator(".looma-api-table").filter({ has: page.getByRole("columnheader", { name: "Property" }) });
  await expect(attributes.getByRole("columnheader", { name: "Description" })).toBeVisible();
  const asRow = attributes.getByRole("row").filter({ has: page.getByRole("cell", { name: "as", exact: true }) });
  await expect(asRow).toContainText("button | a");
  const hrefRow = attributes.getByRole("row").filter({ has: page.getByRole("cell", { name: "href", exact: true }) });
  await expect(hrefRow).toContainText("Pair it with as=\"a\"");
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

test("structured props appear as attributes in HTML and bindings in framework examples", async ({ page }) => {
  await page.goto("components/ui-editor-mention-menu", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Open']");
  const code = scenario.locator(".looma-mode-code");
  const modes = scenario.getByRole("group", { name: "Example framework" });

  await expect(code).toContainText("items='[");
  await expect(code).not.toContainText(".items =");
  await expect(code).toContainText("Maya Chen");
  await modes.getByRole("button", { name: "Vue" }).click();
  await expect(code).toContainText(':items="mentionItems"');
});

test("ui-cluster wraps and applies its declared spacing and alignment values", async ({ page }) => {
  await page.goto("components/ui-cluster", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const basicRow = page.locator("[data-preview-scenario='Default'] [data-component~='ui-cluster']");
  await expect(basicRow).toBeVisible();
  await expect(basicRow).toHaveCSS("gap", "12px");
  await expect(basicRow).toHaveCSS("flex-wrap", "wrap");
  const rows = await basicRow.locator(":scope > *").evaluateAll((items) => new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size);
  expect(rows).toBeGreaterThan(1);

  const largerSpacing = page.locator(`[data-preview-scenario='gap="l"'] [data-component~='ui-cluster']`);
  await expect(largerSpacing).toHaveCSS("gap", "24px");

  const alignment = page.locator(`[data-preview-scenario='align="end"'] [data-component~='ui-cluster']`);
  await expect(alignment).toHaveCSS("gap", "12px");
  await expect(alignment).toHaveCSS("align-items", "flex-end");

  const values = await page.evaluate(async () => {
    const fixture = document.createElement("div");
    fixture.style.cssText = "position:absolute;visibility:hidden";
    document.body.append(fixture);
    for (const gap of ["l", "xl"]) {
      const cluster = document.createElement("ui-cluster");
      cluster.setAttribute("gap", gap);
      cluster.setAttribute("align", "end");
      fixture.append(cluster);
    }
    // Observation and lowering are asynchronous; two frames include the resulting style pass.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return Array.from(fixture.querySelectorAll<HTMLElement>("[data-component~='ui-cluster']")).map((cluster) => {
      const style = getComputedStyle(cluster);
      return { gap: style.gap, align: style.alignItems, wrap: style.flexWrap };
    });
  });
  expect(values).toEqual([
    { gap: "24px", align: "flex-end", wrap: "wrap" },
    { gap: "32px", align: "flex-end", wrap: "wrap" }
  ]);
});

test("ui-stack examples expose spacing and stretching through bounded children", async ({ page }) => {
  await page.goto("components/ui-stack", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const defaultStack = page.locator("[data-preview-scenario='Default'] [data-component~='ui-stack']");
  const configuredStack = page.locator(`[data-preview-scenario='gap="xl" and align="center"'] [data-component~='ui-stack']`);
  await expect(defaultStack).toHaveCSS("gap", "16px");
  await expect(defaultStack).toHaveCSS("align-items", "stretch");
  await expect(defaultStack.locator(":scope > [data-slotted]").first()).toHaveCSS("border-top-style", "solid");
  await expect(configuredStack).toHaveCSS("gap", "32px");
  await expect(configuredStack).toHaveCSS("align-items", "center");

  const widths = await page.evaluate(() => {
    const defaultButton = document.querySelector<HTMLElement>(
      "[data-preview-scenario='Default'] [data-component~='ui-stack'] > [data-slotted]"
    )!;
    const centeredButton = document.querySelector<HTMLElement>(
      `[data-preview-scenario='gap="xl" and align="center"'] [data-component~='ui-stack'] > [data-slotted]`
    )!;
    return { defaultWidth: defaultButton.getBoundingClientRect().width, centeredWidth: centeredButton.getBoundingClientRect().width };
  });
  expect(widths.defaultWidth).toBeGreaterThan(widths.centeredWidth * 2);
});

test("layout previews expose their defining geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("components/ui-grid", { waitUntil: "domcontentloaded" });
  const grid = page.locator("[data-preview-scenario='Default'] [data-component~='ui-grid']");
  const gridItems = grid.locator(":scope > [data-slotted]");
  await expect(gridItems).toHaveCount(3);
  const gridRects = await gridItems.evaluateAll((items) => items.map((item) => {
    const { left, top, width } = item.getBoundingClientRect();
    return { left, top, width };
  }));
  expect(new Set(gridRects.map(({ top }) => Math.round(top))).size).toBe(1);
  expect(new Set(gridRects.map(({ left }) => Math.round(left))).size).toBe(3);
  expect(gridRects.every(({ width }) => width > 100)).toBe(true);

  await page.goto("components/ui-container", { waitUntil: "domcontentloaded" });
  const centers = page.locator("[data-component~='ui-container']");
  await expect(centers).toHaveCount(3);
  const centerOffsets = await centers.evaluateAll((centerElements) => centerElements.map((center) => {
    const stage = center.closest(".looma-preview-scenario__stage")!;
    const centerBounds = center.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    return Math.abs(
      (centerBounds.left + centerBounds.width / 2) - (stageBounds.left + stageBounds.width / 2)
    );
  }));
  expect(centerOffsets).toHaveLength(3);
  expect(centerOffsets.every((offset) => offset <= 1)).toBe(true);

  // Sidebar is the panel only: an aside the page places beside its main content, toggled by a command.
  await page.goto("components/ui-sidebar", { waitUntil: "domcontentloaded" });
  const shell = page.locator("[data-preview-scenario='App shell'] .demo-app-shell");
  const sidebar = shell.locator("[data-component~='ui-sidebar']");
  const main = shell.locator("main");
  await expect(sidebar).toBeVisible();
  expect(await sidebar.evaluate((element) => element.localName)).toBe("aside");
  const [sidebarBox, mainBox] = [await sidebar.boundingBox(), await main.boundingBox()];
  expect(sidebarBox!.x).toBeLessThan(mainBox!.x);
  expect(sidebarBox!.width).toBeGreaterThan(150);
  const toggle = shell.getByRole("button", { name: "Toggle sidebar" });
  await toggle.click();
  await expect(sidebar).toBeHidden();
  await toggle.click();
  await expect(sidebar).toBeVisible();

  // Below the breakpoint the same panel is a drawer, closed until toggled.
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(sidebar).toBeHidden();
  await toggle.click();
  await expect(sidebar).toBeVisible();
  expect(await sidebar.evaluate((element) => element.matches(":popover-open"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 1000 });
});

test("ui-switcher can be exercised above and below its intrinsic threshold", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("components/ui-switcher", { waitUntil: "domcontentloaded" });
  const control = page.getByRole("slider", { name: "Preview width" }).first();
  const switcher = page.locator("[data-preview-scenario='Default'] [data-component~='ui-switcher']");
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
  const reel = scenario.locator("[data-component~='ui-reel']");
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

test("dialog closes via header button, actions, Escape, and outside press, with pinned chrome", async ({ page }) => {
  await page.goto("components/ui-dialog", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  const scenario = (name: string) => page.locator(`[data-preview-scenario="${name}"]`);
  const open = async (name: string) => {
    await scenario(name).getByRole("button", { name: /^Open/ }).click();
    const dialog = scenario(name).locator("dialog");
    await expect(dialog).toHaveAttribute("open", "");
    return dialog;
  };

  let dialog = await open("Default");
  expect(await dialog.evaluate((element: HTMLDialogElement) => element.matches(":modal"))).toBe(false);
  await expect(dialog.locator(".title")).toHaveText("Publish changes?");
  const footer = dialog.locator("footer");
  await expect(footer).toHaveCSS("justify-content", "flex-end");
  const [cancel, publish] = await Promise.all([footer.getByRole("button", { name: "Cancel" }).boundingBox(), footer.getByRole("button", { name: "Publish" }).boundingBox()]);
  expect(publish!.x).toBeGreaterThan(cancel!.x);
  await footer.getByRole("button", { name: "Publish" }).click();
  await expect(dialog).not.toHaveAttribute("open", "");

  dialog = await open("Default");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).not.toHaveAttribute("open", "");

  dialog = await open("modal");
  expect(await dialog.evaluate((element: HTMLDialogElement) => element.matches(":modal"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveAttribute("open", "");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toHaveAttribute("open", "");

  dialog = await open("dismissible");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open", "");
  dialog = await open("dismissible");
  await page.mouse.click(8, 8);
  await expect(dialog).not.toHaveAttribute("open", "");

  dialog = await open("Long content");
  const body = dialog.locator(".body");
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(dialog.locator("header")).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Accept" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Accept" }).click();
  await expect(dialog).not.toHaveAttribute("open", "");
});

test("every combobox scenario receives its authored native options", async ({ page }) => {
  await page.goto("components/ui-combobox", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const comboboxes = page.locator("[data-component~='ui-combobox']");
  await expect(comboboxes).toHaveCount(7);
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
          label: row.label
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
      { id: "north", value: "north", label: "North terminal" }
    ]);
  await expect(page.getByRole("option", { name: /North terminal/ })).toHaveCount(1);
  await input.press("Enter");
  await expect(input).toHaveValue("North terminal");
});

test("the desktop hero stays inside the content column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./", { waitUntil: "networkidle" });

  const main = page.getByRole("main");
  const heading = page.getByRole("heading", { level: 1, name: "Looma" });
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
  await page.goto("getting-started", { waitUntil: "domcontentloaded" });

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
  // React support is in development and Svelte is not offered: only HTML Next and Vue examples.
  await expect(modeGroup.getByRole("button")).toHaveText(["HTML Next", "Vue"]);

  await page.goto("components/ui-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code").first()).toContainText("First item");

  await page.getByRole("group", { name: "Example framework" }).first()
    .getByRole("button", { name: "Vue" }).click();
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code").first()).toContainText("Button");
});

test("an invalid saved framework mode falls back to HTML Next", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("looma-docs-framework-mode", "unknown-adapter");
  });
  await page.goto("getting-started", { waitUntil: "domcontentloaded" });

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

/** Ink the control paints inside its own fill: a state that is styled but never drawn reads as off. */
async function markedPixels(control: Locator): Promise<number> {
  const shot = (await control.screenshot()).toString("base64");
  return control.evaluate(async (element, encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const luminance = (index: number) => 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const fill = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)!.map(Number);
    const fillLuminance = 0.299 * fill[0] + 0.587 * fill[1] + 0.114 * fill[2];
    // Inset past the border, so only what the control draws inside itself counts.
    const inset = Math.max(3, Math.round(canvas.width * 0.18));
    let marked = 0;
    for (let y = inset; y < canvas.height - inset; y += 1) {
      for (let x = inset; x < canvas.width - inset; x += 1) {
        if (Math.abs(luminance((y * canvas.width + x) * 4) - fillLuminance) > 60) marked += 1;
      }
    }
    return marked;
  }, shot);
}

test("the home demo is built from Looma components, as it says it is", async ({ page }) => {
  await page.goto("./", { waitUntil: "networkidle" });
  const demo = page.locator(".looma-demo-app");
  await expect(demo).toBeVisible();
  await expect(page.getByText("Live components")).toBeVisible();

  // The demo is labelled live. A hand-rolled control under that label is the site lying about the
  // library, and it hides the library's own bugs: a bare <input type=checkbox> drew a tick from the
  // browser for as long as ui-checkbox drew none.
  const impostors = await demo.evaluate((root) => {
    // A layout primitive around a control does not make the control a Looma control.
    const layout = new Set([
      "ui-stack", "ui-cluster", "ui-grid", "ui-container", "ui-switcher", "ui-reel", "ui-scroll-area", "ui-sidebar"
    ]);
    const controls = root.querySelectorAll("input, select, textarea, button, [role='button'], [role='checkbox'], [role='switch']");
    return [...controls]
      .filter((control) => {
        const owner = control.closest("[data-component]");
        const tag = owner?.getAttribute("data-component")?.split(" ")[0];
        return !tag || layout.has(tag);
      })
      .map((control) => control.outerHTML.replace(/\s+/g, " ").slice(0, 80));
  });
  expect(impostors, "the live demo contains controls that are not Looma components").toEqual([]);

  const components = await demo.evaluate((root) =>
    [...new Set([...root.querySelectorAll("[data-component]")].map((node) => node.getAttribute("data-component")!.split(" ")[0]))].sort()
  );
  expect(components).toEqual(
    expect.arrayContaining(["ui-avatar", "ui-badge", "ui-button", "ui-callout", "ui-checkbox", "ui-top-bar"])
  );
});

test("a multiple combobox checks its chosen options and unchecks them again", async ({ page }) => {
  await page.goto("components/ui-combobox", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='multiple']");
  const input = scenario.getByRole("combobox").first();
  await input.click();
  await input.press("ArrowDown");

  const first = scenario.locator(".option").first();
  await expect(first).toBeVisible();
  const mark = () => first.evaluate((option) => ({
    selected: option.getAttribute("aria-selected"),
    box: getComputedStyle(option, "::before").width,
    tick: getComputedStyle(option, "::before").backgroundImage
  }));

  // Every option carries a checkbox, so a list that takes several answers says so before anything
  // is picked; the chosen ones stay in the list rather than vanishing into the field.
  expect(await mark()).toMatchObject({ selected: "false", box: "18px", tick: "none" });

  await first.click();
  await expect.poll(async () => (await mark()).selected).toBe("true");
  expect((await mark()).tick).toContain("svg");
  await expect(scenario.locator(".item")).toHaveCount(1);

  await first.click();
  await expect.poll(async () => (await mark()).selected).toBe("false");
  await expect(scenario.locator(".item")).toHaveCount(0);
});

test("tone is the colour, variant is the volume, and disabled keeps both", async ({ page }) => {
  await page.goto("components/ui-button", { waitUntil: "networkidle" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  const stage = page.locator("[data-preview-scenario='variant'] .looma-preview-scenario__stage");
  await expect(stage.locator("[data-component~='ui-button']").first()).toBeVisible();

  const painted = await stage.evaluate(async (host) => {
    host.innerHTML = "";
    const wanted: Array<[string, string, boolean]> = [
      ["outline", "accent", false], ["outline", "danger", false], ["outline", "neutral", false],
      ["solid", "accent", false], ["ghost", "accent", false],
      ["outline", "accent", true], ["outline", "danger", true], ["solid", "accent", true], ["ghost", "accent", true]
    ];
    for (const [variant, tone, disabled] of wanted) {
      const button = document.createElement("ui-button");
      button.setAttribute("variant", variant);
      button.setAttribute("tone", tone);
      if (disabled) button.setAttribute("disabled", "");
      button.id = `${variant}-${tone}-${disabled}`;
      button.textContent = `${tone} ${variant}`;
      host.append(button);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return Object.fromEntries([...host.querySelectorAll("[data-component~='ui-button']")].map((button) => {
      const style = getComputedStyle(button);
      return [button.id, {
        border: style.borderColor,
        surface: style.backgroundColor,
        text: style.color,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        filter: style.filter
      }];
    }));
  });

  // An outline is the tone at the edge over a wash of the same tone, so tone changes the colour of
  // the whole button rather than only its text.
  expect(painted["outline-accent-false"].border).not.toBe(painted["outline-danger-false"].border);
  expect(painted["outline-accent-false"].border).not.toBe(painted["outline-neutral-false"].border);
  // rgb(), color(srgb ...), oklch(): one colour has several spellings, so paint each and compare
  // the pixels. The wash is the same colour as the edge at 5%, so its alpha is taken off first.
  const opaque = (value: string) => value.replace(/\/\s*(0?\.\d+|\d+%)\s*\)/, "/ 1)");
  const rendered = async (values: string[]) => page.evaluate((colours) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    return colours.map((colour) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
  }, values);
  const sameColour = async (left: string, right: string) => {
    const [a, b] = await rendered([opaque(left), opaque(right)]);
    return a.every((channel, index) => Math.abs(channel - b[index]) <= 2);
  };

  for (const tone of ["accent", "danger"]) {
    const outline = painted[`outline-${tone}-false`];
    // The wash is the border colour, mostly transparent: same colour, different alpha.
    expect(outline.surface).toContain("0.05");
    expect(await sameColour(outline.surface, outline.border), `${tone} wash is not its own border colour`).toBe(true);
  }
  // Solid fills with the tone the outline draws with: one action at two volumes.
  expect(await sameColour(painted["solid-accent-false"].surface, painted["outline-accent-false"].border)).toBe(true);
  expect(painted["ghost-accent-false"].shadow).toBe("none");

  // Disabled keeps the shape and the tone, washed out by one filter: a disabled outline still reads
  // as an unavailable outline in its own colour, not as a grey box.
  for (const id of ["outline-accent-true", "outline-danger-true", "solid-accent-true", "ghost-accent-true"]) {
    expect(painted[id].shadow, `${id} still looks raised`).toBe("none");
    expect(painted[id].filter, `${id} is not washed out`).toContain("saturate(0.2)");
  }
  expect(painted["outline-accent-false"].filter).toBe("none");
  expect(painted["outline-accent-true"].border).not.toBe(painted["outline-danger-true"].border);
  expect(painted["outline-accent-true"].border).not.toBe(painted["outline-accent-true"].surface);
  expect(painted["solid-accent-true"].border).toBe(painted["solid-accent-true"].surface);
  expect(new Set(Object.values(painted).map((paint) => paint.radius)).size).toBe(1);

  // Nothing jumps under the pointer.
  const button = stage.locator("[data-component~='ui-button']").first();
  const resting = await button.evaluate((element) => getComputedStyle(element).transform);
  await button.hover();
  await expect.poll(async () => button.evaluate((element) => getComputedStyle(element).transform)).toBe(resting);
});

test("a checked checkbox paints its tick", async ({ page }) => {
  await page.goto("components/ui-checkbox", { waitUntil: "domcontentloaded" });
  const control = page.locator("[data-preview-scenario]").first().getByRole("checkbox").first();
  await expect(control).toBeVisible();
  expect(await markedPixels(control)).toBe(0);

  await control.click();
  await expect(control).toBeChecked();

  // The tick used to vanish: lowering dropped `border: solid var(...)`, which left it with no
  // style and therefore no width, so the box filled with accent and showed nothing inside it.
  expect(await markedPixels(control), "checked checkbox draws no tick").toBeGreaterThan(10);
});

test("a tree scrolls a name too long for its row, only when asked, and clears its controls", async ({
  page
}) => {
  await page.goto("components/ui-tree", { waitUntil: "networkidle" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  // Off by default: a tree of names that fit should not move.
  const plain = page.locator("[data-preview-scenario='Default'] [data-component~='ui-tree-item'] .row").first();
  await plain.hover();
  await page.waitForTimeout(900);
  await expect(plain).not.toHaveAttribute("data-ui-marquee", /.*/);

  const scenario = page.locator("[data-preview-scenario='marquee']");
  await scenario.scrollIntoViewIfNeeded();
  const rows = scenario.locator("[data-component~='ui-tree-item'] .row");
  const fits = rows.nth(0);
  const overflows = rows.nth(1);

  await fits.hover();
  await page.waitForTimeout(700);
  // Its controls cover the label box's end but not the name, so there is nothing to scroll.
  await expect(fits, "a name that fits beside its controls does not move").not.toHaveAttribute("data-ui-marquee", /.*/);

  await page.mouse.move(0, 0);
  await overflows.hover();
  await expect(overflows).toHaveAttribute("data-ui-marquee", "");

  const travel = await overflows.evaluate((element) => ({
    distance: parseFloat(getComputedStyle(element).getPropertyValue("--_marquee-distance")),
    duration: parseFloat(getComputedStyle(element).getPropertyValue("--_marquee-duration"))
  }));
  // The duration comes from the distance alone, so every name moves at the same speed.
  expect(travel.duration).toBeCloseTo(Math.abs(travel.distance) / 36, 1);

  const offset = () => overflows.evaluate((element) =>
    new DOMMatrix(getComputedStyle(element.querySelector(".label-text")!).transform).m41);
  await expect.poll(offset, { timeout: 5000 }).toBeLessThan(-12);
  // Where it stops, the whole tail is readable: it ends where the fade before the controls begins.
  const tailClearance = () => overflows.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".label")!;
    const range = document.createRange();
    range.selectNodeContents(element.querySelector(".label-text")!);
    const fadeStart = label.getBoundingClientRect().right - element.querySelector<HTMLElement>(".actions")!.offsetWidth
      - parseFloat(getComputedStyle(label).columnGap);
    return Math.round(fadeStart - range.getBoundingClientRect().right);
  });
  await expect.poll(tailClearance, { timeout: 5000 }).toBeGreaterThanOrEqual(0);
  expect(await tailClearance(), "the tail stops at the fade, not short of it").toBeLessThanOrEqual(1);

  // A row with an icon: the sliding name passes under the icon and fades out there, rather than
  // being cut off at a hard edge beside it.
  const linkRow = page.locator("[data-preview-scenario='Link rows'] [data-item-id='handbook'] .row");
  await page.mouse.move(0, 0);
  await linkRow.scrollIntoViewIfNeeded();
  await linkRow.hover();
  await expect(linkRow).toHaveAttribute("data-ui-marquee", "");
  const underIcon = await linkRow.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".label")!;
    return {
      labelStart: label.getBoundingClientRect().left,
      iconStart: element.querySelector<HTMLElement>(".leading")!.getBoundingClientRect().left,
      mask: getComputedStyle(label).maskImage
    };
  });
  expect(underIcon.labelStart).toBeCloseTo(underIcon.iconStart, 0);
  expect(underIcon.mask).toMatch(/^linear-gradient\(to right, rgba\(0, 0, 0, 0\)/);
  await page.mouse.move(0, 0);
  await overflows.hover();
  await expect(overflows).toHaveAttribute("data-ui-marquee", "");

  await page.mouse.move(0, 0);
  await expect(overflows).not.toHaveAttribute("data-ui-marquee", /.*/);
  await expect.poll(offset).toBe(0);
});

test("tree row actions reveal on hover instead of reserving row width", async ({ page }) => {
  await page.goto("components/ui-tree-item", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Actions slot']");
  const row = scenario.locator("[data-component~='ui-tree-item'] .row").first();
  await expect(row).toBeVisible();

  // Controls that only appear on hover must not shorten the label: a sidebar row should run out
  // of width at the tree's edge, not at the start of a reserved actions column.
  const resting = await row.evaluate((element) => {
    const actions = element.querySelector<HTMLElement>(".actions")!;
    const label = element.querySelector<HTMLElement>(".label")!;
    return {
      opacity: getComputedStyle(actions).opacity,
      labelToRowEnd: element.getBoundingClientRect().right - label.getBoundingClientRect().right,
      chevronToRowStart:
        element.querySelector<HTMLElement>(".disclosure-icon")!.getBoundingClientRect().left
        - element.getBoundingClientRect().left
    };
  });
  expect(resting.opacity).toBe("0");
  expect(Math.abs(resting.labelToRowEnd)).toBeLessThanOrEqual(1);
  // The chevron's ink starts the row, so a heading above the tree lines up with it.
  expect(Math.abs(resting.chevronToRowStart)).toBeLessThanOrEqual(1);

  await row.hover();
  await expect
    .poll(async () => row.evaluate((element) => getComputedStyle(element.querySelector(".actions")!).opacity))
    .toBe("1");

  // The label keeps its width while they are visible, so the name never re-truncates under the
  // pointer. Its end fades out where they begin, and that fade replaces the ellipsis.
  const hovered = await row.evaluate((element) => {
    const actions = element.querySelector<HTMLElement>(".actions")!;
    const label = element.querySelector<HTMLElement>(".label")!;
    const labelStyle = getComputedStyle(label);
    return {
      position: getComputedStyle(actions).position,
      mask: labelStyle.maskImage,
      textOverflow: labelStyle.textOverflow,
      publishedWidth: getComputedStyle(element.closest("[data-component~='ui-tree-item']")!)
        .getPropertyValue("--_tree-actions-width"),
      actionsWidth: actions.getBoundingClientRect().width,
      labelToRowEnd: element.getBoundingClientRect().right - label.getBoundingClientRect().right
    };
  });
  expect(hovered.position).toBe("absolute");
  expect(hovered.mask).toContain("gradient");
  expect(hovered.textOverflow).toBe("clip");
  expect(Math.abs(hovered.labelToRowEnd)).toBeLessThanOrEqual(1);
  // The fade ends where the controls start, so it tracks their measured width.
  expect(parseFloat(hovered.publishedWidth)).toBeCloseTo(hovered.actionsWidth, 0);
});

test("catalog cards centre a nested demo and give a form footer the card's width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("components/", { waitUntil: "networkidle" });

  // Affordance Scope's buttons sit in a cluster; only an example's own root layout fills the card.
  const scope = page.locator("[data-component-card='ui-affordance-scope'] .looma-component-card__preview");
  await scope.scrollIntoViewIfNeeded();
  const offCentre = await scope.evaluate((preview) => {
    const card = preview.getBoundingClientRect();
    const buttons = Array.from(preview.querySelectorAll("[data-component~='ui-icon-button']"), (button) => button.getBoundingClientRect());
    return Math.abs((buttons[0].left + buttons.at(-1)!.right) / 2 - (card.left + card.right) / 2);
  });
  expect(offCentre).toBeLessThan(2);

  // The form fills the card, so its Action Bar is wide enough to set its actions in one row.
  const bar = page.locator("[data-component-card='ui-action-bar'] [data-component~='ui-action-bar']");
  await bar.scrollIntoViewIfNeeded();
  const rows = await bar.locator("[data-component~='ui-button']").evaluateAll((buttons) =>
    new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))).size);
  expect(rows).toBe(1);
});

test("the catalog renders one filter per sidebar category and each filter narrows the grid", async ({
  page
}) => {
  await page.goto("components/", { waitUntil: "networkidle" });
  const filters = page.locator(".looma-catalog__filters button");
  const cards = page.locator("[data-component-card]");

  // The bundle downlevels iterable spread, so a Set spread renders one filter holding every
  // label. Each category must be its own control with its own count.
  const labels = await filters.allInnerTexts();
  expect(labels.length).toBeGreaterThan(2);
  const total = await cards.count();
  expect(labels[0].replace(/\s+/g, " ")).toBe(`All ${total}`);

  let counted = 0;
  for (let index = 1; index < labels.length; index += 1) {
    const [name, count] = labels[index].split("\n");
    expect(Number(count)).toBeGreaterThan(0);
    counted += Number(count);
    await filters.nth(index).click();
    await expect(cards).toHaveCount(Number(count));
    await expect(filters.nth(index)).toHaveAttribute("aria-pressed", "true");
    expect(name).toMatch(/^[A-Za-z]+$/);
  }
  expect(counted).toBe(total);

  await filters.first().click();
  await expect(cards).toHaveCount(total);
});

test("checkbox, switch, and radio APIs generate their own aligned native controls", async ({ page }) => {
  await page.goto("components/ui-checkbox", { waitUntil: "domcontentloaded" });
  const checkboxScenario = page.locator("[data-preview-scenario='Default']");
  await expect(checkboxScenario.locator("[data-component~='ui-checkbox']")).toBeVisible();
  const checkbox = checkboxScenario.getByRole("checkbox", { name: "Checkbox" });
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  const checkboxCode = checkboxScenario.locator(".looma-mode-code").first();
  await expect(checkboxCode).toContainText("<ui-checkbox>");
  await expect(checkboxCode).not.toContainText("<input");

  const multiline = page.locator("[data-preview-scenario='Multi-line label']");
  const alignment = await multiline.locator("[data-component~='ui-checkbox']").evaluate((root) => {
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
  // The runtime lowers the component after load; its styles only apply once it has.
  await expect(
    page.locator("[data-preview-scenario='Default'] [data-component~='ui-switch']")
  ).toBeVisible();
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
  // The track colour transitions; read it once the transition has finished.
  await switchControl.evaluate(async (input) => {
    await Promise.all(input.getAnimations().map((animation) => animation.finished));
  });
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
    const badges = page.locator("[data-preview-scenario] [data-component~='ui-badge']");
    // Default, five solid tones, five subtle tones, then the shape example.
    await expect(badges).toHaveCount(15);
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
    // Every tone's edge is its fill, the neutral default's included: no tone carries an outline.
    for (const treatment of treatments.slice(0, 11)) expect(treatment.border).toBe(treatment.background);
    expect(new Set(treatments.slice(1, 6).map(({ background }) => background)).size).toBe(5);
    expect(new Set(treatments.slice(6, 11).map(({ background }) => background)).size).toBe(5);
  }
});

test("every callout tone renders its icon without an empty oversized indent", async ({ page }) => {
  await page.goto("components/ui-callout", { waitUntil: "domcontentloaded" });
  const callouts = page.locator("[data-preview-scenario] [data-component~='ui-callout']");
  await expect(callouts).toHaveCount(4);
  const treatments = await callouts.evaluateAll((roots) => roots.map((root) => {
    const surface = root;
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

test("disabled buttons are natively disabled and ignore activation", async ({ page }) => {
  // Regression: the prop facade shadows HTMLButtonElement.disabled, so the native state must come
  // from the :disabled attribute binding rather than from assigning the property.
  for (const [slug, root] of [["ui-button", "ui-button"], ["ui-icon-button", "ui-icon-button"]] as const) {
    await page.goto(`components/${slug}`, { waitUntil: "domcontentloaded" });
    const control = page.locator(`[data-preview-scenario='disabled'] [data-component~='${root}']`).first();
    await expect(control).toBeDisabled();
    const clicked = await control.evaluate((element) => {
      let activated = false;
      element.addEventListener("click", () => { activated = true; });
      (element as HTMLElement).click();
      return activated;
    });
    expect(clicked).toBe(false);
  }
});

test("tree disclosure is per node: expand does not bubble and never cascades to ancestors", async ({ page }) => {
  await page.goto("components/ui-tree", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "tree-conformance";
    host.innerHTML = `<ui-tree label="Conformance tree">
      <ui-tree-item item-id="root" label="root" expanded>
        <ui-tree-item item-id="middle" label="middle" expanded>
          <ui-tree-item item-id="leaf-parent" label="leaf-parent">
            <ui-tree-item item-id="leaf" label="leaf"></ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>
      <ui-tree-item item-id="closed" label="closed">
        <ui-tree-item item-id="deep" label="deep" expanded selected>
          <ui-tree-item item-id="deeper" label="deeper"></ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>
    </ui-tree>`;
    document.body.append(host);
  });
  const tree = page.getByRole("tree", { name: "Conformance tree" });
  const item = (name: string) => tree.getByRole("treeitem", { name, exact: true });
  await expect(item("root")).toHaveAttribute("aria-expanded", "true");

  // 1. Toggling a nested item emits exactly one `expand`, on that item; ancestors see none.
  await page.evaluate(() => {
    const received: string[] = [];
    (window as unknown as { expandEvents: string[] }).expandEvents = received;
    for (const element of document.querySelectorAll("#tree-conformance [data-component~='ui-tree-item']")) {
      element.addEventListener("expand", (event) => {
        received.push(`${(element as HTMLElement).getAttribute("data-item-id") ?? element.getAttribute("aria-label")}:${(event as CustomEvent<{ id: string }>).detail.id}`);
      });
    }
  });
  await item("leaf-parent").getByRole("button", { name: "Expand leaf-parent" }).click();
  await expect(item("leaf-parent")).toHaveAttribute("aria-expanded", "true");
  const events = await page.evaluate(() => (window as unknown as { expandEvents: string[] }).expandEvents);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatch(/:leaf-parent$/);

  // 2. A selected, expanded deep node leaves its collapsed ancestor collapsed.
  await expect(item("closed")).toHaveAttribute("aria-expanded", "false");

  // 3. Collapsing a nested node leaves its parent open.
  await item("middle").getByRole("button", { name: "Collapse middle" }).click();
  await expect(item("middle")).toHaveAttribute("aria-expanded", "false");
  await expect(item("root")).toHaveAttribute("aria-expanded", "true");
});
