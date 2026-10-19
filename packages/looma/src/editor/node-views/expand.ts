import type { NodeViewRenderer } from "@tiptap/core";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiButton } from "@threadlabs/looma/vanilla/UiButton.js";
import { createUiCheckbox } from "@threadlabs/looma/vanilla/UiCheckbox.js";
import { createUiCluster } from "@threadlabs/looma/vanilla/UiCluster.js";
import { createUiDisclosure } from "@threadlabs/looma/vanilla/UiDisclosure.js";
import { createUiFormField } from "@threadlabs/looma/vanilla/UiFormField.js";
import { createUiIcon } from "@threadlabs/looma/vanilla/UiIcon.js";
import { createUiIconButton } from "@threadlabs/looma/vanilla/UiIconButton.js";
import { createUiInput } from "@threadlabs/looma/vanilla/UiInput.js";
import { createUiPopover } from "@threadlabs/looma/vanilla/UiPopover.js";
import { createUiStack } from "@threadlabs/looma/vanilla/UiStack.js";
import { createUiText } from "@threadlabs/looma/vanilla/UiText.js";
import { createUiTooltip } from "@threadlabs/looma/vanilla/UiTooltip.js";
import { element } from "./element";

let expandSequence = 0;

/**
 * Composes a section's disclosure and its saved settings from Looma's components.
 * @lifecycle ProseMirror owns the content DOM in Disclosure's slot and the view's element; the
 * components disconnect once ProseMirror removes it, and destroying the view stops following the
 * editor and its reveal requests.
 */
export const expandNodeView: NodeViewRenderer = ({ editor, node, getPos }) => {
  const id = `looma-expand-${++expandSequence}`;
  let current = node;
  let editable = editor.isEditable;
  let expanded = editable || Boolean(node.attrs.open);
  const draft = { summary: String(node.attrs.summary), open: Boolean(node.attrs.open) };

  // ProseMirror owns these elements' lifetimes, so the view sets their props as a framework adapter does,
  // and echoes the open state Disclosure and Popover report so a later change reaches them.
  const contentDOM = document.createElement("div");
  contentDOM.dataset.loomaExpandBody = "";
  const disclosure: HTMLElement = createUiDisclosure({ summary: node.attrs.summary, open: expanded, density: "compact", children: [contentDOM] });
  const setExpanded = (open: boolean) => {
    expanded = open;
    componentRegistry.update(disclosure, { summary: current.attrs.summary, open });
  };
  // A section nested in this one's body bubbles its own open and close through this Disclosure.
  disclosure.addEventListener("open", (event) => { if (event.target === disclosure) setExpanded(true); });
  disclosure.addEventListener("close", (event) => { if (event.target === disclosure) setExpanded(false); });

  const summary: HTMLElement = createUiInput({ size: "sm", value: draft.summary, attributes: { id: `${id}-summary` } });
  summary.addEventListener("input", () => {
    draft.summary = (summary as HTMLInputElement).value;
    componentRegistry.update(summary, { value: draft.summary });
  });
  const label = document.createElement("label");
  label.htmlFor = `${id}-summary`;
  label.textContent = "Summary";
  const initiallyExpanded: HTMLElement = createUiCheckbox({ checked: draft.open, children: ["Initially expanded"] });
  initiallyExpanded.addEventListener("change", (event) => {
    draft.open = (event as CustomEvent<{ checked: boolean }>).detail.checked;
    componentRegistry.update(initiallyExpanded, { checked: draft.open });
  });
  const cancel: HTMLElement = createUiButton({ variant: "ghost", tone: "neutral", size: "sm", children: ["Cancel"] });
  const save: HTMLElement = createUiButton({ variant: "solid", size: "sm", children: ["Save"] });
  const popover: HTMLElement = createUiPopover({
    for: id, size: "sm", attributes: { "aria-label": "Section settings" },
    children: [element(createUiStack({ gap: "s", children: [
      element(createUiText({ as: "strong", size: "sm", weight: "semibold", children: ["Section settings"] })),
      element(createUiFormField({ slots: { label: [label] }, children: [summary] })),
      initiallyExpanded,
      element(createUiCluster({ justify: "end", gap: "xs", children: [cancel, save] })),
    ] }))],
  });
  const setSettingsOpen = (open: boolean) => componentRegistry.update(popover, { open });
  popover.addEventListener("open", (event) => {
    if (event.target !== popover) return;
    draft.summary = String(current.attrs.summary);
    draft.open = Boolean(current.attrs.open);
    componentRegistry.update(summary, { value: draft.summary });
    componentRegistry.update(initiallyExpanded, { checked: draft.open });
    setSettingsOpen(true);
  });
  popover.addEventListener("close", (event) => { if (event.target === popover) setSettingsOpen(false); });
  cancel.addEventListener("click", () => setSettingsOpen(false));
  save.addEventListener("click", () => {
    const position = getPos();
    if (typeof position !== "number" || !editor.isEditable || editor.state.doc.nodeAt(position)?.type.name !== "loomaExpand") return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { summary: draft.summary.trim() || "Details", open: draft.open }));
    setSettingsOpen(false);
    editor.commands.focus();
  });
  const settings: HTMLElement = createUiCluster({ justify: "end", gap: "xs", children: [
    element(createUiIconButton({ label: "Section settings", variant: "ghost", size: "sm", attributes: { id }, children: [element(createUiIcon({ name: "settings" }))] })),
    element(createUiTooltip({ for: id, children: ["Section settings"] })),
  ] });

  const dom = document.createElement("div");
  dom.dataset.loomaExpand = "";
  dom.append(element(createUiStack({ gap: "xs", children: [settings, disclosure, popover] })));
  // Settings are for authors; a reader sees only the disclosure.
  const showSettings = () => {
    settings.hidden = !editable;
    popover.hidden = !editable;
    if (!editable) setSettingsOpen(false);
  };
  showSettings();

  const refresh = () => {
    if (editable === editor.isEditable) return;
    editable = editor.isEditable;
    showSettings();
    setExpanded(editable || Boolean(current.attrs.open));
  };
  // Navigation into a collapsed section waits for its panel to finish opening.
  const reveal = (event: Event) => {
    setExpanded(true);
    (event as CustomEvent<{ pending: Promise<void>[] }>).detail.pending.push(new Promise<void>((resolve) => requestAnimationFrame(() => resolve())).then(async () => {
      const panel = disclosure.querySelector<HTMLElement>(".panel");
      await Promise.all((panel?.getAnimations() ?? []).map((animation) => animation.finished.catch(() => {})));
    }));
  };
  dom.addEventListener("looma-editor-reveal", reveal);
  editor.on("update", refresh);
  return {
    dom, contentDOM,
    update(next) {
      if (next.type !== current.type) return false;
      const openChanged = next.attrs.open !== current.attrs.open;
      current = next;
      setExpanded(openChanged ? editor.isEditable || Boolean(next.attrs.open) : expanded);
      refresh();
      return true;
    },
    stopEvent: (event) => !contentDOM.contains(event.target as globalThis.Node),
    ignoreMutation: (mutation) => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
    destroy() { dom.removeEventListener("looma-editor-reveal", reveal); editor.off("update", refresh); },
  };
};
