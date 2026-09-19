import { escapeHtml, normalizeAnchor, viewport } from "./shared/editor.js";

export default function controller(host) {
  const element = host.element;
  let selectedIndex = Number(host.state.selectedIndex ?? 0);
  const syncSelection = () => {
    const prefix = element.id || "ui-editor-mention-menu";
    for (const option of element.querySelectorAll("[data-index]")) {
      const active = Number(option.dataset.index) === selectedIndex;
      option.classList.toggle("ui-editor-mention-menu__item--active", active);
      option.setAttribute("aria-selected", String(active));
    }
    if (element.querySelector("[data-index]")) element.setAttribute("aria-activedescendant", `${prefix}-option-${selectedIndex}`);
  };
  const position = () => {
    const rect = normalizeAnchor(host.state.anchorRect); if (!rect) { element.style.display = "none"; return; }
    const view = viewport(); element.style.display = "block"; element.style.position = "fixed"; element.style.zIndex = "500";
    if (window.innerWidth < 768) {
      const height = Math.min(320, Math.max(0, view.height - 56));
      Object.assign(element.style, { left: `${view.left}px`, top: `${view.top + view.height - height - 56}px`, right: "", bottom: "", width: `${view.width}px`, maxHeight: `${height}px` }); return;
    }
    const below = view.bottom - rect.bottom - 8; const above = rect.top - view.top - 8;
    const top = below >= 320 || below >= above ? rect.bottom + 8 : rect.top - 328;
    const left = Math.max(view.left + 8, Math.min(rect.left, view.right - 328));
    Object.assign(element.style, { top: `${Math.max(view.top + 8, top)}px`, left: `${left}px`, right: "", bottom: "", width: "320px", maxHeight: "" });
  };
  const render = () => {
    const items = (Array.isArray(host.state.items) ? host.state.items : []).slice(0, 20);
    selectedIndex = Math.min(Number(host.state.selectedIndex ?? selectedIndex), Math.max(0, items.length - 1));
    const visible = host.state.open && (host.state.loading || items.length > 0) && normalizeAnchor(host.state.anchorRect);
    element.hidden = !visible; if (!visible) return; position();
    const prefix = element.id || "ui-editor-mention-menu"; const selectedId = `${prefix}-option-${selectedIndex}`;
    element.setAttribute("aria-busy", String(Boolean(host.state.loading)));
    if (items.length) element.setAttribute("aria-activedescendant", selectedId); else element.removeAttribute("aria-activedescendant");
    const rows = items.map((item, index) => `<li id="${prefix}-option-${index}" class="ui-editor-mention-menu__item${index === selectedIndex ? " ui-editor-mention-menu__item--active" : ""}" role="option" aria-selected="${index === selectedIndex}" data-index="${index}"><span class="ui-editor-mention-menu__avatar" aria-hidden="true">${escapeHtml(item.initials ?? String(item.label).slice(0, 2).toUpperCase())}</span><span class="ui-editor-mention-menu__body"><span class="ui-editor-mention-menu__label">${escapeHtml(item.label)}</span>${item.detail ? `<span class="ui-editor-mention-menu__detail">${escapeHtml(item.detail)}</span>` : ""}</span></li>`).join("");
    element.innerHTML = `<div class="ui-editor-mention-menu"><div class="ui-editor-mention-menu__header"><span>People</span><span class="ui-editor-mention-menu__hint">Type after @ to search</span></div>${host.state.loading && !items.length ? '<div class="ui-editor-mention-menu__loading" role="status">Searching…</div>' : `<ul class="ui-editor-mention-menu__list" role="presentation">${rows}</ul>`}</div>`;
  };
  const onMousedown = (event) => event.preventDefault();
  const onClick = (event) => { const option = event.target.closest?.("[data-index]"); if (option) host.dispatch("looma-editor-mention-menu-select", { index: Number(option.dataset.index) }); };
  const onMouseover = (event) => { const option = event.target.closest?.("[data-index]"); const index = Number(option?.dataset.index); if (!Number.isFinite(index) || index === selectedIndex) return; selectedIndex = index; syncSelection(); host.dispatch("looma-editor-mention-menu-highlight", { index }); };
  const onViewport = () => { if (host.state.open) position(); };
  element.setAttribute("role", "listbox"); element.setAttribute("aria-label", "Mention a person");
  element.addEventListener("mousedown", onMousedown); element.addEventListener("click", onClick); element.addEventListener("mouseover", onMouseover); window.addEventListener("resize", onViewport); window.addEventListener("scroll", onViewport, true); window.visualViewport?.addEventListener("resize", onViewport); window.visualViewport?.addEventListener("scroll", onViewport);
  const stop = host.effect(render); render();
  return () => { stop(); element.removeEventListener("mousedown", onMousedown); element.removeEventListener("click", onClick); element.removeEventListener("mouseover", onMouseover); window.removeEventListener("resize", onViewport); window.removeEventListener("scroll", onViewport, true); window.visualViewport?.removeEventListener("resize", onViewport); window.visualViewport?.removeEventListener("scroll", onViewport); };
}
