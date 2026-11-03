import { page, userEvent } from "vitest/browser";
import { pendingControllers } from "@nextwebwg/html-next/runtime";
import { createScene, sceneNode, settle, createState, type Scene } from "@looma-test/scene";
import { afterEach, expect, it, vi } from "vitest";
import { UiWizard as Wizard, UiButton as Button } from "@looma-test/components";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: Scene;
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });
const steps = [
  { value: "start", label: "Start", complete: true },
  { value: "details", label: "Details" },
  { value: "review", label: "Review", disabled: true },
  { value: "finish", label: "Finish", disabled: true },
];
async function mount(host: HTMLElement) {
  app.mount(host); await settle(); await Promise.all(pendingControllers(host)); await settle();
}

it("reports native pointer and keyboard intent, preserves focus and waits for controlled reflection", async () => {
  const requests: CustomEvent[] = [];
  const value = createState("details");
  const disabled = createState(false);
  const host = document.createElement("div"); document.body.append(host);
  app = createScene({ render: () => sceneNode(Wizard, { value: value.value, disabled: disabled.value, steps, onNavigate: (event: CustomEvent) => requests.push(event) }, {
    default: () => sceneNode("h2", "Stage content"),
    secondary: () => sceneNode(Button, {}, "Back"),
    primary: () => sceneNode(Button, { preset: "primary" }, "Continue"),
  }) });
  await mount(host);
  const start = host.querySelector<HTMLButtonElement>('[data-wizard-value="start"]')!;
  await userEvent.click(start);
  await vi.waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]!.detail).toEqual({ value: "start", previousValue: "details", trigger: "pointer" });
  expect(host.querySelector('[aria-current="step"]')?.textContent).toContain("Details");
  expect(document.activeElement).toBe(start);
  await userEvent.keyboard("{Enter}");
  expect(requests.at(-1)!.detail.trigger).toBe("keyboard");
  expect(requests).toHaveLength(2);
  await userEvent.keyboard(" ");
  expect(requests.at(-1)!.detail.trigger).toBe("keyboard");
  expect(requests).toHaveLength(3);
  value.value = "start"; await settle();
  expect(host.querySelector('[aria-current="step"]')).toBe(start);
  expect(document.activeElement).toBe(start);
  const before = requests.length;
  await userEvent.click(start);
  host.querySelector<HTMLButtonElement>('[data-wizard-value="review"]')!.click();
  expect(requests).toHaveLength(before);
  disabled.value = true; await settle();
  host.querySelector<HTMLButtonElement>('[data-wizard-value="details"]')!.click();
  expect(requests).toHaveLength(before);
  expect([...host.querySelectorAll<HTMLButtonElement>('nav button')].every(button => button.disabled)).toBe(true);
  const back = page.getByRole("button", { name: "Back", exact: true });
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await userEvent.click(back);
  expect(requests).toHaveLength(before);
  expect((await back.element()).compareDocumentPosition(await next.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("preserves link defaults, ignores modified activation and removes disabled routes", async () => {
  const requests: CustomEvent[] = [];
  const disabled = createState(false);
  const host = document.createElement("div"); document.body.append(host);
  app = createScene({ render: () => sceneNode(Wizard, { value: "details", disabled: disabled.value, steps: steps.map(step => ({ ...step, href: `#${step.value}` })), onNavigate: (event: CustomEvent) => requests.push(event) }) });
  await mount(host);
  const start = host.querySelector<HTMLAnchorElement>('[data-wizard-value="start"]')!;
  const defaults: boolean[] = [];
  host.addEventListener("click", event => { defaults.push(event.defaultPrevented); event.preventDefault(); });
  start.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true, cancelable: true }));
  expect(requests).toHaveLength(0);
  start.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(requests[0]!.detail).toEqual({ value: "start", previousValue: "details", trigger: "programmatic" });
  expect(defaults).toEqual([false, false]);
  disabled.value = true; await settle();
  expect(host.querySelector('nav a[href]')).toBeNull();
  start.click(); expect(requests).toHaveLength(1);
});

it("wraps long stage labels in both directions and inherits palette colors in light and dark modes", async () => {
  for (const theme of ["light", "dark"]) for (const direction of ["ltr", "rtl"]) {
    document.documentElement.dataset.theme = theme;
    const host = document.createElement("div"); host.dir = direction;
    const selectionSurface = theme === "light" ? "#fbf3d0" : "#40371a";
    const selectionText = theme === "light" ? "#594200" : "#f0d783";
    host.style.cssText = `width:343px;font-family:var(--ui-font-family-sans);--ui-accent:#a67c00;--ui-accent-solid:#a67c00;--ui-on-accent:#fff;--ui-selection-surface:${selectionSurface};--ui-selection-text:${selectionText};--ui-selection-border:#b99a34`;
    document.body.append(host);
    app = createScene({ render: () => sceneNode(Wizard, { value: "details", steps: steps.map(step => ({ ...step, label: `${step.label} with a longer stage label` })) }, {
      default: () => sceneNode("p", "Current stage"), secondary: () => sceneNode(Button, {}, "Back"), primary: () => sceneNode(Button, { preset: "primary" }, "Continue"),
    }) });
    await mount(host);
    const edge = host.getBoundingClientRect();
    for (const control of host.querySelectorAll('nav button')) {
      const bounds = control.getBoundingClientRect();
      expect(bounds.left).toBeGreaterThanOrEqual(edge.left - 1);
      expect(bounds.right).toBeLessThanOrEqual(edge.right + 1);
      expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth + 1);
    }
    const marker = host.querySelector<HTMLElement>('[aria-current="step"] .marker')!;
    expect(getComputedStyle(marker).backgroundColor, marker.outerHTML).toBe("rgb(166, 124, 0)");
    const current = host.querySelector<HTMLElement>('[aria-current="step"]')!;
    expect(getComputedStyle(current).backgroundColor).toBe(theme === "light" ? "rgb(251, 243, 208)" : "rgb(64, 55, 26)");
    const positions = [...host.querySelectorAll("nav li")].map(item => item.getBoundingClientRect());
    expect(direction === "rtl" ? positions[0]!.left > positions[1]!.left : positions[0]!.left < positions[1]!.left).toBe(true);
    if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ element: host, path: `../../../.context/wizard-${theme}-${direction}.png` });
    app.unmount(); host.remove();
  }
});
