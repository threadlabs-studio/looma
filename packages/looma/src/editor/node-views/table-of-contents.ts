import type { NodeViewRenderer } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import { updateComponentProps } from "@nextwebwg/html-next/runtime";
import { createUiButton } from "@threadlabs/looma/vanilla/UiButton.js";
import { createUiAffordanceScope } from "@threadlabs/looma/vanilla/UiAffordanceScope.js";
import { createUiCluster } from "@threadlabs/looma/vanilla/UiCluster.js";
import { createUiFormField } from "@threadlabs/looma/vanilla/UiFormField.js";
import { createUiIcon } from "@threadlabs/looma/vanilla/UiIcon.js";
import { createUiIconButton } from "@threadlabs/looma/vanilla/UiIconButton.js";
import { createUiList } from "@threadlabs/looma/vanilla/UiList.js";
import { createUiMenu } from "@threadlabs/looma/vanilla/UiMenu.js";
import { createUiMenuItem } from "@threadlabs/looma/vanilla/UiMenuItem.js";
import { createUiPopover } from "@threadlabs/looma/vanilla/UiPopover.js";
import { createUiStack } from "@threadlabs/looma/vanilla/UiStack.js";
import { createUiText } from "@threadlabs/looma/vanilla/UiText.js";
import { createUiTooltip } from "@threadlabs/looma/vanilla/UiTooltip.js";
import { navigateTableOfContents, tableOfContentsTree } from "../extensions/table-of-contents";
import { getTableOfContentsEntries, normalizeTableOfContentsConfig, type LoomaTableOfContentsConfig } from "@threadlabs/looma/editor";
import { element } from "./element";
import { getReferenceDisplay } from "../reference-display";

let tocSequence = 0;

const FORMAT_LABELS = { plain: "Plain", bulleted: "Bulleted", numbered: "Numbered" } as const;
const optionsFor = (field: "format" | "depth") => field === "format"
  ? Object.entries(FORMAT_LABELS).map(([value, text]) => ({ value, text }))
  : [1, 2, 3].map((value) => ({ value: String(value), text: `Through heading ${value}` }));
const choiceLabel = (field: "format" | "depth", config: LoomaTableOfContentsConfig) =>
  field === "format" ? FORMAT_LABELS[config.format] : `Through heading ${config.depth}`;

/**
 * Composes a table of contents and its settings from Looma's components.
 * @lifecycle The view follows the document and rebuilds its entries when they change; the components
 * disconnect once ProseMirror removes its element, and destroying the view stops following the editor.
 * Imported authored links stay in the node body; automatic TOCs store only configuration.
 */
