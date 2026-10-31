import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiCalendar as Calendar } from "@threadlabs/looma";
import { UiGrid as Grid } from "@threadlabs/looma";
import { componentRegistry, getComponentHost } from "@nextwebwg/html-next/runtime";
import { componentInputs } from "@nextwebwg/html-next/inputs";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";
import "../tooling/docs/documentation.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });

async function mount(adapter: "html" | "vue", initial: Record<string, unknown> = {}) {
  const props = reactive({ value: "2024-02-29", locale: "en-GB", ...initial });
  const form = document.createElement("form"); document.body.append(form);
  if (adapter === "vue") { app = createApp({ render: () => h(Calendar, { ...props }) }); app.mount(form); }
  else {
    const invocation = document.createElement("ui-calendar");
    for (const [key, value] of Object.entries(props)) invocation.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "object" ? JSON.stringify(value) : String(value));
    form.append(invocation);
  }
  await vi.waitFor(() => expect(form.querySelectorAll("[data-calendar-day]")).toHaveLength(42));
  const root = form.firstElementChild!;
  const events: { type: string; detail: any }[] = [];
  for (const type of ["input", "change", "select", "month-change"]) form.addEventListener(type, event => { if (event instanceof CustomEvent) events.push({ type, detail: event.detail }); });
  const day = (value: string) => form.querySelector<HTMLButtonElement>(`[data-calendar-day="${value}"]`)!;
  const action = (name: string) => form.querySelector<HTMLButtonElement>(`[data-calendar-${name}]`)!;
  const visible = (name: string) => !form.querySelector<HTMLElement>(`[data-calendar-${name}]`)!.hidden;
  const update = async (values: Record<string, unknown>) => { if (adapter === "vue") Object.assign(props, values); else componentRegistry.update(root, values); await nextTick(); };
  return { form, root, day, action, events, update, visible };
}

it("retains focused date cells during availability loading without accepting a stale choice", async () => {
  const { root, day, events } = await mount("html");
  const target = day("2024-02-20"); target.focus();
  const source = componentInputs(getComponentHost(root)!).source("allowedDates");
  try {
    source.publish({ status: { ready: false, pending: true, stale: false, error: null } });
    target.click();
    expect(events.filter(event => event.type === "select")).toHaveLength(0);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(target.isConnected).toBe(true); expect(document.activeElement).toBe(target);
    source.publish({ value: ["2024-02-20"], status: { ready: true, pending: false, stale: false, error: null } });
    await vi.waitFor(() => expect(day("2024-02-20").disabled).toBe(false));
    await new Promise(resolve => setTimeout(resolve, 20));
    day("2024-02-20").click();
    expect(events.filter(event => event.type === "select")).toHaveLength(1);
  } finally { source.dispose(); }
});

