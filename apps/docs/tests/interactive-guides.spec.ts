import { expect, test } from "@playwright/test";

test("tree demos keep controlled selection and apply a keyboard reorder", async ({ page }) => {
  await page.goto("components/ui-tree", { waitUntil: "domcontentloaded" });
  const moving = page.locator('[data-preview-scenario="Move with clicks or keys"]');
  const moveTree = moving.getByRole("tree", { name: "Pages" });
  await expect(moveTree.getByRole("treeitem")).toHaveCount(3);
  const handle = moveTree.getByRole("button", { name: "Drag Details to reorder" });
  await handle.click();
  await expect(moveTree.getByRole("button", { name: "Cancel move" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(moveTree.locator('[data-item-id="history"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => moveTree.getByRole("treeitem").evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-item-id"))
  )).toEqual(["overview", "history", "details"]);

  const selection = page.locator('[data-preview-scenario="Multiple selection"]');
  const selectTree = selection.getByRole("tree", { name: "Documents" });
  await selectTree.getByRole("checkbox", { name: "Select Annual" }).click();
  await expect(selectTree.getByRole("treeitem", { name: "Annual" })).toHaveAttribute("aria-selected", "true");
  await expect(selectTree.getByRole("treeitem", { name: "Quarterly" })).toHaveAttribute("aria-selected", "true");
  await selectTree.getByRole("checkbox", { name: "Select Notes" }).click();
  await expect(selectTree.getByRole("treeitem", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
});

test("editor guide demonstrates both toolbar placements and mentions", async ({ page }) => {
  await page.goto("editor", { waitUntil: "domcontentloaded" });
  const sidebar = page.getByRole("navigation", { name: "Docs sidebar" });
  await expect(sidebar.getByRole("link", { name: "Mentions" })).toHaveAttribute("href", /#mentions$/);
  await expect(sidebar.getByRole("link", { name: "Configuration" })).toHaveAttribute("href", /#configuration-and-events$/);
  const editor = page.getByRole("textbox", { name: "Editor guide playground" });
  await expect(editor).toBeVisible();
  const demo = page.locator(".looma-editor-guide-demo");
  const scroller = demo.locator(".looma-editor-guide-demo__editor");
  const stickyToolbar = demo.getByRole("toolbar", { name: "Editor tools" });
  await expect(stickyToolbar).toBeVisible();
  await expect(page.getByRole("button", { name: "Highlight", exact: true })).toBeVisible();
  await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => stickyToolbar.boundingBox().then((box) => box?.y)).toBeCloseTo((await scroller.boundingBox())!.y, 0);
  const previousEditor = await editor.elementHandle();
  await demo.getByRole("button", { name: "Beside selection" }).click();
  await previousEditor!.waitForElementState("hidden");
  await expect(editor).toBeVisible();
  await expect(stickyToolbar).toHaveCount(0);
  await expect(demo.getByText("Select some text to reveal the toolbar.")).toBeVisible();
  await demo.evaluate((element) => { element.style.overflow = "clip"; });
  await editor.locator("p").first().click();
  await editor.press("Shift+ArrowRight");
  const selectionToolbar = page.locator("[data-tippy-root]:visible").filter({ has: page.getByRole("button", { name: "Bold" }) });
  await expect(selectionToolbar).toBeVisible();
  expect(await selectionToolbar.evaluate((element) => element.parentElement === document.body)).toBe(true);
  await editor.click();
  await editor.press("End");
  await editor.pressSequentially(" @Ada");
  const mentions = page.getByRole("listbox", { name: "Mentions" });
  await expect(mentions.getByRole("option", { name: /Ada Lovelace/ })).toBeVisible();
  await expect(mentions.locator(".header")).toBeHidden();
});

test("editor guide offers HTML code highlighting", async ({ page }) => {
  await page.goto("editor", { waitUntil: "domcontentloaded" });
  const editor = page.getByRole("textbox", { name: "Editor guide playground" });
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.press("ControlOrMeta+End");
  await editor.press("Enter");
  await editor.pressSequentially("```");
  const language = page.locator('.looma-editor__code-language [role="combobox"]');
  await expect(language).toBeVisible();
  await language.press("ArrowDown");
  await expect(page.getByRole("option", { name: "HTML", exact: true })).toBeVisible();
});

test("rich authored tabs receive the same control styling as generated tabs", async ({ page }) => {
  await page.goto("components/ui-tabs", { waitUntil: "domcontentloaded" });
  const rich = page.locator('[data-preview-scenario="Rich tab labels"] [role="tab"]').first();
  await expect(rich).toBeVisible();
  const appearance = await rich.evaluate((element) => {
    const style = getComputedStyle(element);
    return { height: element.getBoundingClientRect().height, borderTopStyle: style.borderTopStyle, paddingInline: style.paddingInlineStart };
  });
  expect(appearance.height).toBeLessThan(60);
  expect(appearance.borderTopStyle).toBe("none");
  expect(Number.parseFloat(appearance.paddingInline)).toBeGreaterThan(0);
});
