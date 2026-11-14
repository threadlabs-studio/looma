import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiAffordanceScope } from "@threadlabs/looma/vanilla/UiAffordanceScope.js";
import { createUiIcon } from "@threadlabs/looma/vanilla/UiIcon.js";
import { createUiIconButton } from "@threadlabs/looma/vanilla/UiIconButton.js";
import { createUiTooltip } from "@threadlabs/looma/vanilla/UiTooltip.js";
import { element } from "./node-views/element";

let sequence = 0;

/**
 * Copy affordance for an existing heading anchor.
 * @ownership The caller appends `dom` beside heading content and calls `destroy` on removal.
 * The current ID and page URL are read at activation, so edits and client navigation cannot leave a stale link.
 */
export function createHeadingLink(heading: HTMLElement): { dom: HTMLElement; destroy(): void } {
  const id = `looma-heading-link-${++sequence}`;
  const icon = element(createUiIcon({ name: "link", attributes: { "aria-hidden": "true" } }));
  const button = element(createUiIconButton({
    label: "Copy link", size: "sm", variant: "ghost", tone: "neutral", anticipatory: true,
    attributes: { id }, children: [icon],
  }));
  const label = heading.ownerDocument.createTextNode("Copy link");
  const tooltip = element(createUiTooltip({ for: id, children: [label], attributes: { "aria-live": "polite" } }));
  const dom = element(createUiAffordanceScope({ guide: "none", attributes: { contenteditable: "false", "data-looma-heading-link": "" }, children: [button, tooltip] }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  let copying = false;
  const reveal = () => componentRegistry.update(button, { revealed: true });
  const conceal = () => componentRegistry.update(button, { revealed: false });
  const feedback = (copied: boolean) => {
    const text = copied ? "Link copied" : "Could not copy link";
    label.textContent = text;
    componentRegistry.update(button, { label: text });
    componentRegistry.update(icon, { name: copied ? "check" : "link" });
    componentRegistry.update(tooltip, { open: true });
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = "Copy link";
      componentRegistry.update(button, { label: "Copy link" });
      componentRegistry.update(icon, { name: "link" });
      componentRegistry.update(tooltip, { open: false });
    }, 2000);
  };
  const copy = async (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (copying || !heading.id) return;
    copying = true;
    try {
      const url = new URL(heading.ownerDocument.defaultView!.location.href);
      url.hash = encodeURIComponent(heading.id);
      await heading.ownerDocument.defaultView!.navigator.clipboard.writeText(url.href);
      if (!destroyed) feedback(true);
    } catch {
      if (!destroyed) feedback(false);
    } finally { copying = false; }
  };
  const preserveSelection = (event: Event) => event.preventDefault();
  heading.addEventListener("pointerenter", reveal);
  heading.addEventListener("pointerleave", conceal);
  button.addEventListener("pointerdown", preserveSelection);
  button.addEventListener("click", copy);
  return { dom, destroy() {
    destroyed = true;
    clearTimeout(timer);
    heading.removeEventListener("pointerenter", reveal);
    heading.removeEventListener("pointerleave", conceal);
    button.removeEventListener("pointerdown", preserveSelection);
    button.removeEventListener("click", copy);
  } };
}
