import type { Locator, Page } from "@playwright/test";
import { expect } from "./docs-fixture";

/** Reader actions shared by browser assertions and screenshots of the resulting state. */
export const interactionCases: {
  component: string;
  example: string;
  name: string;
  run: (page: Page, scenario: Locator) => Promise<void>;
}[] = [
  {
    component: "ui-context-menu", example: "01-target-binding", name: "keyboard-open context menu",
    async run(_page, scenario) {
      const target = scenario.locator("#context-menu-target");
      await target.focus();
      await target.press("Shift+F10");
      await expect(scenario.getByRole("menuitem", { name: "First item", exact: true })).toBeVisible();
    }
  },
  {
    component: "ui-tree", example: "01-default", name: "keyboard-expanded branch",
    async run(_page, scenario) {
      const folder = scenario.locator('[data-item-id="docs"]');
      await folder.focus();
      await folder.press("ArrowRight");
      await expect(folder).toHaveAttribute("aria-expanded", "true");
      await expect(scenario.getByRole("treeitem", { name: "guide.md", exact: true })).toBeVisible();
    }
  },
  {
    component: "ui-combobox", example: "03-multiple", name: "multiple selection popup",
    async run(_page, scenario) {
      const field = scenario.getByRole("combobox");
      await field.focus();
      await field.press("ArrowDown");
      const platform = scenario.getByRole("option", { name: "Platform", exact: true });
      await platform.click();
      await expect(platform).toHaveAttribute("aria-selected", "true");
      await expect(scenario.getByRole("option", { name: "Design", exact: true })).toHaveAttribute("aria-selected", "true");
    }
  },
  {
    component: "ui-toast-region", example: "01-default-closed", name: "notification shown on demand",
    async run(_page, scenario) {
      await expect(scenario.locator(".toast")).toHaveCount(0);
      await scenario.getByRole("button", { name: "Show toast", exact: true }).click();
      await expect(scenario.locator(".toast")).toContainText("Page saved.");
    }
  },
  {
    component: "ui-checkbox", example: "01-default", name: "checked by keyboard",
    async run(_page, scenario) {
      const control = scenario.getByRole("checkbox");
      await expect(control).not.toBeChecked();
      await control.focus();
      await control.press("Space");
      await expect(control).toBeChecked();
    }
  },
  {
    component: "ui-switch", example: "01-default", name: "on by keyboard",
    async run(_page, scenario) {
      const control = scenario.getByRole("switch");
      await expect(control).not.toBeChecked();
      await control.focus();
      await control.press("Space");
      await expect(control).toBeChecked();
    }
  },
  {
    component: "ui-radio-group", example: "01-default-horizontal", name: "exclusive selection",
    async run(_page, scenario) {
      await scenario.getByRole("radio", { name: "One", exact: true }).check();
      await scenario.getByRole("radio", { name: "Two", exact: true }).check();
      await expect(scenario.getByRole("radio", { name: "One", exact: true })).not.toBeChecked();
      await expect(scenario.getByRole("radio", { name: "Two", exact: true })).toBeChecked();
    }
  },
  {
    component: "ui-input", example: "03-required", name: "native required validation",
    async run(_page, scenario) {
      const input = scenario.locator("input");
      expect(await input.evaluate((node: HTMLInputElement) => node.checkValidity())).toBe(false);
      await input.fill("Written by a reader");
      await expect(input).toHaveValue("Written by a reader");
      expect(await input.evaluate((node: HTMLInputElement) => node.checkValidity())).toBe(true);
    }
  },
  {
    component: "ui-textarea", example: "01-default", name: "editable multiline value",
    async run(_page, scenario) {
      const control = scenario.getByRole("textbox");
      await control.fill("First line\nSecond line");
      await expect(control).toHaveValue("First line\nSecond line");
    }
  },
  {
    component: "ui-select", example: "01-default", name: "native option selection",
    async run(_page, scenario) {
      const control = scenario.getByRole("combobox");
      const value = await control.locator("option").nth(1).getAttribute("value");
      await control.selectOption({ index: 1 });
      await expect(control).toHaveValue(value!);
    }
  },
  {
    component: "ui-editable", example: "01-default", name: "commit and cancel edits",
    async run(_page, scenario) {
      await scenario.getByRole("button", { name: "Editable text", exact: true }).click();
      const input = scenario.getByRole("textbox", { name: "Project title" });
      await expect(input).toBeFocused();
      await input.fill("Published title");
      await input.press("Enter");
      const preview = scenario.getByRole("button", { name: "Published title", exact: true });
      await expect(preview).toBeVisible();
      await preview.click();
      await input.fill("Discard this");
      await input.press("Escape");
      await expect(preview).toBeVisible();
      await preview.click();
      await expect(input).toHaveValue("Published title");
    }
  },
  {
    component: "ui-disclosure", example: "03-named-group", name: "exclusive expanded panel",
    async run(_page, scenario) {
      const account = scenario.getByRole("button", { name: /Account/ });
      const billing = scenario.getByRole("button", { name: "Billing", exact: true });
      await account.click();
      await expect(account).toHaveAttribute("aria-expanded", "true");
      await billing.click();
      await expect(billing).toHaveAttribute("aria-expanded", "true");
      await expect(account).toHaveAttribute("aria-expanded", "false");
    }
  },
  {
    component: "ui-tabs", example: "01-default-horizontal", name: "keyboard-selected panel",
    async run(_page, scenario) {
      const preview = scenario.getByRole("tab", { name: "Preview", exact: true });
      await preview.focus();
      await preview.press("ArrowRight");
      await expect(scenario.getByRole("tab", { name: "Code", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(scenario.getByRole("tabpanel", { name: "Code", exact: true })).toBeVisible();
    }
  },
  {
    component: "ui-listbox", example: "01-single", name: "keyboard-selected option",
    async run(_page, scenario) {
      const listbox = scenario.getByRole("listbox");
      await listbox.focus();
      await listbox.press("Home");
      await listbox.press("ArrowDown");
      await expect(scenario.getByRole("option", { name: "Team", exact: true })).toHaveAttribute("aria-selected", "true");
    }
  },
  {
    component: "ui-menu", example: "06-checkable", name: "checkable open menu",
    async run(_page, scenario) {
      await scenario.getByRole("button", { name: "View", exact: true }).click();
      const grid = scenario.getByRole("menuitemcheckbox", { name: "Show grid", exact: true });
      await grid.click();
      await expect(grid).toHaveAttribute("aria-checked", "false");
      await scenario.getByRole("menuitemradio", { name: "Date", exact: true }).click();
      await expect(scenario.getByRole("menuitemradio", { name: "Name", exact: true })).toHaveAttribute("aria-checked", "false");
      await expect(scenario.getByRole("menuitemradio", { name: "Date", exact: true })).toHaveAttribute("aria-checked", "true");
      await expect(scenario.getByRole("menu", { name: "View options", exact: true })).toBeVisible();
    }
  },
  {
    component: "ui-dialog", example: "01-default", name: "open dialog and restored focus",
    async run(_page, scenario) {
      const trigger = scenario.getByRole("button", { name: "Open dialog", exact: true });
      await trigger.focus();
      await trigger.press("Enter");
      const dialog = scenario.getByRole("dialog", { name: "Publish changes?", exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(dialog).toBeVisible();
    }
  },
  {
    component: "ui-popover", example: "01-trigger-binding", name: "open anchored popover",
    async run(_page, scenario) {
      const trigger = scenario.getByRole("button", { name: "Open popover", exact: true });
      await trigger.click();
      await expect(scenario.getByText("Popover content.", { exact: true })).toBeVisible();
    }
  },
  {
    component: "ui-icon-button", example: "05-help-toggletip", name: "open help toggletip",
    async run(_page, scenario) {
      const trigger = scenario.getByRole("button", { name: "Help for Email", exact: true });
      await trigger.focus();
      await trigger.press("Enter");
      const tooltip = scenario.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await trigger.press("Escape");
      await expect(tooltip).not.toBeVisible();
      await trigger.press("Space");
      await expect(tooltip).toBeVisible();
    }
  },
  {
    component: "ui-sidebar", example: "01-app-shell", name: "command toggles sidebar",
    async run(page, scenario) {
      const trigger = scenario.getByRole("button", { name: "Toggle sidebar", exact: true });
      const link = scenario.getByRole("link", { name: "Inbox", exact: true });
      if (page.viewportSize()!.width < 768) {
        await expect(scenario.locator('[data-component~="ui-sidebar"]')).toHaveAttribute("popover", "auto");
        await expect(link).not.toBeVisible();
        await trigger.click();
        await expect(link).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(link).not.toBeVisible();
        await trigger.click();
        await expect(link).toBeVisible();
        return;
      }
      await expect(link).toBeVisible();
      await trigger.click();
      await expect(link).not.toBeVisible();
      await trigger.click();
      await expect(link).toBeVisible();
    }
  }
];
