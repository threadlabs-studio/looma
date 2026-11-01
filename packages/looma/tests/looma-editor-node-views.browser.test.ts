import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef, type App } from "vue";
import { UiEditor } from "../src/components/ui-editor/ui-editor.html";
import { editorUnderTest } from "./editor-test-target";
const LoomaEditor = await editorUnderTest(UiEditor);
import { captureEditor } from "./editor-test-extensions";
import "../tokens.css";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  await flushBrowser();
  document.body.innerHTML = "";
});

async function mountEditor(html: string) {
  const host = document.body.appendChild(document.createElement("div"));
  let editor: Editor | null = null;
  const app = createApp({ render: () => h(LoomaEditor, { extensions: captureEditor(instance => { editor = instance; }) }) });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  await expect.poll(() => editor, { timeout: 5_000 }).toBeTruthy();
  editor!.commands.setContent(html);
  await flushBrowser();
  return { host, editor: editor! };
}

const state = (element: Element) => element.getAttribute("data-ui-separator-state") ?? "";

describe("LoomaEditor node views", () => {
  it("refreshes cached reference display without an authored update and keeps link editing available", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const references = shallowRef({ "link:guide": { label: "Cached guide" }, "mention:person": { label: "Cached person" } });
    const updates = vi.fn(); let editor: Editor | null = null;
    const app = createApp({ render: () => h(LoomaEditor, {
      content: { type: "doc", content: [{ type: "paragraph", content: [
        { type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Saved guide", target: "_self" } },
        { type: "text", text: " " },
        { type: "mention", attrs: { id: "person", label: "Saved person" } },
        { type: "text", text: " My wording", marks: [{ type: "link", attrs: { href: "/guide" } }] },
      ] }] },
      references: references.value, onChange: updates, extensions: captureEditor(instance => { editor = instance; }),
    }) }); apps.push(app); app.mount(host); await flushBrowser(); await expect.poll(() => editor).toBeTruthy();
    const saved = editor!.getJSON();
    expect(host.querySelector(".ProseMirror")!.textContent).toBe("Cached guide @Cached person My wording");
    references.value = { "link:guide": { label: "Renamed guide" }, "mention:person": { label: "New name" } };
    await flushBrowser();
    expect(editor!.storage.loomaReferencePresentation.references).toEqual(references.value);
    expect(host.querySelector(".ProseMirror")!.textContent).toBe("Renamed guide @New name My wording");
    expect(editor!.getJSON()).toEqual(saved); expect(updates).not.toHaveBeenCalled();
    await userEvent.click(host.querySelector<HTMLAnchorElement>("a[data-looma-reference]")!);
    await vi.waitFor(() => expect(editor!.state.selection).toBeInstanceOf(NodeSelection));
    expect(host.querySelector("a[data-looma-reference]")!.getAttribute("href")).toBe("/guide");
    editor!.commands.deleteSelection(); await flushBrowser();
    expect(updates).toHaveBeenCalledTimes(1);
  });
  it("draws a divider with Separator, selects it on click, and disconnects it once the node is removed", async () => {
    const { host, editor } = await mountEditor("<p>Before</p><hr><p>After</p>");
    const divider = host.querySelector<HTMLElement>('.ProseMirror [data-component~="ui-separator"]')!;
    expect(divider.tagName).toBe("HR");
    expect(state(divider).split(" ")).toContain("selectable");
    expect(divider.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await userEvent.click(divider);
    await vi.waitFor(() => expect(state(divider).split(" ")).toContain("selected"));
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);

    // While connected, a prop update renders at once; once ProseMirror removes the node, it waits.
    componentRegistry.update(divider, { emphasis: "strong" });
    await vi.waitFor(() => expect(state(divider).split(" ")).toContain("emphasis=strong"));
    editor.commands.deleteSelection();
    await flushBrowser();
    expect(divider.isConnected).toBe(false);
    const before = state(divider);
    componentRegistry.update(divider, { emphasis: "normal", selectable: false });
    await flushBrowser();
    expect(state(divider)).toBe(before);
  });

  it("leaves a read-only divider unselectable", async () => {
    const { host, editor } = await mountEditor("<p>Before</p><hr><p>After</p>");
    editor.setEditable(false);
    await flushBrowser();
    const divider = host.querySelector<HTMLElement>('.ProseMirror [data-component~="ui-separator"]')!;
    await vi.waitFor(() => expect(state(divider).split(" ")).not.toContain("selectable"));
  });

  it("draws a callout with Callout, follows tone and heading changes, and disconnects it once the node is removed", async () => {
    const { host, editor } = await mountEditor('<ui-callout tone="tip" heading="Before"><p>Body</p></ui-callout><p>After</p>');
    const callout = host.querySelector<HTMLElement>('.ProseMirror [data-looma-callout] [data-component~="ui-callout"]')!;
    expect(callout.querySelector("[data-looma-callout-body] p")?.textContent).toBe("Body");
    expect(callout.getAttribute("data-ui-callout-prop-tone")).toBe("tip");
    expect(callout.querySelector(".heading")?.textContent).toBe("Before");
    editor.chain().setTextSelection(2).updateAttributes("loomaCallout", { tone: "warning", heading: "" }).run();
    await vi.waitFor(() => expect(callout.getAttribute("data-ui-callout-prop-tone")).toBe("warning"));
    expect(callout.querySelector(".heading")?.textContent ?? "").toBe("");
    editor.commands.setContent("<p>Gone</p>");
    await flushBrowser();
    expect(callout.isConnected).toBe(false);
    // The prop record is written at once; rendering the heading waits for a connection that never comes.
    componentRegistry.update(callout, { heading: "Late" });
    await flushBrowser();
    expect(callout.querySelector(".heading")?.textContent ?? "").toBe("");
  });

  it("composes a section from Disclosure and its settings, hides the settings from readers, and disconnects them once removed", async () => {
    const { host, editor } = await mountEditor('<details data-looma-expand data-summary="Details"><div data-looma-expand-body><p>Body</p></div></details><p>After</p>');
    const section = host.querySelector<HTMLElement>(".ProseMirror [data-looma-expand]")!;
    const disclosure = section.querySelector<HTMLElement>('[data-component~="ui-disclosure"]')!;
    const settings = section.querySelector<HTMLElement>('[data-component~="ui-icon-button"]')!;
    expect(disclosure.querySelector("[data-looma-expand-body] p")?.textContent).toBe("Body");
    expect(disclosure.textContent).toContain("Details");
    expect(settings.closest<HTMLElement>("[hidden]")).toBeNull();
    editor.setEditable(false);
    await flushBrowser();
    expect(settings.closest<HTMLElement>("[hidden]")).not.toBeNull();
    editor.setEditable(true);
    editor.commands.setContent("<p>Gone</p>");
    await flushBrowser();
    expect(disclosure.isConnected).toBe(false);
    const summary = disclosure.textContent;
    componentRegistry.update(disclosure, { summary: "Late" });
    await flushBrowser();
    expect(disclosure.textContent).toBe(summary);
  });

  it("keeps a section's open state its own when a section nested in its body toggles", async () => {
    const nested = '<details data-looma-expand><summary>Inner</summary><div data-looma-expand-body><p>Inner body</p></div></details>';
    const { host, editor } = await mountEditor(`<details data-looma-expand open><summary>Outer</summary><div data-looma-expand-body>${nested}</div></details><p>After</p>`);
    editor.setEditable(false);
    await flushBrowser();
    const [outer, inner] = [...host.querySelectorAll<HTMLElement>('.ProseMirror [data-component~="ui-disclosure"]')];
    expect(outer!.contains(inner!)).toBe(true);
    const outerOpen = () => outer!.getAttribute("data-ui-disclosure-prop-open");
    const before = outerOpen();
    inner!.dispatchEvent(new CustomEvent("close", { bubbles: true, detail: { open: false, reason: "action", trigger: "pointer" } }));
    await flushBrowser();
    expect(outerOpen()).toBe(before);
  });

  it("lists the headings in a table of contents, follows edits, hides settings from readers, and disconnects once removed", async () => {
    const { host, editor } = await mountEditor('<nav data-looma-toc data-authored-body><h1>Navigation label</h1></nav><nav data-looma-toc></nav><h1>Overview</h1><h2>Details</h2>');
    const navs = host.querySelectorAll<HTMLElement>(".ProseMirror nav[data-looma-toc]");
    expect(navs[0]?.textContent).toContain("Navigation label");
    const nav = navs[1]!;
    const links = () => [...nav.querySelectorAll("a")].map((link) => link.textContent?.trim());
    expect(links()).toEqual(["Overview", "Details"]);
    editor.commands.insertContentAt(editor.state.doc.content.size, "<h2>Later</h2>");
    await vi.waitFor(() => expect(links()).toEqual(["Overview", "Details", "Later"]));
    const settings = nav.querySelector<HTMLElement>('[data-component~="ui-icon-button"]')!;
    expect(settings.hidden).toBe(false);
    // The author tool belongs outside the guide line, not in the title row.
    expect(settings.getBoundingClientRect().right).toBeLessThan(nav.getBoundingClientRect().left - 12);
    const icon = settings.querySelector<HTMLElement>('.content')!;
    await vi.waitFor(() => expect(getComputedStyle(icon).opacity).toBe("0"));
    expect(Number(getComputedStyle(settings, "::before").opacity)).toBeGreaterThan(0);
    await userEvent.hover(settings);
    await vi.waitFor(() => expect(getComputedStyle(icon).opacity).toBe("1"));
    // Move outside both the trigger and its viewport-clamped hover tooltip.
    await userEvent.hover(host.querySelector<HTMLElement>('h2')!);
    await userEvent.click(nav.querySelector<HTMLElement>('strong')!);
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    await userEvent.hover(host.querySelector<HTMLElement>('h2')!);
    await vi.waitFor(() => expect(getComputedStyle(icon).opacity).toBe("1"));
    await vi.waitFor(() => expect(Math.abs(settings.querySelector("svg")!.getBoundingClientRect().width - 16)).toBeLessThan(0.05));
    const glyph = settings.querySelector("svg")!.getBoundingClientRect();
    const control = settings.getBoundingClientRect();
    const title = nav.querySelector("strong")!.getBoundingClientRect();
    expect(Math.abs(glyph.height - 16)).toBeLessThan(0.05);
    expect(Math.abs(glyph.x + glyph.width / 2 - control.x - control.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(glyph.y + glyph.height / 2 - control.y - control.height / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(control.y + control.height / 2 - title.y - title.height / 2)).toBeLessThanOrEqual(1);
    const saved = editor.getJSON();
    settings.focus();
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(settings.getAttribute("aria-expanded")).toBe("true"));
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(settings.getAttribute("aria-expanded")).toBe("false"));
    expect(editor.getJSON()).toEqual(saved);
    editor.setEditable(false);
    await flushBrowser();
    expect(settings.hidden).toBe(true);
    const list = nav.querySelector<HTMLElement>('[data-component~="ui-list"]')!;
    editor.setEditable(true);
    editor.commands.setContent("<p>Gone</p>");
    await flushBrowser();
    expect(list.isConnected).toBe(false);
    const state = list.getAttribute("data-ui-list-state");
    componentRegistry.update(list, { markers: "disc" });
    await flushBrowser();
    expect(list.getAttribute("data-ui-list-state")).toBe(state);
  });

  it("draws an image with Image, selects it on click, commits a resize as the node's size, and disconnects once removed", async () => {
    const { host, editor } = await mountEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Example"><p>After</p>');
    const image = host.querySelector<HTMLElement>('.ProseMirror [data-component~="ui-image"]')!;
    const imageState = () => (image.getAttribute("data-ui-image-state") ?? "").split(" ");
    expect(image.querySelector("img")?.getAttribute("alt")).toBe("Example");
    await userEvent.click(image.querySelector("img")!);
    await vi.waitFor(() => expect(imageState()).toContain("selected"));
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    image.dispatchEvent(new CustomEvent("resize", { bubbles: true, detail: { width: 200, height: 100, phase: "commit", trigger: "pointer" } }));
    await vi.waitFor(() => expect(JSON.stringify(editor.getJSON())).toContain('"width":200'));
    editor.commands.setContent("<p>Gone</p>");
    await flushBrowser();
    expect(image.isConnected).toBe(false);
    const before = image.getAttribute("data-ui-image-state");
    componentRegistry.update(image, { resizable: false, selected: false });
    await flushBrowser();
    expect(image.getAttribute("data-ui-image-state")).toBe(before);
  });
});
