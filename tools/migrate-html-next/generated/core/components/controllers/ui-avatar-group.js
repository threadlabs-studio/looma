// HTML Next controller for ui-avatar-group, ported from the Stencil component. Hides avatars beyond
// `max` and renders the "+N" overflow badge; recomputes on prop change and when children change.

export default function controller(host) {
  const el = host.element;
  const limit = () => {
    const m = Number(host.state.max);
    return Number.isFinite(m) ? Math.max(0, Math.floor(m)) : 0;
  };

  const update = () => {
    // Nested components may be lowered between observer turns. Querying the
    // current direct element children avoids retaining a transient collection
    // while those invocation nodes are replaced with their native roots.
    const children = Array.from(
      el.querySelectorAll(":scope > :not([data-ui-avatar-group-overflow])")
    );
    const visible = limit();
    // inline style wins over the child component's own display rule (the original used !important)
    children.forEach((c, i) => { c.style.display = i >= visible ? "none" : ""; });
    const overflow = children.length > visible ? children.length - visible : 0;

    let badge = el.querySelector("[data-ui-avatar-group-overflow]");
    if (overflow > 0) {
      if (badge === null) {
        badge = el.ownerDocument.createElement("span");
        badge.className = "overflow";
        badge.setAttribute("role", "img");
        badge.setAttribute("data-ui-avatar-group-overflow", "");
        el.appendChild(badge);
      }
      badge.textContent = `+${overflow}`;
      badge.setAttribute("aria-label", `${overflow} more ${overflow === 1 ? "person" : "people"}`);
    } else if (badge !== null) {
      badge.remove();
    }
  };

  const observer = new MutationObserver(update);
  observer.observe(el, { childList: true });
  const stop = host.effect(update);
  update();

  return () => { stop?.(); observer.disconnect(); };
}
