import "@threadlabs/looma";
import "@threadlabs/looma/layout";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineCustomElements } from "@threadlabs/looma/loader";
import { Button, ContextMenu, Stack } from "@threadlabs/looma/vue";
import {
  EditorToolbar,
  getDefaultEditorExtensions,
  type SlashMenuItem,
} from "@threadlabs/looma/vue/editor";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

const slashItems: SlashMenuItem[] = [
  { title: "Heading", description: "Insert a heading", icon: "heading-1" }
];

const extensions = getDefaultEditorExtensions();
if (extensions.length === 0 || slashItems.length === 0 || typeof defineCustomElements !== "function") {
  throw new Error("editor exports were not consumable");
}

const require = createRequire(import.meta.url);
require("@threadlabs/looma");
require("@threadlabs/looma/layout");

for (const styleExport of [
  "@threadlabs/looma/tokens.css",
  "@threadlabs/looma/theme-light.css",
  "@threadlabs/looma/layout.css",
  "@threadlabs/looma/styles.css",
  "@threadlabs/looma/editor.css"
]) {
  const styleUrl = import.meta.resolve(styleExport);
  const styleBytes = await readFile(fileURLToPath(styleUrl));
  if (styleBytes.length === 0) {
    throw new Error(`${styleExport} resolved to an empty file`);
  }
}

const app = createSSRApp({
  render: () =>
    h(Stack, { gap: "md" }, () => [
      h(Button, { variant: "solid" }, () => h("button", { type: "button" }, "Save")),
      h(ContextMenu, null, () => "Actions"),
      h(EditorToolbar, null, () => h("button", { type: "button" }, "Bold"))
    ])
});

const html = await renderToString(app);
if (!html.includes("ui-stack") || !html.includes("ui-button") || !html.includes("ui-context-menu")) {
  throw new Error(`unexpected Vue SSR output: ${html}`);
}
