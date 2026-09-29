import { expect, test } from "@playwright/test";

test("tree demos keep controlled selection and apply a keyboard reorder", async ({ page }) => {
  await page.goto("components/ui-tree", { waitUntil: "domcontentloaded" });
  const moving = page.locator('[data-preview-scenario="Move with clicks or keys"]');
  const moveTree = moving.getByRole("tree", { name: "Pages" });
  await expect(moveTree.getByRole("treeitem")).toHaveCount(3);
  const handle = moveTree.getByRole("button", { name: "Drag Details to reorder" });
  await handle.click();
  await handle.press("ArrowDown");
  await handle.press("Enter");
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

test("editor guide sidebar jumps to sections and its live editor responds to configuration", async ({ page }) => {
  await page.goto("editor", { waitUntil: "domcontentloaded" });
  const sidebar = page.getByRole("navigation", { name: "Docs sidebar" });
  await expect(sidebar.getByRole("link", { name: "Mentions" })).toHaveAttribute("href", /#mentions$/);
  await expect(sidebar.getByRole("link", { name: "Configuration" })).toHaveAttribute("href", /#configuration-and-events$/);
  const editor = page.getByRole("textbox", { name: "Editor guide playground" });
  await expect(editor).toBeVisible();
  await expect(page.getByRole("button", { name: "Highlight", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Reserve highlighting for the application" }).check();
  await expect(page.getByRole("button", { name: "Highlight", exact: true })).toHaveCount(0);
  await editor.click();
  await editor.press("End");
  await editor.pressSequentially(" @Ada");
  const mentions = page.getByRole("listbox", { name: "Mentions" });
  await expect(mentions.getByRole("option", { name: /Ada Lovelace/ })).toBeVisible();
  await expect(mentions.locator(".header")).toBeHidden();
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
