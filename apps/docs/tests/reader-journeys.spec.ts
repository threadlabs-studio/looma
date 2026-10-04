import { test, expect, ready } from "./docs-fixture";

test("sidebar navigation, a heading deep link, reload, and history keep the reader's location", async ({ page }) => {
  await page.goto("getting-started/");
  await ready(page);
  await page.getByRole("navigation", { name: "Docs sidebar" }).getByRole("button", { name: "Foundations", exact: true }).click();
  await page.getByRole("navigation", { name: "Docs sidebar" }).getByRole("link", { name: "Architecture", exact: true }).click();
  await expect(page).toHaveURL(/\/architecture\/$/);
  await ready(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/getting-started\/$/);
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Architecture");
  const headingLink = page.locator("main .hash-link").last();
  const fragment = await headingLink.getAttribute("href");
  const target = page.locator(`[id=${JSON.stringify(decodeURIComponent(fragment!.slice(1)))}]`);
  await expect(target).not.toBeInViewport();
  await headingLink.click();
  await expect(page).toHaveURL(new RegExp(`${fragment}$`));
  await expect(target).toBeInViewport();
  await page.reload();
  // Assert native fragment restoration before ready() resets scroll for layout measurements.
  await expect(target).toBeInViewport();
  await ready(page);
  await expect(page).toHaveURL(new RegExp(`${fragment}$`));
});

test("copy sends the displayed authored example to the clipboard", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      async writeText(text: string) { document.documentElement.setAttribute("data-copied-example", text); }
    } });
  });
  await page.goto("components/ui-button/");
  await ready(page);
  const code = page.locator('[data-preview-example="01-default"] .looma-mode-code');
  const displayed = await code.locator("code").innerText();
  await code.hover();
  await code.getByRole("button", { name: /Copy code/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-example", displayed.trimEnd());
});

test("theme and framework selection survive a reload and another page", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light"); });
  await page.goto("components/ui-button/");
  await ready(page);
  await page.getByRole("button", { name: /Switch between dark and light mode/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Vue", exact: true }).first().click();
  await page.reload();
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('.looma-mode-code[data-framework-mode="vue"]')).toHaveCount(9);
  await page.goto("components/ui-checkbox/");
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('.looma-mode-code[data-framework-mode="vue"]')).toHaveCount(7);
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 }, colorScheme: "light" });
  test("code wrapping toggles without changing the authored snippet", async ({ page }) => {
    await page.goto("components/ui-tooltip/");
    await ready(page);
    const pane = page.locator(".looma-mode-code").first();
    const code = pane.locator("code");
    const authored = await code.innerText();
    await pane.hover();
    const toggle = pane.getByRole("button", { name: "Toggle word wrap", exact: true });
    await toggle.click();
    await expect(code).toHaveCSS("white-space", "pre-wrap");
    await expect.poll(() => pane.locator("pre").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await expect.poll(() => code.innerText()).toBe(authored);
    await toggle.click();
    await expect(code).toHaveCSS("white-space", "pre");
    await expect.poll(() => code.innerText()).toBe(authored);
  });
  test("opens, follows a component link, and closes", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("components/ui-button/");
    await ready(page);
    const toggle = page.getByRole("button", { name: "Toggle navigation bar", exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".navbar-sidebar")).toHaveCSS("background-color", "rgb(251, 249, 244)");
    await expect.poll(async () => (await page.locator(".navbar-sidebar").boundingBox())?.height ?? 0).toBeGreaterThan(800);
    await page.locator(".navbar-sidebar").getByRole("link", { name: "Checkbox", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkbox");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await page.getByRole("button", { name: "Close navigation bar", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("server-rendered reading", () => {
  test.use({ javaScriptEnabled: false });
  test("documentation prose and navigation work before JavaScript", async ({ page }) => {
    await page.goto("getting-started/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Getting Started");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Components", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Components");
  });
});