for (const adapter of ["html", "vue"] as const) {
  it(`keeps keyboard navigation separate from selection and exposes a single day tab stop in ${adapter}`, async () => {
    const { form, day, events } = await mount(adapter);
    expect(form.querySelectorAll('[data-calendar-day][tabindex="0"]')).toHaveLength(1);
    expect([...form.querySelectorAll('[role="columnheader"]')].map(header => header.textContent?.trim())).toEqual(["M", "T", "W", "Th", "F", "S", "Su"]);
    expect(day("2024-02-29").closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true");
    day("2024-02-29").focus(); await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2024-03-01"));
    expect(events.filter(event => event.type === "change")).toHaveLength(0);
    await userEvent.keyboard("{Enter}");
    expect(events.filter(event => event.type === "change")).toEqual([{ type: "change", detail: { value: "2024-03-01", trigger: "keyboard" } }]);
    await userEvent.keyboard("{Enter}");
    expect(events.filter(event => event.type === "change")).toHaveLength(1);
    expect(events.filter(event => event.type === "select")).toHaveLength(2);
    await userEvent.keyboard("{PageDown}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2024-04-01"));
    await userEvent.keyboard("{Shift>}{PageUp}{/Shift}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2023-04-01"));
    expect(events.filter(event => event.type === "change")).toHaveLength(1);
  });

  it(`jumps through month/year grids and direct year entry without submitting or changing selection in ${adapter}`, async () => {
    const { form, action, visible, events, day } = await mount(adapter);
    let submissions = 0; form.addEventListener("submit", event => { event.preventDefault(); submissions++; });
    const bounds = () => ({ height: form.firstElementChild!.getBoundingClientRect().height, top: action("previous").getBoundingClientRect().top });
    const original = bounds();
    await userEvent.click(action("month-toggle"));
    await vi.waitFor(() => expect(visible("months")).toBe(true));
    expect(bounds().height).toBeCloseTo(original.height, 0);
    expect(bounds().top).toBeCloseTo(original.top, 0);
    expect(document.activeElement?.getAttribute("data-calendar-month")).toBe("2024-02");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await vi.waitFor(() => expect(day("2024-05-01")).not.toBeNull());
    expect(visible("days")).toBe(true);
    await userEvent.click(action("year-toggle"));
    await vi.waitFor(() => expect(visible("years")).toBe(true));
    expect(bounds().height).toBeCloseTo(original.height, 0);
    expect(bounds().top).toBeCloseTo(original.top, 0);
    const input = form.querySelector<HTMLInputElement>("[data-calendar-year-input]")!;
    await userEvent.fill(input, "10000"); await userEvent.keyboard("{Enter}");
    expect(visible("years")).toBe(true); await vi.waitFor(() => expect(input.getAttribute("aria-invalid")).toBe("true"));
    expect(form.checkValidity()).toBe(true);
    await userEvent.fill(input, "2040"); await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(visible("months")).toBe(true));
    await userEvent.click(form.querySelector<HTMLButtonElement>('[data-calendar-month="2040-02"]')!);
    await vi.waitFor(() => expect(day("2040-02-29")).not.toBeNull());
    expect(events.filter(event => event.type === "change")).toHaveLength(0); expect(submissions).toBe(0);
    await userEvent.click(action("year-toggle")); await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(visible("days")).toBe(true));
    await vi.waitFor(() => expect(document.activeElement?.matches("[data-calendar-day]")).toBe(true));
  });

  it(`skips disabled dates, reflects changed rules and retains an unavailable selection in ${adapter}`, async () => {
    const { form, day, events, update, action } = await mount(adapter, { value: "2026-10-09", min: "2026-10-05", max: "2026-11-20", disabledWeekdays: [6, 7], disabledDates: ["2026-10-12"] });
    expect(day("2026-10-10").disabled).toBe(true);
    expect(getComputedStyle(day("2026-10-10")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    day("2026-10-09").focus(); await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2026-10-13"));
    await userEvent.keyboard("{Home}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2026-10-13"));
    await update({ disabledDates: ["2026-10-09", "2026-10-12"] });
    await vi.waitFor(() => expect(day("2026-10-09").disabled).toBe(true));
    expect(day("2026-10-09").closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true");
    expect(getComputedStyle(day("2026-10-09")).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await update({ allowedDates: [] });
    await vi.waitFor(() => expect(form.querySelectorAll('[data-calendar-day][tabindex="0"]')).toHaveLength(0));
    expect([...form.querySelectorAll<HTMLButtonElement>("[data-calendar-day]")].every(button => button.disabled)).toBe(true);
    const viewport = form.querySelector<HTMLElement>("[data-calendar-viewport]")!;
    const message = [...viewport.children].find(element => element.textContent?.trim() === "No available dates this month.")!;
    await vi.waitFor(() => expect(message.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1));
    await userEvent.click(action("month-toggle"));
    await vi.waitFor(() => expect([...form.querySelectorAll<HTMLButtonElement>("[data-calendar-month]")].every(button => button.disabled)).toBe(true));
    await update({ allowedDates: undefined });
    await userEvent.click(action("month-toggle"));
    await vi.waitFor(() => expect(day("2026-10-13").disabled).toBe(false));
    expect(events.filter(event => event.type === "change")).toHaveLength(0);
  });

  it(`honors external selection, readonly, disabled and explicit focus requests in ${adapter}`, async () => {
    const { root, day, events, update, action } = await mount(adapter);
    await update({ value: "2024-02-12", readonly: true });
    await vi.waitFor(() => expect(day("2024-02-12").closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true"));
    day("2024-02-12").click(); expect(events.filter(event => event.type === "select")).toHaveLength(0);
    expect(root.dispatchEvent(new CustomEvent("focus-date", { cancelable: true, detail: { value: "2025-06-10" } }))).toBe(true);
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2025-06-10"));
    expect(root.dispatchEvent(new CustomEvent("focus-date", { cancelable: true, detail: { value: "invalid" } }))).toBe(false);
    await update({ disabled: true });
    await vi.waitFor(() => expect(action("next").disabled).toBe(true));
    expect(day("2025-06-10").disabled).toBe(true);
    expect(root.dispatchEvent(new CustomEvent("focus-date", { cancelable: true, detail: { value: "2025-07-10" } }))).toBe(false);
  });

  it(`uses locale week order and switches to explicit Sunday, Saturday or Monday without changing selection in ${adapter}`, async () => {
    const { form, events, update } = await mount(adapter);
    const labels = () => [...form.querySelectorAll('[role="columnheader"]')].map(header => header.textContent?.trim());
    await update({ weekStartsOn: 7 });
    await vi.waitFor(() => expect(labels()).toEqual(["Su", "M", "T", "W", "Th", "F", "S"]));
    await update({ weekStartsOn: 6 });
    await vi.waitFor(() => expect(labels()).toEqual(["S", "Su", "M", "T", "W", "Th", "F"]));
    await update({ weekStartsOn: 1 });
    await vi.waitFor(() => expect(labels()).toEqual(["M", "T", "W", "Th", "F", "S", "Su"]));
    expect(events.filter(event => event.type === "change")).toHaveLength(0);
    await update({ weekStartsOn: undefined, locale: "ar-EG" });
    await vi.waitFor(() => expect(form.querySelector('[role="columnheader"]')!.getAttribute("aria-label")).toBe(new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(new Date("2026-10-31T12:00Z"))));
  });

  it(`keeps month and year paging within the four-digit civil date domain in ${adapter}`, async () => {
    const { form, day, action } = await mount(adapter, { value: "0001-01-01" });
    expect(action("previous").disabled).toBe(true);
    await userEvent.click(action("year-toggle"));
    const input = form.querySelector<HTMLInputElement>("[data-calendar-year-input]")!;
    await userEvent.fill(input, "9999"); await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(form.querySelector('[data-calendar-month="9999-12"]')).not.toBeNull());
    await userEvent.click(form.querySelector<HTMLButtonElement>('[data-calendar-month="9999-12"]')!);
    await vi.waitFor(() => expect(day("9999-12-31")).not.toBeNull());
    expect(action("next").disabled).toBe(true);
    await userEvent.click(action("year-toggle"));
    await vi.waitFor(() => expect(form.querySelectorAll("[data-calendar-year]")).toHaveLength(3));
    expect(action("next").disabled).toBe(true);
    await userEvent.click(action("previous"));
    await vi.waitFor(() => expect(form.querySelectorAll("[data-calendar-year]")).toHaveLength(12));
    await userEvent.click(action("next"));
    await vi.waitFor(() => expect(form.querySelectorAll("[data-calendar-year]")).toHaveLength(3));
  });
}

it("keeps seven aligned weekday columns and shared themed controls at 375px in LTR and RTL", async () => {
  await page.viewport(375, 640);
  for (const adapter of ["html", "vue"] as const) for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const { form, day, action } = await mount(adapter, { value: "2024-02-12", start: "2024-02-12", end: "2024-02-17", locale: theme === "dark" ? "ar-EG" : "en-GB" });
    form.style.width = "343px"; form.style.fontFamily = "var(--ui-font-family-sans)";
    form.style.background = "var(--ui-surface)"; form.style.color = "var(--ui-text-primary)";
    form.dir = theme === "dark" ? "rtl" : "ltr";
    expect(form.querySelectorAll('[data-calendar-days] [aria-selected="true"]')).toHaveLength(6);
    const band = form.querySelector<HTMLElement>(".selection-band")!;
    expect(band.getBoundingClientRect().width).toBeGreaterThan(day("2024-02-14").closest('[role="gridcell"]')!.getBoundingClientRect().width * (band.parentElement!.querySelectorAll('[role="gridcell"][aria-selected="true"]').length - 1));
    expect(getComputedStyle(day("2024-02-14")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(day("2024-01-31").querySelector(".label")!.firstElementChild!).color).not.toBe(getComputedStyle(day("2024-02-01").querySelector(".label")!.firstElementChild!).color);
    const rows = [...form.querySelectorAll<HTMLElement>('[data-calendar-days] [role="row"]')];
    expect(getComputedStyle(rows[0]!.querySelector('.column-shade')!).backgroundColor).not.toBe(getComputedStyle(rows[1]!.querySelector('.column-shade')!).backgroundColor);
    for (const row of rows) expect(getComputedStyle(row).gridTemplateColumns.split(" ")).toHaveLength(7);
    for (const row of rows) {
      const shades = [...row.querySelectorAll<HTMLElement>(":scope > .column-shade")];
      expect(shades).toHaveLength(row === rows[0] ? 7 : 2);
      for (const shade of shades) {
        expect(getComputedStyle(shade).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        const bounds = shade.getBoundingClientRect();
        expect(Math.abs(bounds.width - row.clientWidth / 7)).toBeLessThan(1);
        expect(Math.abs(bounds.height - row.clientHeight)).toBeLessThan(1);
        const index = Number(getComputedStyle(shade).gridColumnStart) - 1;
        const cells = [...row.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]')];
        expect(Math.abs(bounds.left - cells[index]!.getBoundingClientRect().left)).toBeLessThan(1);
      }
    }
    expect(form.querySelector<HTMLElement>("[data-calendar-years]")!.hidden).toBe(true);
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth + 1);
    for (const value of ["2024-02-12", "2024-02-20"]) {
      const bounds = day(value).getBoundingClientRect();
      expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
      expect(parseFloat(getComputedStyle(day(value)).borderRadius)).toBeGreaterThanOrEqual(bounds.height / 2);
    }
    expect(getComputedStyle(day("2024-02-20")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(day("2024-02-12")).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await userEvent.hover(day("2024-02-20"));
    await vi.waitFor(() => expect(getComputedStyle(day("2024-02-20")).backgroundColor).not.toBe("rgba(0, 0, 0, 0)"));
    await userEvent.hover(action("month-toggle"));
    await vi.waitFor(() => expect(getComputedStyle(day("2024-02-20")).backgroundColor).toBe("rgba(0, 0, 0, 0)"));
    expect(getComputedStyle(action("previous").querySelector("svg")!).transform).toBe(theme === "dark" ? "matrix(-1, 0, 0, 1, 0, 0)" : "none");
    day("2024-02-29").focus(); await userEvent.keyboard(theme === "dark" ? "{ArrowLeft}" : "{ArrowRight}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2024-03-01"));
    await userEvent.click(action("previous"));
    await vi.waitFor(() => expect(day("2024-02-12")).not.toBeNull());
    await page.screenshot({ element: form, path: `../../../.context/calendar-${adapter}-${theme}-mobile.png` });
    const paint = (element: Element) => { const style = getComputedStyle(element); return { background: style.backgroundColor, color: style.color }; };
    const token = document.createElement("span"); token.style.backgroundColor = "var(--ui-selection-surface)"; token.style.color = "var(--ui-selection-text)"; form.append(token);
    const selection = paint(token); token.remove();
    expect(paint(day("2024-02-12"))).toEqual(selection);
    await userEvent.click(action("month-toggle"));
    await vi.waitFor(() => expect(paint(action("month-toggle"))).toEqual(selection));
    expect(paint(form.querySelector('[data-calendar-month="2024-02"]')!)).toEqual(selection);
    await userEvent.click(action("year-toggle"));
    await vi.waitFor(() => expect(paint(action("year-toggle"))).toEqual(selection));
    expect(paint(form.querySelector('[data-calendar-year="2024"]')!)).toEqual(selection);
    await userEvent.keyboard("{Escape}");
    if (theme === "dark") {
      await userEvent.click(action("year-toggle"));
      await userEvent.fill(form.querySelector<HTMLInputElement>("[data-calendar-year-input]")!, "٢٠٤٠");
      await userEvent.keyboard("{Enter}");
      await vi.waitFor(() => expect(form.querySelector('[data-calendar-month="2040-02"]')).not.toBeNull());
    }
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});

it("keeps full month and year labels between the arrows at a mobile preview width", async () => {
  await page.viewport(375, 640);
  for (const adapter of ["html", "vue"] as const) for (const locale of ["en-GB", "de-DE", "ar-EG"]) {
    const { form, action } = await mount(adapter, { value: "2026-09-15", locale });
    form.style.width = "305px"; form.style.fontSize = "17px"; form.style.fontFamily = "var(--ui-font-family-sans)";
    form.dir = locale === "ar-EG" ? "rtl" : "ltr";
    const buttons = ["previous", "month-toggle", "year-toggle", "next"].map(action);
    const bounds = buttons.map(button => button.getBoundingClientRect());
    const centers = bounds.map(rect => rect.top + rect.height / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(1);
    expect(form.dir === "rtl" ? bounds[0]!.left > bounds[3]!.left : bounds[0]!.left < bounds[3]!.left).toBe(true);
    const host = form.getBoundingClientRect();
    for (const rect of bounds) { expect(rect.left).toBeGreaterThanOrEqual(host.left - 1); expect(rect.right).toBeLessThanOrEqual(host.right + 1); }
    const ordered = bounds.toSorted((a, b) => a.left - b.left);
    for (let index = 1; index < ordered.length; index++) expect(ordered[index]!.left).toBeGreaterThanOrEqual(ordered[index - 1]!.right - 1);
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth + 1);
    expect(action("month-toggle").getAttribute("aria-label")).toContain(new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date("2026-09-15T12:00Z")));
    const fullMonth = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date("2026-09-15T12:00Z"));
    const text = document.createTreeWalker(action("month-toggle"), NodeFilter.SHOW_TEXT);
    while (text.nextNode() && text.currentNode.textContent?.trim() !== fullMonth) {}
    expect(text.currentNode.textContent?.trim()).toBe(fullMonth);
    const range = document.createRange(); range.selectNodeContents(text.currentNode);
    const ink = range.getBoundingClientRect(), monthButton = action("month-toggle").getBoundingClientRect();
    expect(ink.left, `${adapter}/${locale}: the month starts inside its control`).toBeGreaterThanOrEqual(monthButton.left - 1);
    expect(ink.right, `${adapter}/${locale}: the full month heading remains visible`).toBeLessThanOrEqual(monthButton.right + 1);
    await userEvent.click(action("month-toggle"));
    expect(form.querySelectorAll("[data-calendar-month]")).toHaveLength(12);
    const september = form.querySelector<HTMLButtonElement>('[data-calendar-month="2026-09"]')!;
    expect(september.textContent?.trim()).toBe(new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date("2026-09-15T12:00Z")));
    expect(september.getAttribute("aria-label")).toBe(new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date("2026-09-15T12:00Z")));
    const choices = [...form.querySelectorAll<HTMLButtonElement>("[data-calendar-month]")];
    for (const button of choices) expect(button.getBoundingClientRect().height).toBeCloseTo(action("month-toggle").getBoundingClientRect().height, 0);
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth + 1);
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});

it("keeps all seven calendar columns inside a padded docs preview in both themes and directions", async () => {
  await page.viewport(375, 640);
  for (const adapter of ["html", "vue"] as const) for (const theme of ["light", "dark"]) for (const dir of ["ltr", "rtl"]) {
    document.documentElement.dataset.theme = theme;
    const { form } = await mount(adapter, { value: "2026-10-30", locale: "en-GB" });
    form.dataset.preview = "calendar"; form.dataset.previewLayout = ""; form.dir = dir;
    form.style.width = "339px"; form.style.fontSize = "17px";
    const host = form.getBoundingClientRect(), style = getComputedStyle(form);
    const left = host.left + parseFloat(style.paddingLeft), right = host.right - parseFloat(style.paddingRight);
    const headers = [...form.querySelectorAll<HTMLElement>('[role="columnheader"]')];
    expect(headers).toHaveLength(7);
    const dates = form.querySelector('[data-calendar-days]')!;
    expect(dates.querySelectorAll('[role="gridcell"]')).toHaveLength(42);
    for (const element of [...headers, ...dates.querySelectorAll<HTMLElement>('[role="gridcell"], [data-calendar-day]')]) {
      const rect = element.getBoundingClientRect();
      expect(rect.left, `${adapter}/${theme}/${dir}: ${element.textContent?.trim()} starts inside the preview`).toBeGreaterThanOrEqual(left - 1);
      expect(rect.right, `${adapter}/${theme}/${dir}: ${element.textContent?.trim()} ends inside the preview`).toBeLessThanOrEqual(right + 1);
    }
    const firstDay = dates.querySelector<HTMLElement>('[data-calendar-day]')!;
    const dayBox = firstDay.getBoundingClientRect(), cellBox = firstDay.closest('[role="gridcell"]')!.getBoundingClientRect();
    expect(cellBox.width).toBeGreaterThan(dayBox.width + 1);
    expect(cellBox.height).toBeGreaterThan(dayBox.height + 1);
    expect(cellBox.height, "date rows should not be taller than their mobile columns").toBeLessThanOrEqual(cellBox.width + 1);
    const headerBox = headers[0]!.getBoundingClientRect();
    expect(headerBox.height, "the weekday band should retain comfortable label spacing").toBeGreaterThanOrEqual(cellBox.height - parseFloat(getComputedStyle(form).fontSize) / 2);
    expect(headerBox.height, "the weekday band should stay slightly shorter than date rows").toBeLessThan(cellBox.height);
    for (const header of headers) {
      const range = document.createRange(); range.selectNodeContents(header);
      const ink = range.getBoundingClientRect(), cell = header.getBoundingClientRect();
      expect(ink.left).toBeGreaterThanOrEqual(cell.left - 1);
      expect(ink.right).toBeLessThanOrEqual(cell.right + 1);
    }
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});

it("keeps Grid responsive by default and uses exact columns only when requested", async () => {
  const host = document.createElement("div"); host.style.width = "343px"; document.body.append(host);
  app = createApp({ render: () => h("div", [h(Grid, { columns: 7 }, () => Array.from({ length: 7 }, () => h("span", "Cell"))), h(Grid, { columns: 7, fixed: true, gap: "none" }, () => Array.from({ length: 7 }, () => h("span", "Cell"))), h(Grid, { columns: 7, fixed: true, gap: "none", shadedColumns: [1, 7] }, () => Array.from({ length: 7 }, () => h("span", "Cell")))]) }); app.mount(host);
  // The authored roots are the two direct Grid children, independent of generated scope markers.
  const children = [...host.firstElementChild!.children] as HTMLElement[];
  expect(getComputedStyle(children[0]!).gridTemplateColumns.split(" ")).toHaveLength(1);
  expect(getComputedStyle(children[1]!).gridTemplateColumns.split(" ")).toHaveLength(7);
  expect(children[0]!.querySelector(".column-shade")).toBeNull();
  const shades = children[2]!.querySelectorAll<HTMLElement>(".column-shade");
  expect(shades).toHaveLength(2);
  children[2]!.style.position = "static";
  children[2]!.style.setProperty("--ui-grid-shade-surface", "rgb(1 2 3 / 0.04)");
  expect(getComputedStyle(children[2]!).position).toBe("relative");
  expect(getComputedStyle(shades[0]!).backgroundColor).toBe("rgba(1, 2, 3, 0.04)");
  expect(getComputedStyle(children[1]!).gap).toBe("0px");
  children[1]!.style.gridTemplateColumns = "1fr";
  expect(getComputedStyle(children[1]!).gridTemplateColumns.split(" ")).toHaveLength(7);
});
