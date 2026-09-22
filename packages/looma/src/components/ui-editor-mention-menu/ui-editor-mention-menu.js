import { normalizeAnchor, positionMenu } from "../shared/editor.js";

// Places the menu at the @ and derives its rows; the template renders them.
export default function controller(host) {
  const element = host.element;
  const place = () => {
    if (host.state.visible) positionMenu(element, normalizeAnchor(host.state.anchorRect), 320);
  };
  const stop = host.effect(() => {
    const items = (Array.isArray(host.state.items) ? host.state.items : []).slice(0, 20);
    host.state.rows = items.map((item) => ({ ...item, initials: item.initials ?? String(item.label).slice(0, 2).toUpperCase() }));
    host.state.searching = Boolean(host.state.loading && !items.length);
    host.state.active = Math.min(Number(host.state.selectedIndex ?? 0), Math.max(0, items.length - 1));
    host.state.prefix = element.id || "ui-editor-mention-menu";
    host.state.visible = Boolean(host.state.open && (host.state.loading || items.length > 0) && normalizeAnchor(host.state.anchorRect));
    if (items.length) element.setAttribute("aria-activedescendant", `${host.state.prefix}-option-${host.state.active}`);
    else element.removeAttribute("aria-activedescendant");
    place();
  });
  const indexOf = (event) => Number(event.target.closest?.("[data-index]")?.dataset.index);
  const onMousedown = (event) => event.preventDefault();
  const onClick = (event) => {
    const index = indexOf(event);
    if (Number.isFinite(index)) host.dispatch("select", { index });
  };
  const onMouseover = (event) => {
    const index = indexOf(event);
    if (!Number.isFinite(index) || index === host.state.active) return;
    host.state.active = index;
    element.setAttribute("aria-activedescendant", `${host.state.prefix}-option-${index}`);
    host.dispatch("highlight", { index });
  };
  element.addEventListener("mousedown", onMousedown);
  element.addEventListener("click", onClick);
  element.addEventListener("mouseover", onMouseover);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  window.visualViewport?.addEventListener("resize", place);
  window.visualViewport?.addEventListener("scroll", place);
  return () => {
    stop();
    element.removeEventListener("mousedown", onMousedown);
    element.removeEventListener("click", onClick);
    element.removeEventListener("mouseover", onMouseover);
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    window.visualViewport?.removeEventListener("resize", place);
    window.visualViewport?.removeEventListener("scroll", place);
  };
}
