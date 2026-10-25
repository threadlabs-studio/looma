import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, ref, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Pagination from "../vue/UiPagination.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";
import "../vue/components.css";

let app: App;
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; });

it("reports pointer and keyboard requests without changing controlled state or focus", async () => {
  const events: CustomEvent[] = [];
  const current = ref(2);
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h(Pagination, { page: current.value, hasPrevious: true, hasNext: true, pages: [{ value: 1 }, { value: 2 }, { value: 3 }], onNavigate: (event: CustomEvent) => events.push(event) }) });
  app.mount(host);
  const next = host.querySelector<HTMLButtonElement>('[data-pagination-page="3"]:last-child') ?? [...host.querySelectorAll<HTMLButtonElement>("button")].at(-1)!;
  await vi.waitFor(() => expect(host.querySelector('[aria-current="page"]')).not.toBeNull());
  await userEvent.click(next);
  await vi.waitFor(() => expect(events).toHaveLength(1));
  expect(events[0]!.detail).toEqual({ page: 3, previousPage: 2, trigger: "pointer" });
  expect(host.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("2");
  expect(document.activeElement).toBe(next);
  await userEvent.keyboard("{Enter}");
  expect(events.at(-1)!.detail.trigger).toBe("keyboard");
  current.value = 3; await nextTick();
  expect(host.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("3");
  expect(document.activeElement).toBe(next);
  const before = events.length;
  await userEvent.click(host.querySelector<HTMLButtonElement>('[aria-current="page"]')!);
  expect(events).toHaveLength(before);
});

it("blocks unavailable directions and disabled controls, and ignores modified link activation", async () => {
  const events: CustomEvent[] = [];
  const disabled = ref(false);
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h(Pagination, { page: 1, hasPrevious: true, hasNext: false, disabled: disabled.value, pages: [{ value: 1 }, { value: 2, href: "#second" }], onNavigate: (event: CustomEvent) => events.push(event) }) });
  app.mount(host);
  await vi.waitFor(() => expect(host.querySelector("a")).not.toBeNull());
  const buttons = [...host.querySelectorAll<HTMLButtonElement>("button")];
  expect(buttons[0]!.disabled).toBe(true);
  expect(buttons.at(-1)!.disabled).toBe(true);
  const link = host.querySelector<HTMLAnchorElement>("a")!;
  // Stop browser navigation after the component has seen the click, keeping the test runner in one tab.
  host.addEventListener("click", event => { expect(event.defaultPrevented).toBe(false); event.preventDefault(); });
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true, cancelable: true }));
  expect(events).toHaveLength(0);
  disabled.value = true; await nextTick();
  expect(link.hasAttribute("href")).toBe(false);
  link.click(); expect(events).toHaveLength(0);
});

it("keeps every compact control reachable in a narrow container in light and dark modes", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const host = document.createElement("div"); host.style.width = "343px"; host.style.fontFamily = "var(--ui-font-family-sans)"; document.body.append(host);
    app = createApp({ render: () => h(Pagination, { page: 3, hasPrevious: true, hasNext: true, pages: [1, 2, 3, 4, 10].map(value => ({ value })) }) });
    app.mount(host); await nextTick();
    const edge = host.getBoundingClientRect();
    for (const button of host.querySelectorAll("button")) {
      const bounds = button.getBoundingClientRect();
      expect(bounds.left).toBeGreaterThanOrEqual(edge.left);
      expect(bounds.right).toBeLessThanOrEqual(edge.right + 1);
      expect(bounds.height).toBeGreaterThan(20);
      expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
    }
    await page.screenshot({ element: host, path: `../../../.context/pagination-${theme}-mobile.png` });
    app.unmount(); host.remove();
  }
});


it("lets long page numbers grow beyond the square minimum without clipping", async () => {
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h(Pagination, { page: 99999999, pages: [{ value: 99999999 }] }) });
  app.mount(host); await nextTick();
  const button = host.querySelector<HTMLButtonElement>('[aria-current="page"]')!;
  const bounds = button.getBoundingClientRect();
  expect(bounds.width).toBeGreaterThan(bounds.height);
  expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
});