export const tableOfContentsNodeView: NodeViewRenderer = ({ editor, node, getPos }) => {
  const id = `looma-toc-${++tocSequence}`;
  let current = node;
  let editable = editor.isEditable;
  let selected = false;
  let hovered = false;
  let settingsOpen = false;
  const config = () => normalizeTableOfContentsConfig(current.attrs);
  let draft = config();

  // Entries: rebuilt when the headings or the format change, which every edit does not.
  const entries = document.createElement("div");
  let shown = "";
  const list = (items: ReturnType<typeof tableOfContentsTree>, format: LoomaTableOfContentsConfig["format"]): HTMLElement => element(createUiList({
    as: format === "numbered" ? "ol" : "ul", markers: format === "bulleted" ? "disc" : "none", density: "compact",
    children: items.map(({ entry, children }) => {
      const item = document.createElement("li");
      const link: HTMLElement = createUiButton({
        as: "a", href: `#${entry.id}`, variant: "link", tone: "neutral", size: "sm",
        children: [element(createUiText({ as: "span", wrap: "anywhere", children: [entry.text] }))],
      });
      link.addEventListener("click", (event) => { event.preventDefault(); navigateTableOfContents(editor, entry.id); });
      item.append(link, ...(children.length ? [list(children, format)] : []));
      return item;
    }),
  }));
  const renderEntries = () => {
    const { format, depth } = config();
    if (current.childCount) {
      const signature = JSON.stringify(current.content.toJSON());
      if (signature !== shown) { shown = signature; entries.replaceChildren(DOMSerializer.fromSchema(editor.schema).serializeFragment(current.content)); }
      return;
    }
    const found = getTableOfContentsEntries(editor.state.doc, depth, getReferenceDisplay(editor));
    const signature = JSON.stringify([format, found.map(({ id: entryId, text, level }) => [entryId, text, level])]);
    if (signature === shown) return;
    shown = signature;
    entries.replaceChildren(found.length
      ? list(tableOfContentsTree(found), format)
      : element(createUiText({ size: "sm", tone: "secondary", children: ["Add headings to build your table of contents."] })));
  };

  // Settings: two dropdowns that change a draft, saved or dropped as a whole.
  const choices = { format: null as HTMLElement | null, depth: null as HTMLElement | null };
  const items = { format: [] as Array<[string, HTMLElement]>, depth: [] as Array<[string, HTMLElement]> };
  const showDraft = () => {
    for (const field of ["format", "depth"] as const) {
      choices[field]?.replaceChildren(choiceLabel(field, draft));
      for (const [value, item] of items[field]) updateComponentProps(item, { checked: String(draft[field]) === value });
    }
  };
  const dropdown = (field: "format" | "depth") => {
    const label = field === "format" ? "Formatting" : "Heading depth";
    const trigger = `${id}-${field}`;
    const caption = document.createElement("label");
    caption.htmlFor = trigger;
    caption.textContent = label;
    const choice = document.createElement("span");
    choices[field] = choice;
    const button = element(createUiButton({
      variant: "outline", tone: "neutral", size: "sm", stretch: true, align: "start", attributes: { id: trigger, "aria-label": label },
      children: [element(createUiCluster({ justify: "between", gap: "s", children: [choice, element(createUiIcon({ name: "chevron-down" }))] }))],
    }));
    items[field] = optionsFor(field).map((option) => [option.value, element(createUiMenuItem({
      value: option.value, type: "radio", checked: String(draft[field]) === option.value, children: [option.text],
    }))]);
    const menu: HTMLElement = createUiMenu({ for: trigger, size: "sm", attributes: { "aria-label": label }, children: items[field].map(([, item]) => item) });
    menu.addEventListener("select", (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail;
      draft = normalizeTableOfContentsConfig({ ...draft, [field]: field === "depth" ? Number(value) : value });
      showDraft();
    });
    return element(createUiFormField({ slots: { label: [caption] }, children: [button, menu] }));
  };
  const cancel: HTMLElement = createUiButton({ variant: "ghost", tone: "neutral", size: "sm", children: ["Cancel"] });
  const save: HTMLElement = createUiButton({ variant: "solid", size: "sm", children: ["Save"] });
  const popover: HTMLElement = createUiPopover({
    for: id, size: "sm", attributes: { "aria-label": "Table of contents settings" },
    children: [element(createUiStack({ gap: "s", children: [
      element(createUiText({ as: "strong", size: "sm", weight: "semibold", children: ["Table of contents"] })),
      dropdown("format"), dropdown("depth"),
      element(createUiCluster({ justify: "end", gap: "xs", children: [cancel, save] })),
    ] }))],
  });
  // Popover reports its open state, and the view echoes it so Cancel and Save can close it.
  const setSettingsOpen = (open: boolean) => {
    settingsOpen = open;
    updateComponentProps(popover, { open });
    revealSettings();
  };
  // A nested Menu's open and close bubble through the popover too; only the popover's own count.
  popover.addEventListener("open", (event) => { if (event.target === popover) { draft = config(); showDraft(); setSettingsOpen(true); } });
  popover.addEventListener("close", (event) => { if (event.target === popover) setSettingsOpen(false); });
  cancel.addEventListener("click", () => setSettingsOpen(false));
  save.addEventListener("click", () => {
    const position = getPos();
    if (typeof position !== "number" || !editor.isEditable || editor.state.doc.nodeAt(position)?.type.name !== "loomaTableOfContents") return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, normalizeTableOfContentsConfig({ ...draft })));
    setSettingsOpen(false);
    editor.commands.focus();
  });
  const settingsButton = element(createUiIconButton({
    label: "Table of contents settings", variant: "ghost", tone: "neutral", size: "sm", anticipatory: true,
    attributes: { id }, children: [element(createUiText({ as: "span", tone: "secondary", children: [element(createUiIcon({ name: "settings" }))] }))],
  }));
  const revealSettings = () => updateComponentProps(settingsButton, { revealed: selected || hovered || settingsOpen });
  const tooltip = element(createUiTooltip({ for: id, children: ["Table of contents settings"] }));

  const nav = document.createElement("nav");
  nav.dataset.loomaToc = "";
  nav.setAttribute("aria-label", "Table of contents");
  const gutter = document.createElement("span");
  gutter.dataset.loomaTocGutter = "";
  gutter.append(settingsButton);
  nav.append(gutter, element(createUiStack({ gap: "s", children: [
    element(createUiText({ as: "strong", size: "sm", weight: "semibold", children: ["Table of contents"] })),
    entries, popover, tooltip,
  ] })));
  nav.addEventListener("pointerenter", () => { hovered = true; revealSettings(); });
  nav.addEventListener("pointerleave", () => { hovered = false; revealSettings(); });
  nav.addEventListener("click", (event) => {
    if (!editable || (event.target as Element).closest("button, a, [role=dialog]")) return;
    const position = getPos();
    if (typeof position === "number") editor.chain().setNodeSelection(position).focus().run();
  });
  const dom = document.createElement("div");
  dom.contentEditable = "false";
  dom.append(element(createUiAffordanceScope({ children: [nav] })));

  // Settings are for authors; a reader sees only the entries.
  const render = () => {
    const { format, depth } = config();
    nav.dataset.format = format;
    nav.dataset.depth = String(depth);
    const author = editable && current.childCount === 0;
    gutter.hidden = settingsButton.hidden = !author;
    // Overlays own their closed/hidden state. Unhiding them on every document
    // refresh leaves an invisible tooltip intercepting clicks over the title.
    if (!author) { setSettingsOpen(false); tooltip.hidden = true; }
    renderEntries();
  };
  const refresh = () => {
    editable = editor.isEditable;
    render();
  };
  render();
  showDraft();
  editor.on("transaction", refresh);
  editor.on("update", refresh);
  return {
    dom,
    selectNode() { selected = true; revealSettings(); },
    deselectNode() { selected = false; revealSettings(); },
    update(next) {
      if (next.type !== current.type) return false;
      current = next;
      refresh();
      return true;
    },
    stopEvent: () => true,
    ignoreMutation: () => true,
    destroy() { editor.off("transaction", refresh); editor.off("update", refresh); },
  };
};
