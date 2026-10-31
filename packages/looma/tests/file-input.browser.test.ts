import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiFileInput as FileInput } from "@threadlabs/looma";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });
const names = (form: HTMLFormElement) => new FormData(form).getAll("attachments").map(value => (value as File).name).filter(Boolean);
const sample = (name: string, type = "text/plain", size = 10) => new File(["x".repeat(size)], name, { type });
async function mount(adapter: "html" | "vue", initial: Record<string, unknown> = {}) {
  const props = reactive({ name: "attachments", label: "Attachments", ...initial });
  const form = document.createElement("form"); document.body.append(form);
  if (adapter === "vue") { app = createApp({ render: () => h(FileInput, { ...props }) }); app.mount(form); }
  else {
    const invocation = document.createElement("ui-file-input");
    for (const [name, value] of Object.entries(props)) invocation.setAttribute(name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), String(value));
    form.append(invocation);
  }
  await nextTick();
  await vi.waitFor(() => expect(form.querySelector("input[data-file-control]")).not.toBeNull());
  const input = form.querySelector<HTMLInputElement>("input[data-file-control]")!;
  const root = input.closest<HTMLElement>('[role="group"]')!;
  await vi.waitFor(() => expect(root.getAttribute("data-ui-file-input-state")).toContain("enhanced"));
  input.dataset.testid = "upload-input";
  const events: { type: string; detail: any }[] = [];
  for (const type of ["change", "reject"]) root.addEventListener(type, event => { if (event instanceof CustomEvent) events.push({ type, detail: event.detail }); });
  const upload = (files: File[]) => page.getByTestId("upload-input").upload(files);
  const drop = (files: File[]) => {
    const transfer = new DataTransfer(); for (const file of files) transfer.items.add(file);
    const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer }); root.dispatchEvent(over);
    const event = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }); root.dispatchEvent(event);
    return { over, event };
  };
  return { props, form, input, root, events, upload, drop };
}

for (const adapter of ["html", "vue"] as const) {
  it(`submits actual selected files, removes one by keyboard and restores focus in ${adapter}`, async () => {
    const { form, input, events, upload } = await mount(adapter, { multiple: true });
    await upload([sample("one.txt"), sample("two.txt")]);
    await vi.waitFor(() => expect(names(form)).toEqual(["one.txt", "two.txt"]));
    expect(events.filter(event => event.type === "change")).toHaveLength(1);
    expect(events[0]!.detail.files[0]).toBeInstanceOf(File);
    const first = form.querySelector<HTMLButtonElement>('[aria-label="Remove one.txt"]')!;
    first.focus(); await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(names(form)).toEqual(["two.txt"]));
    await vi.waitFor(() => expect(document.activeElement).toBe(form.querySelector('[aria-label="Remove two.txt"]')));
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(names(form)).toEqual([]));
    expect(document.activeElement).toBe(input);
    expect(events.at(-1)!.detail.trigger).toBe("keyboard");
  });

  it(`replaces selection on drop and preserves accepted files after a rejected proposal in ${adapter}`, async () => {
    const { form, events, upload, drop } = await mount(adapter, { accept: ".pdf", maxFileSize: 50 });
    await upload([sample("report.pdf", "application/pdf", 20)]);
    const result = drop([sample("large.pdf", "application/pdf", 100)]);
    expect(result.over.defaultPrevented).toBe(true); expect(result.event.defaultPrevented).toBe(true);
    expect(names(form)).toEqual(["report.pdf"]);
    expect(events.at(-1)!.type).toBe("reject"); expect(events.at(-1)!.detail.message).toContain("large.pdf");
    drop([sample("wrong.exe", "application/octet-stream")]); expect(names(form)).toEqual(["report.pdf"]);
    drop([sample("replacement.pdf", "application/pdf", 30)]);
    await vi.waitFor(() => expect(names(form)).toEqual(["replacement.pdf"]));
    expect(form.checkValidity()).toBe(true);
    expect(events.filter(event => event.type === "change")).toHaveLength(2);
  });

  it(`validates required selection, resets, and leaves cancelled resets intact in ${adapter}`, async () => {
    const { form, input, upload } = await mount(adapter, { required: true });
    expect(form.checkValidity()).toBe(false);
    await upload([sample("notes.txt")]); await vi.waitFor(() => expect(form.checkValidity()).toBe(true));
    form.addEventListener("reset", event => event.preventDefault(), { once: true }); form.reset();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(names(form)).toEqual(["notes.txt"]);
    form.reset(); await vi.waitFor(() => expect(names(form)).toEqual([]));
    expect(input.files).toHaveLength(0); expect(form.checkValidity()).toBe(false);
  });

  it(`prevents navigation and changes when files are dropped on a disabled control in ${adapter}`, async () => {
    const { form, input, events, drop } = await mount(adapter, { disabled: true });
    const result = drop([sample("notes.txt")]);
    expect(input.disabled).toBe(true); expect(result.event.defaultPrevented).toBe(true);
    expect(new FormData(form).getAll("attachments")).toEqual([]); expect(events).toEqual([]);
  });
}

it("revalidates an existing selection when constraints change without silently dropping files", async () => {
  const { props, form, input, upload } = await mount("vue", { maxFileSize: 50 });
  await upload([sample("notes.txt", "text/plain", 20)]);
  props.maxFileSize = 10; await nextTick();
  await vi.waitFor(() => expect(form.checkValidity()).toBe(false)); expect(names(form)).toEqual(["notes.txt"]);
  props.maxFileSize = 50; await nextTick();
  await vi.waitFor(() => expect(form.checkValidity()).toBe(true));
  form.reset(); await vi.waitFor(() => expect(input.files).toHaveLength(0));
  props.required = true; await nextTick(); expect(form.checkValidity()).toBe(false);
  props.required = false; await nextTick(); await vi.waitFor(() => expect(form.checkValidity()).toBe(true));
});

it("keeps long filenames and removal actions usable in light and dark modes at 375px", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const { form, root, upload } = await mount("vue", { multiple: true });
    form.style.width = "343px"; form.style.fontFamily = "var(--ui-font-family-sans)";
    await upload([sample("a-document-with-a-long-descriptive-name-for-a-small-screen.pdf", "application/pdf"), sample("notes.txt")]);
    await vi.waitFor(() => expect(root.querySelectorAll("[data-file-remove]")).toHaveLength(2));
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    for (const button of root.querySelectorAll("[data-file-remove]")) expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right);
    await page.screenshot({ element: form, path: `../../../.context/file-input-${theme}-mobile.png` });
    app?.unmount(); app = undefined; form.remove();
  }
});
