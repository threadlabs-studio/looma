import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { definitions } from "@threadlabs/looma";
import { Button, ContextMenu, Stack } from "@threadlabs/looma/vue";
import {
  EditorToolbar,
  getDefaultEditorExtensions,
  type LoomaImageAttributeResolver,
  type SlashMenuItem,
} from "@threadlabs/looma/vue/editor";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

const slashItems: SlashMenuItem[] = [
  { title: "Heading", description: "Insert a heading", icon: "heading-1" }
];
const resolveImageAttributes: LoomaImageAttributeResolver = (image) => image.responsive
  ? { src: image.src, loading: "lazy", decoding: "async" }
  : undefined;

const extensions = getDefaultEditorExtensions();
if (
  extensions.length === 0
  || slashItems.length === 0
  || typeof resolveImageAttributes !== "function"
  || definitions.length === 0
) {
  throw new Error("package exports were not consumable");
}

for (const styleExport of [
  "@threadlabs/looma/tokens.css",
  "@threadlabs/looma/theme-light.css",
  "@threadlabs/looma/vue.css",
]) {
  const styleBytes = await readFile(fileURLToPath(import.meta.resolve(styleExport)));
  if (styleBytes.length === 0) throw new Error(`${styleExport} resolved to an empty file`);
}

// Converted components render their native roots on the server, with no HTML Next runtime.
const app = createSSRApp({
  render: () =>
    h(Stack, { gap: "m" }, () => [
      h(Button, { variant: "solid" }, () => "Save"),
      h(ContextMenu, null, () => "Actions"),
      h(EditorToolbar, null, () => h("button", { type: "button" }, "Bold"))
    ])
});

const html = await renderToString(app);
for (const tag of ["ui-stack", "ui-button", "ui-context-menu", "ui-editor-toolbar"]) {
  if (!html.includes(`data-component="${tag}"`)) throw new Error(`unexpected Vue SSR output for ${tag}: ${html}`);
}
if (!html.includes("<button") || html.includes("<ui-button")) {
  throw new Error(`unexpected Vue SSR output: ${html}`);
}
