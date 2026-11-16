export default function setup(root) {
  const records = root.querySelector("[data-records]");
  const details = root.querySelector("[data-details]");
  const filter = root.querySelector("[data-filter]");
  const query = filter.querySelector('input[type="search"]');
  const status = filter.querySelector("[data-status]");
  const clear = root.querySelector("[data-clear]");
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
  const applyFilter = () => {
    const term = query.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const link of links) {
      const matches = link.textContent.toLocaleLowerCase().includes(term);
      link.hidden = !matches;
      if (matches) count++;
    }
    records.hidden = count === 0;
    clear.hidden = count !== 0;
    status.textContent = count === 0 ? "No matching reports." : count === 1 ? "1 report" : `${count} reports`;
  };
  const clearFilter = () => {
    query.value = "";
    applyFilter();
    query.focus();
  };

  sync();
  filter.hidden = false;
  applyFilter();
  records.addEventListener("click", onClick);
  query.addEventListener("input", applyFilter);
  clear.addEventListener("click", clearFilter);
  view.addEventListener("hashchange", sync);
  return () => {
    records.removeEventListener("click", onClick);
    query.removeEventListener("input", applyFilter);
    clear.removeEventListener("click", clearFilter);
    view.removeEventListener("hashchange", sync);
  };
}
