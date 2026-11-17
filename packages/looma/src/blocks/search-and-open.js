import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { deferredFocus } from "@threadlabs/looma/behaviors";

const guides = new Map([
  ["trail", ["Trail access", "Check the latest access notes before choosing a route."]],
  ["coast", ["Coastal conditions", "Check the tide window before descending to the shore."]],
  ["equipment", ["Equipment checklist", "Take a headlamp, a first-aid kit, and drinking water."]],
]);

export default function setup(root) {
  const trigger = root.querySelector("[data-trigger]");
  const shell = root.querySelector("[data-shell]");
  const query = root.querySelector("[data-query]");
  const status = root.querySelector("[data-status]");
  const heading = root.querySelector("[data-heading]");
  const title = root.querySelector("[data-title]");
  const detail = root.querySelector("[data-detail]");
  const focus = deferredFocus(root.ownerDocument.defaultView);
  const close = () => componentRegistry.update(shell, { open: false });
  const filter = () => {
    const term = query.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of shell.querySelectorAll("[data-guide]")) {
      row.hidden = !row.textContent.toLocaleLowerCase().includes(term);
      if (!row.hidden) visible++;
    }
    status.textContent = visible === 0 ? "No matching guides" : `${visible} guide${visible === 1 ? "" : "s"}`;
  };
  const open = () => {
    filter();
    componentRegistry.update(shell, { open: true });
  };
  const choose = (event) => {
    const row = event.target.closest("[data-guide]");
    if (!row || row.hidden) return;
    const guide = guides.get(row.dataset.guide);
    if (!guide) return;
    [title.textContent, detail.textContent] = guide;
    close();
    focus.schedule(() => heading.focus());
  };
  trigger.addEventListener("click", open);
  shell.addEventListener("close", close);
  shell.addEventListener("click", choose);
  query.addEventListener("input", filter);
  return () => {
    trigger.removeEventListener("click", open);
    shell.removeEventListener("close", close);
    shell.removeEventListener("click", choose);
    query.removeEventListener("input", filter);
    focus.cancel();
  };
}
