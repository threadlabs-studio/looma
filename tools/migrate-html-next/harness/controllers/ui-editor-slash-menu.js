import { escapeHtml, icon, normalizeAnchor, viewport } from "./shared/editor.js";

export default function controller(host) {
  const element = host.element;
  let selectedIndex = Number(host.state.selectedIndex ?? 0);
  const position = () => {
    const rect = normalizeAnchor(host.state.anchorRect); if (!rect) { element.style.display = "none"; return; }
    const view = viewport(); element.style.display = "block"; element.style.position = "fixed"; element.style.zIndex = "500";
    if (window.innerWidth < 768) {
      const height = Math.min(320, Math.max(0, view.height - 56));
      Object.assign(element.style, { left: `${view.left}px`, right: "", bottom: "", top: `${view.top + view.height - height - 56}px`, width: `${view.width}px`, maxHeight: `${height}px` });
      return;
    }
    const below = view.bottom - rect.bottom - 8; const above = rect.top - view.top - 8;
    const top = below >= 320 || below >= above ? rect.bottom + 8 : rect.top - 328;
    const left = Math.max(view.left + 8, Math.min(rect.left, view.right - 288));
    Object.assign(element.style, { top: `${Math.max(view.top + 8, top)}px`, left: `${left}px`, right: "", bottom: "", width: "280px", maxHeight: "" });
  };
  const syncSelection = (ensureVisible = false) => {
    let selected;
    for (const option of element.querySelectorAll("[data-index]")) {
      const active = Number(option.dataset.index) === selectedIndex;
      option.classList.toggle("ui-editor-slash-menu__item--active", active); option.setAttribute("aria-selected", String(active));
      if (active) selected = option;
    }
    if (ensureVisible) selected?.scrollIntoView?.({ block: "nearest" });
  };
  const render = () => {
    selectedIndex = Number(host.state.selectedIndex ?? selectedIndex);
    const items = Array.isArray(host.state.items) ? host.state.items : [];
    const visible = host.state.open && items.length > 0 && normalizeAnchor(host.state.anchorRect);
    element.hidden = !visible; if (!visible) return; position();
    const query = String(host.state.query ?? "").trim();
    element.innerHTML = `<div class="ui-editor-slash-menu"><div class="ui-editor-slash-menu__header" aria-hidden="true"><span class="ui-editor-slash-menu__header-label">Insert</span>${query ? `<span class="ui-editor-slash-menu__header-query">${escapeHtml(query)}</span>` : ""}</div><ul class="ui-editor-slash-menu__list" role="presentation">${items.map((item, index) => `<li class="ui-editor-slash-menu__item${index === selectedIndex ? " ui-editor-slash-menu__item--active" : ""}" role="option" aria-selected="${index === selectedIndex}" data-index="${index}"><span class="ui-editor-slash-menu__icon" aria-hidden="true">${icon(item.icon)}</span><span class="ui-editor-slash-menu__body"><span class="ui-editor-slash-menu__title">${escapeHtml(item.title)}</span><span class="ui-editor-slash-menu__description">${escapeHtml(item.description)}</span></span></li>`).join("")}</ul><div class="ui-editor-slash-menu__footer" aria-hidden="true"><kbd>↑↓</kbd> navigate &nbsp;·&nbsp; <kbd>↵</kbd> insert &nbsp;·&nbsp; <kbd>Esc</kbd> close</div></div>`;
  };
  const onMousedown = (event) => event.preventDefault();
  const onClick = (event) => { const option = event.target.closest?.("[data-index]"); if (option) host.dispatch("looma-editor-slash-menu-select", { index: Number(option.dataset.index) }); };
  const onMouseover = (event) => { const option = event.target.closest?.("[data-index]"); const index = Number(option?.dataset.index); if (!Number.isFinite(index) || index === selectedIndex) return; selectedIndex = index; syncSelection(); host.dispatch("looma-editor-slash-menu-highlight", { index }); };
  const onViewport = () => { if (host.state.open) position(); };
  element.setAttribute("role", "listbox"); element.setAttribute("aria-label", "Insert block");
  element.addEventListener("mousedown", onMousedown); element.addEventListener("click", onClick); element.addEventListener("mouseover", onMouseover);
  window.addEventListener("resize", onViewport); window.addEventListener("scroll", onViewport, true); window.visualViewport?.addEventListener("resize", onViewport); window.visualViewport?.addEventListener("scroll", onViewport);
  const stop = host.effect(render); render();
  return () => { stop(); element.removeEventListener("mousedown", onMousedown); element.removeEventListener("click", onClick); element.removeEventListener("mouseover", onMouseover); window.removeEventListener("resize", onViewport); window.removeEventListener("scroll", onViewport, true); window.visualViewport?.removeEventListener("resize", onViewport); window.visualViewport?.removeEventListener("scroll", onViewport); };
}
