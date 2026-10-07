import { createViewportSurface } from "../shared/overlay.js";
import { normalizeAnchor, positionMenu } from "../shared/editor.js";

// Places the menu at the slash and tracks the highlighted item; the template renders the items.
function connect(host) {
  const element = host.element;
  const authoredLabel = element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby");
  const place = () => {
    if (host.state.visible) positionMenu(element, normalizeAnchor(host.props.anchorRect.value), 280);
  };
  const surface = createViewportSurface(element, { position: place });
  const options = () => Array.from(element.querySelectorAll('[role="option"]'));
  const syncOptions = () => {
    const query = String(host.props.query.value || "").trim().toLocaleLowerCase();
    const generated = host.state.rows.length > 0;
    for (const row of options()) {
      if (generated) break;
      const title = row.querySelector(".title")?.textContent ?? row.textContent ?? "";
      const terms = `${title} ${row.dataset.keywords ?? ""}`.toLocaleLowerCase();
      row.hidden = Boolean(query && !terms.includes(query));
    }
    for (const group of element.querySelectorAll('[role="group"]')) {
      group.closest('[role="presentation"]')?.toggleAttribute("hidden", !group.querySelector('[role="option"]:not([hidden])'));
    }
    const rows = options().filter((row) => !row.hidden && !row.closest('[role="presentation"][hidden]')
      && row.getAttribute("aria-disabled") !== "true");
    const active = Math.min(Math.max(0, Number(host.state.active) || 0), Math.max(0, rows.length - 1));
    rows.forEach((row, index) => {
      row.dataset.index = String(index);
      row.setAttribute("aria-selected", String(index === active));
    });
    host.refs.empty.hidden = rows.length > 0;
    const visible = Boolean(host.props.open.value && normalizeAnchor(host.props.anchorRect.value)
      && (rows.length > 0 || host.refs.empty.children.length));
    if (host.state.visible !== visible) host.state.visible = visible;
    if (visible) surface.show();
    else surface.hide();
  };
  const stop = host.effect(() => {
    const items = Array.isArray(host.props.items.value) ? host.props.items.value : [];
    if (!authoredLabel) element.setAttribute("aria-label", String(host.props.label.value || "Insert block"));
    host.state.rows = items.map((item) => ({ ...item, value: String(item.value ?? item.title) }));
    host.state.active = Number(host.props.selectedIndex.value ?? 0);
    queueMicrotask(syncOptions);
  });
  const rowOf = (event) => event.target.closest?.('[role="option"]');
  const onMousedown = (event) => event.preventDefault();
  const onClick = (event) => {
    const row = rowOf(event);
    if (row && !row.hidden && row.getAttribute("aria-disabled") !== "true") host.dispatch("select", { index: Number(row.dataset.index), value: row.dataset.value ?? "" });
  };
  const onMouseover = (event) => {
    const row = rowOf(event);
    if (!row || row.hidden || row.getAttribute("aria-disabled") === "true") return;
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
