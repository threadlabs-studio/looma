import { observeOverlayViewport } from "../shared/overlay.js";

function distance(point, rect) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

function connect(host) {
  const element = host.element;
  const owner = element.ownerDocument.defaultView;
  let anchors = [];
  let frame = null;
  let point = null;
  let dirty = false;
  let nearRadius = Number(host.props.nearRadius.value ?? 16);
  const clear = () => {
    for (const anchor of anchors) anchor.element.removeAttribute("data-ui-proximity");
    host.state.engaged = false;
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
    host.state.engaged = engaged;
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
  element.ownerDocument.addEventListener("pointermove", onPointermove, { passive: true });
  const stopViewport = observeOverlayViewport(element.ownerDocument, invalidate);
  const stop = host.effect(() => {
    const configured = Number(host.props.nearRadius.value ?? 16);
    nearRadius = Number.isFinite(configured) ? Math.max(0, configured) : 16;
    invalidate();
  });
  measure();
  return () => {
    stop();
    stopViewport();
    observer.disconnect();
    element.ownerDocument.removeEventListener("pointermove", onPointermove);
    if (frame !== null) owner.cancelAnimationFrame(frame);
    clear();
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
