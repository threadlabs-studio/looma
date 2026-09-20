import { expect, test, type Locator, type Page } from "@playwright/test";
import axe from "axe-core";

import componentApi from "../../../generated/component-api.json";

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
    const parse = (color: string): Rgba => {
      const channels = color.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3) throw new Error(`Unsupported color: ${color}`);
      return [channels[0]!, channels[1]!, channels[2]!, channels[3] ?? 1];
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
  await expect(target).toContainText("Right-click this area");

  await target.click({ button: "right", position: { x: 24, y: 24 } });
  await expect(page.getByRole("menuitem", { name: "First item", exact: true })).toBeVisible();
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
  const checkbox = page.getByLabel("Checkbox");
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
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
    `align="center" and justify="between"`,
    `wrap="wrap"`
  ]);
  await expect(page.getByRole("heading", { level: 2, name: `wrap="wrap"` })).toBeVisible();
  await expect(page.locator(`[data-preview-scenario='wrap="wrap"']`)).toContainText(
    "Archive"
  );
  const wrapping = page.locator(`[data-preview-scenario='wrap="wrap"']`);
  await expect(wrapping.locator(".looma-mode-code")).toContainText("Archive");
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
  await page.goto("components/ui-combobox", { waitUntil: "domcontentloaded" });
  const scenario = page.locator("[data-preview-scenario='Label and options']");
  const code = scenario.locator(".looma-mode-code");
  const modes = scenario.getByRole("group", { name: "Example framework" });

  await expect(code).toContainText('document.querySelector("#destination-picker").config');
  await expect(code).toContainText("North terminal");
  await modes.getByRole("button", { name: "Vue" }).click();
  await expect(code).toContainText(':config="comboboxConfig"');
  await modes.getByRole("button", { name: "React" }).click();
  await expect(code).toContainText("config={comboboxConfig}");
  await modes.getByRole("button", { name: "Svelte" }).click();
  await expect(code).toContainText("config={comboboxConfig}");
});

test("ui-inline applies its declared spacing, alignment, and distribution values", async ({ page }) => {
  await page.goto("components/ui-inline", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const basicRow = page.locator("[data-preview-scenario='Default'] [data-component-root~='ui-inline']");
  await expect(basicRow).toBeVisible();
  await expect(basicRow).toHaveCSS("gap", "12px");
  await expect(basicRow).toHaveCSS("justify-content", "flex-start");

  const largerSpacing = page.locator(`[data-preview-scenario='gap="l"'] [data-component-root~='ui-inline']`);
  await expect(largerSpacing).toHaveCSS("gap", "24px");

  const alignment = page.locator(`[data-preview-scenario='align="center" and justify="between"'] [data-component-root~='ui-inline']`);
  await expect(alignment).toHaveCSS("gap", "16px");
  await expect(alignment).toHaveCSS("align-items", "center");
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

test("every dialog scenario opens and closes through the component state contract", async ({ page }) => {
  await page.goto("components/ui-dialog", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const scenarios = page.locator("[data-preview-scenario]");
  for (let index = 0; index < await scenarios.count(); index += 1) {
    const scenario = scenarios.nth(index);
    const trigger = scenario.locator("[data-dialog-demo]");
    const dialog = scenario.locator("dialog");
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    const isModal = await dialog.evaluate((element: HTMLDialogElement) => element.matches(":modal"));
    expect(isModal).toBe(index === 1);
    await scenario.locator("[data-dialog-close]").click();
    await expect(dialog).not.toHaveAttribute("open", "");
  }
});

test("every combobox scenario receives its structured options", async ({ page }) => {
  await page.goto("components/ui-combobox", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);

  const comboboxes = page.locator("[data-component-root~='ui-combobox']");
  await expect(comboboxes).toHaveCount(2);
  expect(await comboboxes.evaluateAll((elements) => elements.map((element) => {
    const config = (element as HTMLElement & { config?: { options?: unknown[] } }).config;
    return config?.options?.length ?? 0;
  }))).toEqual([2, 2]);
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
