import { expect, test, type Locator, type Page } from "@playwright/test";
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
  const modeGroup = page.getByRole("group", { name: "Example framework" }).first();
  const modeCode = page.locator(".looma-component-mode-example .looma-mode-code");

  await modeGroup.getByRole("button", { name: "Vue" }).click();
  await expect(modeCode).toContainText(':near-radius="16"');
  await modeGroup.getByRole("button", { name: "React" }).click();
  await expect(modeCode).toContainText("nearRadius={16}");
  await modeGroup.getByRole("button", { name: "Svelte" }).click();
  await expect(modeCode).toContainText("nearRadius: 16");

  await page.goto("components/ui-menu", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code")).toContainText(
    '<ui-menu-item value="edit">Edit</ui-menu-item>'
  );

  await page.getByRole("group", { name: "Example framework" }).first()
    .getByRole("button", { name: "Svelte" }).click();
  await page.goto("components/ui-button", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".looma-component-mode-example .looma-mode-code")).toContainText(
    '<button type="button">Button</button>'
  );
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

  const ghostButtonColors = await computedOpaqueColors(
    page.getByRole("button", { name: "Ghost" })
  );
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
