import { createViewportSurface } from "../shared/overlay.js";
import { normalizeAnchor, positionMenu } from "../shared/editor.js";

// Places the menu at the @ and derives its rows; the template renders them.
function connect(host) {
  const element = host.element;
  const authoredLabel = element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby");
  const place = () => {
    if (host.state.visible) positionMenu(element, normalizeAnchor(host.props.anchorRect.value), 320);
  };
  const surface = createViewportSurface(element, { position: place });
  const options = () => Array.from(element.querySelectorAll('[role="option"]'));
  const syncOptions = () => {
    const rows = options();
    const active = Math.min(Math.max(0, host.state.active), Math.max(0, rows.length - 1));
    rows.forEach((row, index) => {
      row.dataset.index = String(index);
      row.id = `${host.state.prefix}-option-${index}`;
      row.setAttribute("aria-selected", String(index === active));
    });
    if (rows.length) element.setAttribute("aria-activedescendant", rows[active].id);
    else element.removeAttribute("aria-activedescendant");
    const empty = Boolean(host.refs.empty.children.length);
    host.refs.empty.hidden = rows.length > 0 || host.props.loading.value;
    const visible = Boolean(host.props.open.value && normalizeAnchor(host.props.anchorRect.value)
      && (host.props.loading.value || rows.length > 0 || empty));
    if (host.state.visible !== visible) host.state.visible = visible;
    if (visible) surface.show();
    else surface.hide();
  };
  const stop = host.effect(() => {
    if (!authoredLabel) element.setAttribute("aria-label", String(host.props.label.value || "Mentions"));
    const items = (Array.isArray(host.props.items.value) ? host.props.items.value : []).slice(0, 20);
    host.state.rows = items.map((item) => ({ ...item, initials: item.initials ?? String(item.label).slice(0, 2).toUpperCase() }));
    host.state.searching = Boolean(host.props.loading.value && !items.length);
    host.state.active = Math.min(Number(host.props.selectedIndex.value ?? 0), Math.max(0, items.length - 1));
    host.state.prefix = element.id || "ui-editor-mention-menu";
    queueMicrotask(syncOptions);
  });
  const rowOf = (event) => event.target.closest?.('[role="option"]');
  const onMousedown = (event) => event.preventDefault();
  const onClick = (event) => {
    const row = rowOf(event);
    if (row) host.dispatch("select", { index: Number(row.dataset.index), value: row.dataset.value ?? "" });
  };
  const onMouseover = (event) => {
    const row = rowOf(event);
    if (!row) return;
    const index = Number(row.dataset.index);
    if (index === host.state.active) return;
    host.state.active = index;
    syncOptions();
    host.dispatch("highlight", { index, value: row.dataset.value ?? "" });
  };
  const observer = new MutationObserver(syncOptions);
  observer.observe(element, { childList: true, subtree: true });
  element.addEventListener("mousedown", onMousedown);
  element.addEventListener("click", onClick);
  element.addEventListener("mouseover", onMouseover);
  return () => {
    stop();
    surface.destroy();
    observer.disconnect();
    element.removeEventListener("mousedown", onMousedown);
    element.removeEventListener("click", onClick);
    element.removeEventListener("mouseover", onMouseover);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
