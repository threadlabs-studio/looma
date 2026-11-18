import { componentRegistry, pendingControllers } from "@nextwebwg/html-next/runtime";
import { page, userEvent } from "vitest/browser";
import { afterEach, expect, it, vi } from "vitest";
const source = await fetch(new URL("../src/components/ui-form-field/examples/04-validation-summary.html", import.meta.url)).then(response => response.text());
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

afterEach(() => {
  document.body.innerHTML = "";
  delete document.documentElement.dataset.theme;
});

it("routes summary links to labelled native inputs and keeps inline errors in their descriptions", async () => {
  document.body.innerHTML = source;
  await vi.waitFor(() => expect(document.querySelector("input#summary-email")).not.toBeNull());
  const summary = document.querySelector<HTMLElement>("[data-error-summary]")!;
  const name = document.querySelector<HTMLInputElement>("input#summary-name")!;
  const email = document.querySelector<HTMLInputElement>("input#summary-email")!;
  await vi.waitFor(() => expect(name.getAttribute("aria-invalid")).toBe("true"));
  for (const [control, message] of [[name, "Enter your name."], [email, "Enter a valid email address."]] as const) {
    expect(control.labels?.length).toBe(1);
    const description = control.getAttribute("aria-describedby")!.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(" ");
    expect(description).toContain(message);
  }
  summary.focus(); expect(document.activeElement).toBe(summary);
  await userEvent.tab(); expect(document.activeElement?.textContent).toBe("Enter your name.");
  await userEvent.keyboard("{Enter}"); expect(document.activeElement).toBe(name);
  await page.getByRole("link", { name: "Enter a valid email address." }).click();
  expect(document.activeElement).toBe(email);
});

it("keeps a field error through a late input update and restores the input's own state when cleared", async () => {
  document.body.innerHTML = `
    <ui-form-field id="field" invalid>
      <label slot="label" for="message">Message</label>
      <ui-input id="message" invalid></ui-input>
      <small slot="error">Enter a message.</small>
    </ui-form-field>`;
  await vi.waitFor(() => expect(document.querySelector("input#message")).toBeTruthy());
  await Promise.all(pendingControllers(document.body));
  const field = document.querySelector("#field")!;
  const input = document.querySelector("input#message")!;
  const expectInvalid = (invalid: boolean) => vi.waitFor(() =>
    expect(input.getAttribute("aria-invalid")).toBe(String(invalid)));
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  componentRegistry.update(field, { invalid: false });
  await frame();
  expect(input.getAttribute("aria-invalid")).toBe("true");
  componentRegistry.update(field, { invalid: true });
  await frame();

  const oldValues: (string | null)[] = [];
  const observer = new MutationObserver((entries) => oldValues.push(...entries.map((entry) => entry.oldValue)));
  observer.observe(input, { attributes: true, attributeFilter: ["aria-invalid"], attributeOldValue: true });
  try {
    componentRegistry.update(input, { invalid: false });
    await vi.waitFor(() => expect(oldValues).toContain("true"));
    await expectInvalid(true);
    componentRegistry.update(field, { invalid: false });
    await expectInvalid(false);

    componentRegistry.update(field, { invalid: true });
    await expectInvalid(true);
    componentRegistry.update(input, { invalid: true });
    await frame();
    componentRegistry.update(field, { invalid: false });
    await frame();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  } finally {
    observer.disconnect();
  }
});

it("keeps the summary and fields within a narrow light/dark RTL composition", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const root = document.createElement("div"); root.dir = "rtl";
    root.style.width = "343px"; root.style.fontFamily = "var(--ui-font-family-sans)";
    root.innerHTML = source; document.body.append(root);
    await vi.waitFor(() => expect(root.querySelector("input#summary-email")).not.toBeNull());
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ element: root, path: `../../../.context/validation-summary-${theme}-mobile.png` });
    root.remove();
  }
});
