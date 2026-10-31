import { page, userEvent } from "@vitest/browser/context";
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

it("keeps the summary and fields within a narrow light/dark RTL composition", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const root = document.createElement("div"); root.dir = "rtl";
    root.style.width = "343px"; root.style.fontFamily = "var(--ui-font-family-sans)";
    root.innerHTML = source; document.body.append(root);
    await vi.waitFor(() => expect(root.querySelector("input#summary-email")).not.toBeNull());
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    await page.screenshot({ element: root, path: `../../../.context/validation-summary-${theme}-mobile.png` });
    root.remove();
  }
});
