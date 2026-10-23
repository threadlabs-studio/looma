import { Mark, type Editor, type JSONContent } from "@tiptap/core";
import { RequestEvent } from "@nextwebwg/html-next/runtime";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../vue/components.css";

const { respond } = RequestEvent;
const apps: App[] = [];
const cleanups: Array<() => void> = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  for (const app of apps.splice(0)) app.unmount();
  await flushBrowser();
  document.body.innerHTML = "";
});

async function mountEditor(props: Record<string, unknown>) {
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  const host = document.body.appendChild(document.createElement("div"));
  const ready: Editor[] = [];
  const app = createApp({ render: () => h(LoomaEditor, { toolbarMode: "sticky", ...props, onReady: (instance: Editor) => ready.push(instance) }) });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  return { host, ready };
}

function chooseImage(host: HTMLElement, name: string) {
  const input = host.querySelector<HTMLInputElement>(".looma-editor__file-input")!;
  const files = new DataTransfer();
  files.items.add(new File(["x"], name, { type: "image/png" }));
  input.files = files.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const insertImage = () => page.getByRole("button", { name: "Insert image", exact: true });

describe("LoomaEditor requests", () => {
  it("answers image-upload through the Vue event form, shows its progress, and cancels it", async () => {
    let signal: AbortSignal | undefined;
    const errors: unknown[] = [];
    const { host, ready } = await mountEditor({
      onImageUpload: (event: RequestEvent<{ file: File }, unknown>) => event.respondWith(new Promise((_resolve, reject) => {
        signal = event.signal;
        event.progress(1, 2);
        event.signal.addEventListener("abort", () => reject(event.signal.reason));
      })),
      onUploadError: (error: unknown) => errors.push(error),
    });
    await expect.element(insertImage()).toBeEnabled();
    chooseImage(host, "photo.png");
    await expect.element(page.getByText("Uploading image… 50%")).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "Cancel", exact: true }));
    await expect.element(page.getByText("Uploading image…", { exact: false })).not.toBeInTheDocument();
    expect(signal?.aborted).toBe(true);
    expect(errors).toEqual([]);
    expect(JSON.stringify(ready.at(-1)!.getJSON())).not.toContain("photo.png");
  });

  it("answers with the function prop ahead of the Vue event form and the document", async () => {
    cleanups.push(respond(document, "image-upload", () => ({ src: "https://document.example.com/x.png" })));
    const listener = vi.fn();
    const { host, ready } = await mountEditor({
      imageUpload: ({ file }: { file: File }) => ({ src: `https://prop.example.com/${file.name}`, alt: "From the prop" }),
      onImageUpload: listener,
    });
    ready.at(-1)!.commands.focus();
    chooseImage(host, "a.png");
    await vi.waitFor(() => expect(JSON.stringify(ready.at(-1)!.getJSON())).toContain("https://prop.example.com/a.png"));
    expect(listener).not.toHaveBeenCalled();
  });

  it("hears late responders: Insert image becomes available, and extensions rebuild the editor from the host's content", async () => {
    const spoiler = Mark.create({ name: "spoiler", parseHTML: () => [{ tag: "span[data-spoiler]" }], renderHTML: () => ["span", { "data-spoiler": "" }, 0] });
    const modelValue: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hidden", marks: [{ type: "spoiler" }] }] }] };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ready } = await mountEditor({ modelValue });
    await expect.element(insertImage()).toBeDisabled();
    cleanups.push(respond(document, "image-upload", () => null));
    await expect.element(insertImage()).toBeEnabled();
    cleanups.push(respond(document.body, "extensions", () => [spoiler]));
    await vi.waitFor(() => expect(ready).toHaveLength(2));
    expect(ready[0]!.isDestroyed).toBe(true);
    expect(ready[1]!.getHTML()).toContain('<span data-spoiler="">Hidden</span>');
    vi.restoreAllMocks();
  });

  it("offers Insert image for a responder known before mount, and a plain listener still answers without being known", async () => {
    cleanups.push(respond(document, "image-upload", ({ file }: { file: File }) => ({ src: `https://known.example.com/${file.name}` })));
    const first = await mountEditor({});
    await expect.element(insertImage()).toBeEnabled();
    first.ready.at(-1)!.commands.focus();
    chooseImage(first.host, "known.png");
    await vi.waitFor(() => expect(JSON.stringify(first.ready.at(-1)!.getJSON())).toContain("https://known.example.com/known.png"));
    cleanups.splice(0).forEach((cleanup) => cleanup());
    for (const app of apps.splice(0)) app.unmount();
    document.body.innerHTML = "";

    const plain = (event: Event) => (event as RequestEvent<{ file: File }, unknown>).respondWith({ src: "https://plain.example.com/p.png" });
    document.addEventListener("image-upload", plain);
    cleanups.push(() => document.removeEventListener("image-upload", plain));
    const second = await mountEditor({});
    await expect.element(insertImage()).toBeDisabled();
    second.ready.at(-1)!.commands.focus();
    chooseImage(second.host, "p.png");
    await vi.waitFor(() => expect(JSON.stringify(second.ready.at(-1)!.getJSON())).toContain("https://plain.example.com/p.png"));
  });

  it("asks mention-query with the query and limit, replaces older queries, and falls back to mentionItems on null", async () => {
    const mentionQuery = vi.fn((_detail: { query: string; limit: number }, _init: { signal: AbortSignal }) => null);
    const { host, ready } = await mountEditor({ mentionQuery, mentionItems: [{ id: "ada", label: "Ada Lovelace" }], mentionLimit: 5 });
    await userEvent.click(ready.at(-1)!.view.dom);
    await userEvent.keyboard("@ad");
    await vi.waitFor(() => expect(host.querySelector('[data-component~="ui-editor-mention-menu"], .ui-editor-mention-menu')?.textContent).toContain("Ada Lovelace"));
    expect(mentionQuery).toHaveBeenLastCalledWith({ query: "ad", limit: 5 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const signals = mentionQuery.mock.calls.map(([, init]) => init.signal.aborted);
    expect(signals.at(-1)).toBe(false);
    expect(signals.slice(0, -1).every(Boolean)).toBe(true);
  });
});


it("attaches a chosen file through its host responder as an editable link", async () => {
  const { host, ready } = await mountEditor({ fileUpload: ({ file }: { file: File }) => ({ href: "/files/report.pdf", name: file.name, size: file.size, contentType: file.type }) });
  await expect.element(page.getByRole("button", { name: "Attach file", exact: true })).toBeEnabled();
  const input = host.querySelector<HTMLInputElement>('input[type="file"]:not([accept])')!;
  const transfer = new DataTransfer(); transfer.items.add(new File(["report"], "report.pdf", { type: "application/pdf" }));
  input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(JSON.stringify(ready.at(-1)!.getJSON())).toContain('/files/report.pdf'));
  await expect.element(page.getByRole("link", { name: "report.pdf" })).toBeVisible();
});
