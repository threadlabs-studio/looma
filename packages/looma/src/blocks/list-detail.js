export default function setup(root) {
  const records = root.querySelector("[data-records]");
  const details = root.querySelector("[data-details]");
  const links = Array.from(records.querySelectorAll("a"));
  const panels = new Map(Array.from(details.children, panel => [panel.getAttribute("aria-labelledby"), panel]));
  const initial = panels.keys().next().value;
  const show = (id, moveFocus) => {
    const selected = panels.get(id);
    if (!selected) return;
    for (const panel of panels.values()) panel.hidden = panel !== selected;
    for (const link of links) {
      if (link.hash === `#${id}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    if (moveFocus) selected.querySelector("h3").focus();
  };
  const view = root.ownerDocument.defaultView;
  const sync = () => {
    const fragment = view.location.hash.slice(1);
    show(panels.has(fragment) ? fragment : initial, false);
  };
  const onClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = event.target.closest("a");
    if (links.includes(link)) show(link.hash.slice(1), true);
  };
  show(initial, false);
  sync();
  records.addEventListener("click", onClick);
  view.addEventListener("hashchange", sync);
  return () => {
    records.removeEventListener("click", onClick);
    view.removeEventListener("hashchange", sync);
  };
}
