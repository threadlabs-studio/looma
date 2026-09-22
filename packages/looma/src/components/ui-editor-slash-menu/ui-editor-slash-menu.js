import { normalizeAnchor, positionMenu } from "../shared/editor.js";

// Places the menu at the slash and tracks the highlighted item; the template renders the items.
export default function controller(host) {
  const element = host.element;
  const place = () => {
    if (host.state.visible) positionMenu(element, normalizeAnchor(host.state.anchorRect), 280);
  };
  const stop = host.effect(() => {
    const items = Array.isArray(host.state.items) ? host.state.items : [];
    host.state.active = Number(host.state.selectedIndex ?? 0);
    host.state.visible = Boolean(host.state.open && items.length > 0 && normalizeAnchor(host.state.anchorRect));
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
