function distance(point, rect) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

export default function controller(host) {
  const element = host.element;
  const owner = element.ownerDocument.defaultView;
  let anchors = [];
  let frame = null;
  let point = null;
  let dirty = false;
  let nearRadius = Number(host.state.nearRadius ?? 16);
  const clear = () => {
    for (const anchor of anchors) anchor.element.removeAttribute("data-ui-proximity");
    element.removeAttribute("data-ui-interaction");
  };
  const measure = () => {
    anchors = Array.from(element.querySelectorAll("[data-ui-affordance]"))
      .filter((anchor) => !anchor.hasAttribute("disabled") && anchor.getAttribute("aria-disabled") !== "true")
      .map((anchor) => ({ element: anchor, rect: anchor.getBoundingClientRect() }));
    dirty = false;
  };
  const update = () => {
    frame = null;
    if (dirty) measure();
    if (!point) {
      clear();
      return;
    }
    let engaged = false;
    for (const anchor of anchors) {
      const near = distance(point, anchor.rect) <= nearRadius;
      anchor.element.toggleAttribute("data-ui-proximity", near);
      if (near) anchor.element.setAttribute("data-ui-proximity", "near");
      engaged ||= near;
    }
    if (engaged) element.setAttribute("data-ui-interaction", "engaged");
    else element.removeAttribute("data-ui-interaction");
  };
  const schedule = () => {
    if (frame === null) frame = owner.requestAnimationFrame(update);
  };
  const invalidate = () => {
    dirty = true;
    schedule();
  };
  const onPointermove = (event) => {
    point = event.pointerType === "touch" ? null : { x: event.clientX, y: event.clientY };
    schedule();
  };
  const observer = new MutationObserver(invalidate);
  observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ui-affordance", "disabled", "aria-disabled"] });
  element.addEventListener("pointermove", onPointermove, { passive: true });
  owner.addEventListener("resize", invalidate, { passive: true });
  owner.addEventListener("scroll", invalidate, { passive: true, capture: true });
  owner.visualViewport?.addEventListener("resize", invalidate, { passive: true });
  owner.visualViewport?.addEventListener("scroll", invalidate, { passive: true });
  const stop = host.effect(() => {
    const configured = Number(host.state.nearRadius ?? 16);
    nearRadius = Number.isFinite(configured) ? Math.max(0, configured) : 16;
    invalidate();
  });
  measure();
  return () => {
    stop();
    observer.disconnect();
    element.removeEventListener("pointermove", onPointermove);
    owner.removeEventListener("resize", invalidate);
    owner.removeEventListener("scroll", invalidate, true);
    owner.visualViewport?.removeEventListener("resize", invalidate);
    owner.visualViewport?.removeEventListener("scroll", invalidate);
    if (frame !== null) owner.cancelAnimationFrame(frame);
    clear();
  };
}
