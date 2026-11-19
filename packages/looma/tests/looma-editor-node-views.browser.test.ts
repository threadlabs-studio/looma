import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { closeHistory } from '@tiptap/pm/history';
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { userEvent, page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createScene, sceneNode, settle, createState, type Scene } from "@looma-test/scene";
import { UiEditor } from "@looma-test/components";
import { editorUnderTest } from "./editor-test-target";
const LoomaEditor = await editorUnderTest(UiEditor);
import { captureEditor } from "./editor-test-extensions";
import { setReferenceDisplay } from '../src/editor/reference-display';
import "../tokens.css";

const apps: Scene[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await settle();
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
  const app = createScene({ render: () => sceneNode(LoomaEditor, { extensions: captureEditor(instance => { editor = instance; }) }) });
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
  it('disables a legacy file link without persisting its deleted label during native writing', async () => {
    const { host, editor } = await mountEditor('<p>Read <a href="/api/files/report.pdf">Report.pdf</a> alongside these notes.</p>');
    const before = editor.getJSON();
    setReferenceDisplay(editor, { 'attachment:/api/files/report.pdf': { label: 'Report.pdf', status: 'deleted' } });
    await flushBrowser();
    expect(host.textContent).toContain('Report.pdf (deleted)');
    expect(host.querySelector('[data-looma-file-reference] a')?.hasAttribute('href')).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    editor.commands.setTextSelection(2); editor.view.focus(); await userEvent.keyboard('x'); await flushBrowser();
    expect(editor.getText()).toContain('Rxead Report.pdf alongside these notes.');
    expect(JSON.stringify(editor.getJSON())).not.toContain('(deleted)');
    expect(editor.getHTML()).toContain('href="/api/files/report.pdf"');
  });
  it('renders an attachment as one accessible card link with SVG, filename and size at phone width', async () => {
    const viewport = { width: innerWidth, height: innerHeight };
    await page.viewport(375, 812);
    try {
      const { host, editor } = await mountEditor('<p>Review the attached report.</p><p>Keep the original notes here.</p>');
      editor.commands.insertContentAt(editor.state.doc.child(0).nodeSize, { type: 'loomaFileAttachment', attrs: { href: '/files/report.pdf', name: 'Quarterly report and notes.pdf', size: 24576, contentType: 'application/pdf' } });
      await flushBrowser();
      const card = host.querySelector<HTMLAnchorElement>('[data-looma-file-attachment]')!;
      expect(card.tagName).toBe('A'); expect(card.getAttribute('href')).toBe('/files/report.pdf');
      expect(card.textContent).toContain('Quarterly report and notes.pdf'); expect(card.textContent).toContain('24.6 KB');
      expect(card.textContent).not.toContain('Download'); expect(card.querySelector('button')).toBeNull();
      expect(card.querySelectorAll('svg path, svg polyline, svg line').length).toBeGreaterThan(0);
      expect(getComputedStyle(card).textDecorationLine).toBe('none');
      const icon = card.querySelector('svg')!.getBoundingClientRect(); expect(icon.width).toBeGreaterThan(0); expect(icon.height).toBeGreaterThan(0);
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
      const root = host.querySelector('.ProseMirror')!;
      expect(card.getBoundingClientRect().width).toBeLessThan(root.getBoundingClientRect().width - 24);
      const label = card.querySelector('[data-looma-file-name]')!;
      const bytes = card.querySelector('[data-looma-file-size]')!;
      expect(parseFloat(getComputedStyle(bytes).fontSize)).toBeLessThan(parseFloat(getComputedStyle(label).fontSize));
      expect(bytes.getBoundingClientRect().top - label.getBoundingClientRect().bottom).toBeLessThanOrEqual(2);
      const face = card.getBoundingClientRect(), contents = card.querySelector('.card-content')!.getBoundingClientRect();
      const gaps = { top: contents.top - face.top, bottom: face.bottom - contents.bottom,
        beforeIcon: icon.left - face.left, afterIcon: contents.left - icon.right };
      expect(Math.abs(gaps.top - gaps.bottom), JSON.stringify(gaps)).toBeLessThanOrEqual(1);
      expect(Math.abs(gaps.beforeIcon - gaps.afterIcon), JSON.stringify(gaps)).toBeLessThanOrEqual(1);
      const paragraphs = root.querySelectorAll('p');
      expect(card.getBoundingClientRect().top - paragraphs[0]!.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(8);
      expect(paragraphs[1]!.getBoundingClientRect().top - card.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(8);
      if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ element: host, path: '../../../.context/file-attachment-mini-block-phone.png' });
      const click = vi.fn(); card.addEventListener('click', event => { expect(event.defaultPrevented).toBe(false); event.preventDefault(); click(); });
      await userEvent.click(card); expect(click).toHaveBeenCalledTimes(1);
      card.focus(); await userEvent.keyboard('{Enter}'); expect(click).toHaveBeenCalledTimes(2);
      const before = editor.getJSON(); editor.setEditable(false); await flushBrowser();
      expect(card.getAttribute('href')).toBe('/files/report.pdf'); expect(editor.getJSON()).toEqual(before);
      expect(host.textContent).toContain('Review the attached report.'); expect(host.textContent).toContain('Keep the original notes here.');
      editor.setEditable(true); editor.view.dispatch(closeHistory(editor.state.tr)); editor.commands.setNodeSelection(editor.state.doc.child(0).nodeSize); editor.commands.deleteSelection(); await flushBrowser();
      expect(host.querySelector('[data-looma-file-attachment]')).toBeNull();
      editor.commands.undo(); await flushBrowser(); expect(host.querySelector('[data-looma-file-attachment]')?.textContent).toContain('24.6 KB');
    } finally { await page.viewport(viewport.width, viewport.height); }
  });
  it('refreshes a deleted attachment without editing history and never reactivates a restored block', async () => {
    const { host, editor } = await mountEditor('<p>Keep this writing.</p>');
    const attachment = { type: 'loomaFileAttachment', attrs: { href: '/files/report.pdf', name: 'Report.pdf', size: 1_100_000_000, contentType: 'application/pdf' } };
    editor.commands.insertContentAt(editor.state.doc.content.size, attachment);
    await flushBrowser();
    const before = editor.getJSON();
    setReferenceDisplay(editor, { 'attachment:/files/report.pdf': { label: 'Report.pdf', status: 'deleted', deletable: false } });
    await flushBrowser();
    const card = () => host.querySelector('[data-looma-file-attachment]')!;
    expect(card().textContent).toContain('Report.pdf (deleted)');
    expect(card().textContent).toContain('1.1 GB');
    expect(card().hasAttribute('href')).toBe(false);
    expect(card().getAttribute('aria-disabled')).toBe('true');
    expect(editor.getJSON()).toEqual(before);
    const remove = host.querySelector<HTMLButtonElement>('[data-looma-file-delete]')!;
    expect(remove.hidden).toBe(false);
    expect(remove.getAttribute('aria-label')).toBe('Remove Report.pdf');
    await userEvent.click(remove); await flushBrowser();
    expect(host.querySelector('[data-looma-file-attachment]')).toBeNull();
    expect(editor.getText()).toBe('Keep this writing.');
    editor.commands.undo(); await flushBrowser();
    expect(card().textContent).toContain('Report.pdf (deleted)');
    editor.setEditable(false); await flushBrowser();
    expect(host.querySelector<HTMLButtonElement>('[data-looma-file-delete]')!.hidden).toBe(true);
    editor.setEditable(true); await flushBrowser();
    expect(host.querySelector<HTMLButtonElement>('[data-looma-file-delete]')!.hidden).toBe(false);
    editor.view.dispatch(closeHistory(editor.state.tr));
    editor.commands.setNodeSelection(editor.state.doc.child(0).nodeSize);
    editor.commands.deleteSelection(); editor.commands.undo(); await flushBrowser();
    expect(card().textContent).toContain('Report.pdf (deleted)');
    expect(card().hasAttribute('href')).toBe(false);
  });
  it('keeps a malformed attachment inert instead of navigating an executable URL', async () => {
    const { host, editor } = await mountEditor('<p>Keep this writing.</p>');
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'loomaFileAttachment', attrs: { href: 'javascript:alert(1)', name: 'Report.pdf', size: 24, contentType: 'application/pdf' } });
    await flushBrowser();
    const card = host.querySelector('[data-looma-file-attachment]')!;
    expect(card.textContent).toContain('Unavailable attachment'); expect(card.hasAttribute('href')).toBe(false);
    expect(card.getAttribute('aria-disabled')).toBe('true');
  });
  it("copies heading permalinks without changing the document and follows edited anchors", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    try {
      const { host, editor } = await mountEditor('<h2 id="intro">Introduction</h2><h6 id="details">Details</h6>');
      const saved = editor.getJSON();
      const button = host.querySelector<HTMLButtonElement>('h2 button[aria-label="Copy link"]');
      expect(button).not.toBeNull();
      expect(host.querySelector('h6 button[aria-label="Copy link"]')).not.toBeNull();
      button!.focus();
      await flushBrowser();
      expect(document.activeElement).toBe(button);
      await userEvent.keyboard("{Enter}");
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(new URL("#intro", location.href).href));
      await vi.waitFor(() => expect(button!.getAttribute("aria-label")).toBe("Link copied"));
      expect(editor.getJSON()).toEqual(saved);
      expect(editor.getHTML()).not.toMatch(/button|Copy link|Link copied/);
      editor.view.dispatch(editor.state.tr.setNodeMarkup(0, undefined, { level: 2, id: "résumé/%draft" }));
      await flushBrowser();
      await userEvent.click(host.querySelector<HTMLButtonElement>("h2 button")!);
      await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith(new URL(`#${encodeURIComponent("résumé/%draft")}`, location.href).href));
      editor.commands.setContent('<h2 id="updated">Updated</h2>');
      await flushBrowser();
      await userEvent.click(host.querySelector<HTMLButtonElement>("h2 button")!);
      await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith(new URL("#updated", location.href).href));
      writeText.mockRejectedValueOnce(new Error("Denied"));
      await userEvent.click(host.querySelector<HTMLButtonElement>("h2 button")!);
      await vi.waitFor(() => expect(host.querySelector("h2 button")!.getAttribute("aria-label")).toBe("Could not copy link"));
    } finally {
      if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard);
      else Reflect.deleteProperty(navigator, "clipboard");
    }
  });
  it("offers heading links to readers and hides them on headings without anchors", async () => {
    const { host, editor } = await mountEditor('<h1 id="top">Top</h1><h3>Unanchored</h3>');
    editor.setEditable(false);
    await flushBrowser();
    expect(host.querySelector("h1 [data-looma-heading-link]")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector("h3 [data-looma-heading-link]")?.hasAttribute("hidden")).toBe(true);
    expect(editor.getHTML()).toBe('<h1 id="top">Top</h1><h3>Unanchored</h3>');
  });
  it("renders authored alignment on headings with copy links", async () => {
    const { host, editor } = await mountEditor('<h2 id="intro" align="center">Intro</h2>');
    expect(host.querySelector(".ProseMirror h2")?.getAttribute("align")).toBe("center");
    expect(editor.getHTML()).toBe('<h2 id="intro" align="center">Intro</h2>');
  });
  it("keeps an anchored heading's DOM in step with the document after a native delete", async () => {
    const { host, editor } = await mountEditor('<h2 id="intro">Intro</h2><p>Body</p>');
    const root = host.querySelector<HTMLElement>(".ProseMirror")!;
    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    document.execCommand("delete");
    await flushBrowser();
    const heading = editor.state.doc.firstChild?.type.name === "heading" ? editor.state.doc.firstChild.textContent : undefined;
    expect(root.querySelector("h2 > :first-child")?.textContent).toBe(heading);
  });
  it("refreshes cached reference display without an authored update and keeps link editing available", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const references = createState({ "link:guide": { label: "Cached guide" }, "mention:person": { label: "Cached person" } });
    const updates = vi.fn(); let editor: Editor | null = null;
    const app = createScene({ render: () => sceneNode(LoomaEditor, {
      content: { type: "doc", content: [{ type: "paragraph", content: [
        { type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Saved guide", target: "_self" } },
        { type: "text", text: " " },
        { type: "mention", attrs: { id: "person", label: "Saved person" } },
        { type: "text", text: " My wording", marks: [{ type: "link", attrs: { href: "/guide" } }] },
      ] }] },
      references: references.value, onChange: updates, extensions: captureEditor(instance => { editor = instance; }),
    }) }); apps.push(app); app.mount(host); await flushBrowser(); await expect.poll(() => editor, { timeout: 5_000 }).toBeTruthy();
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
    const divider = host.querySelector<HTMLElement>('.ProseMirror :is([component~="ui-separator"], [data-component~="ui-separator"], .ui-separator, [ui-separator])')!;
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
    const divider = host.querySelector<HTMLElement>('.ProseMirror :is([component~="ui-separator"], [data-component~="ui-separator"], .ui-separator, [ui-separator])')!;
    await vi.waitFor(() => expect(state(divider).split(" ")).not.toContain("selectable"));
  });

  it("draws a callout with Callout, follows tone and heading changes, and disconnects it once the node is removed", async () => {
    const { host, editor } = await mountEditor('<ui-callout tone="tip" heading="Before"><p>Body</p></ui-callout><p>After</p>');
    const callout = host.querySelector<HTMLElement>('.ProseMirror [data-looma-callout] :is([component~="ui-callout"], [data-component~="ui-callout"], .ui-callout, [ui-callout])')!;
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
    const disclosure = section.querySelector<HTMLElement>(':is([component~="ui-disclosure"], [data-component~="ui-disclosure"], .ui-disclosure, [ui-disclosure])')!;
    const settings = section.querySelector<HTMLElement>(':is([component~="ui-icon-button"], [data-component~="ui-icon-button"], .ui-icon-button, [ui-icon-button])')!;
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
    const [outer, inner] = [...host.querySelectorAll<HTMLElement>('.ProseMirror :is([component~="ui-disclosure"], [data-component~="ui-disclosure"], .ui-disclosure, [ui-disclosure])')];
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
    const settings = nav.querySelector<HTMLElement>(':is([component~="ui-icon-button"], [data-component~="ui-icon-button"], .ui-icon-button, [ui-icon-button])')!;
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
    const list = nav.querySelector<HTMLElement>(':is([component~="ui-list"], [data-component~="ui-list"], .ui-list, [ui-list])')!;
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
    const image = host.querySelector<HTMLElement>('.ProseMirror :is([component~="ui-image"], [data-component~="ui-image"], .ui-image, [ui-image])')!;
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
