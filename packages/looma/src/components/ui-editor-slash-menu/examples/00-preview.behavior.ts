import { componentRegistry } from "@nextwebwg/html-next/runtime";

/** The host owns keyboard selection and dismissal for editor suggestion surfaces. */
export function openPicker(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLElement>("[data-demo-trigger]");
  const surface = root.querySelector<HTMLElement>("[data-demo-surface]");
  if (!trigger || !surface) return () => {};
  let open = false, selectedIndex = 0, frame = 0;
  const options = () => [...surface.querySelectorAll<HTMLElement>('[role="option"]')].filter(option => !option.hidden && option.getAttribute("aria-disabled") !== "true");
  const select = (index: number) => {
    const rows = options();
    selectedIndex = rows.length ? (index + rows.length) % rows.length : 0;
    componentRegistry.update(surface, { selectedIndex });
    const active = rows[selectedIndex];
    if (active?.id) surface.setAttribute("aria-activedescendant", active.id);
  };
  const close = () => {
    open = false;
    cancelAnimationFrame(frame);
    componentRegistry.update(surface, { open: false });
    trigger.setAttribute("aria-expanded", "false");
  };
  const commit = () => { close(); trigger.focus(); };
  const toggle = () => {
    if (open) { close(); return; }
    open = true; selectedIndex = 0;
    componentRegistry.update(surface, { open: true, selectedIndex, anchorRect: trigger.getBoundingClientRect().toJSON() });
    trigger.setAttribute("aria-expanded", "true");
    frame = requestAnimationFrame(() => { select(0); surface.focus(); });
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); toggle(); }
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); commit(); }
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); select(selectedIndex + (event.key === "ArrowDown" ? 1 : -1)); }
    else if (event.key === "Enter") { event.preventDefault(); options()[selectedIndex]?.click(); }
  };
  const highlight = (event: Event) => select((event as CustomEvent<{ index: number }>).detail.index);
  const reposition = () => { if (open) componentRegistry.update(surface, { anchorRect: trigger.getBoundingClientRect().toJSON() }); };
  const view = root.ownerDocument.defaultView;
  const outside = (event: PointerEvent) => { if (open && !surface.contains(event.target as Node) && !trigger.contains(event.target as Node)) close(); };
  trigger.addEventListener("click", toggle);
  root.addEventListener("keydown", keyboard);
  surface.addEventListener("select", commit);
  surface.addEventListener("highlight", highlight);
  view?.addEventListener("scroll", reposition, { capture: true, passive: true });
  view?.addEventListener("resize", reposition);
  root.ownerDocument.addEventListener("pointerdown", outside);
  return () => {
    cancelAnimationFrame(frame);
    trigger.removeEventListener("click", toggle);
    root.removeEventListener("keydown", keyboard);
    surface.removeEventListener("select", commit);
    surface.removeEventListener("highlight", highlight);
    view?.removeEventListener("scroll", reposition, true);
    view?.removeEventListener("resize", reposition);
    root.ownerDocument.removeEventListener("pointerdown", outside);
  };
}

export default openPicker;
