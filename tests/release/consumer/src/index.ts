import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { UiCalendar as Calendar, UiDateField as DateField, UiDatePicker as DatePicker, UiDateRangePicker as DateRangePicker, UiFileInput as FileInput, UiTimeField as TimeField, UiTimePicker as TimePicker, UiButton as Button, UiContextMenu as ContextMenu, UiStack as Stack, UiEditorToolbar as EditorToolbar, UiEditor, UiCompactContent } from "@threadlabs/looma";
import {
  getDefaultEditorExtensions,
  type LoomaImageAttributeResolver,
  type LoomaImageSourceResolver,
  type SlashMenuItem,
} from "@threadlabs/looma/editor";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { enabledOptionIndices, nextActiveIndex } from "@threadlabs/looma/behaviors";

const slashItems: SlashMenuItem[] = [
  { title: "Heading", description: "Insert a heading", icon: "heading-1" }
];
const resolveImageAttributes: LoomaImageAttributeResolver = (image) => image.responsive
  ? { src: image.src, loading: "lazy", decoding: "async" }
  : undefined;
const resolveImageSource: LoomaImageSourceResolver = image => image.src;
type FileSelectionEvent = Parameters<NonNullable<InstanceType<typeof FileInput>["$props"]["onChange"]>>[0];
const countFiles = (event: FileSelectionEvent) => event.detail.files.length;

const extensions = getDefaultEditorExtensions();
if (
  extensions.length === 0
  || slashItems.length === 0
  || typeof resolveImageAttributes !== "function"
  || typeof resolveImageSource !== "function"
) {
  throw new Error("package exports were not consumable");
}

for (const styleExport of [
  "@threadlabs/looma/tokens.css",
  "@threadlabs/looma/theme-light.css",
  "@threadlabs/looma/editor.css",
]) {
  const styleBytes = await readFile(fileURLToPath(import.meta.resolve(styleExport)));
  if (styleBytes.length === 0) throw new Error(`${styleExport} resolved to an empty file`);
}

if (nextActiveIndex(enabledOptionIndices([{ disabled: true }, {}]), -1, "ArrowDown") !== 1) {
  throw new Error("the behavior export was not usable on the server");
}

for (const name of ["editor-workspace", "list-detail", "settings-form", "search-and-open"]) {
  const url = import.meta.resolve(`@threadlabs/looma/blocks/${name}.html`);
  const markup = await readFile(new URL(url), "utf8");
  if (!markup.includes(`data-block="${name}"`) || markup.includes("<template component=")) {
    throw new Error(`the ${name} starter must ship as a markup composition`);
  }
  const controller = await readFile(new URL(`./${name}.js`, url), "utf8");
  if (!controller.includes("export default function setup")) throw new Error(`the ${name} setup was not packed`);
}

// The consumer Vite plugin compiles the shipped definitions, including editor SSR fallbacks.
const app = createSSRApp({
  render: () =>
    h(Stack, { gap: "m" }, () => [
      h(Button, { variant: "solid" }, () => "Save"),
      h(ContextMenu, null, () => "Actions"),
      h(EditorToolbar, null, () => h(Button, null, () => "Bold")),
      h(UiEditor, { label: "Document" }, { fallback: () => h("p", "Saved document") }),
      h(UiCompactContent, { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<literal>" }] }] } })
    ])
});

const html = await renderToString(app);
for (const tag of ["ui-stack", "ui-button", "ui-context-menu", "ui-editor-toolbar"]) {
  // Converted Vue marks each component root with its tag as a class.
  if (!new RegExp(`class="(?:[^"]* )?${tag}(?: [^"]*)?"`).test(html)) throw new Error(`unexpected Vue SSR output for ${tag}: ${html}`);
}
if (!html.includes("<button") || html.includes("<ui-button")) {
  throw new Error(`unexpected Vue SSR output: ${html}`);
}

if (!html.includes("Saved document") || !html.includes("&lt;literal&gt;")) throw new Error("editor SSR fallback was not preserved");
const dates = await renderToString(createSSRApp({ render: () => h(Stack, {}, () => [
  h(Calendar, { value: "2024-02-29", today: "2024-02-12" }),
  h(DateField, { value: "2024-02-29", name: "plain", inputId: "release-plain" }),
  h(DatePicker, { value: "2024-02-29", today: "2024-02-12", name: "day", label: "Date" }),
  h(DateRangePicker, { value: { start: "2024-02-10", end: "2024-02-15" }, today: "2024-02-12", startName: "start", endName: "end" }),
  h(TimeField, { value: "09:30", name: "time", inputId: "release-time" }),
  h(TimePicker, { value: "09:30", name: "clock", inputId: "release-clock" }),
  h(FileInput, { name: "attachments", inputId: "release-files", onChange: countFiles }),
]) }));
if ((dates.match(/data-calendar-day="/g) ?? []).length !== 126) throw new Error("installed date controls did not prepare all calendar grids before SSR");
for (const [name, value] of [["plain", "2024-02-29"], ["day", "2024-02-29"], ["start", "2024-02-10"], ["end", "2024-02-15"], ["time", "09:30"], ["clock", "09:30"]]) {
  if (!new RegExp(`<input\\b(?=[^>]*\\bname="${name}")(?=[^>]*\\bvalue="${value}")[^>]*>`).test(dates)) throw new Error(`installed SSR lost the canonical ${name} form value`);
}
if (!/<input\b(?=[^>]*\btype="file")(?=[^>]*\bname="attachments")[^>]*>/.test(dates)) throw new Error("installed File Input lost its native form control");
