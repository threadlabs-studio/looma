import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { UiButton as Button, UiContextMenu as ContextMenu, UiStack as Stack, UiEditorToolbar as EditorToolbar, UiEditor, UiCompactContent } from "@threadlabs/looma";
import {
  getDefaultEditorExtensions,
  type LoomaImageAttributeResolver,
  type LoomaImageSourceResolver,
  type SlashMenuItem,
} from "@threadlabs/looma/editor";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

const slashItems: SlashMenuItem[] = [
  { title: "Heading", description: "Insert a heading", icon: "heading-1" }
];
const resolveImageAttributes: LoomaImageAttributeResolver = (image) => image.responsive
  ? { src: image.src, loading: "lazy", decoding: "async" }
  : undefined;
const resolveImageSource: LoomaImageSourceResolver = image => image.src;

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
