/** Owns transient resize geometry; consumers own persistence and selection.
 * @lifecycle Pointer capture ends on release, Escape, cancellation, or teardown.
 * Only release commits a drag, so consumers can make it one undo operation.
 */
function connect(host) {
  const root = host.element;
  const frame = host.refs.frame;
  const document = root.ownerDocument;
  let drag = null;
  const image = () => frame.querySelector("img");
  const enabled = () => host.props.selected.value && host.props.resizable.value;
  const measure = () => {
    const media = image();
    const rect = media.getBoundingClientRect();
    return { width: rect.width, height: rect.height, ratio: (media.naturalHeight || rect.height || 1) / (media.naturalWidth || rect.width || 1) };
  };
  const dimensions = (width, ratio) => {
    // The containing document bounds the media even when this figure floats.
    const container = root.parentElement;
    const style = document.defaultView.getComputedStyle(container);
    const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const gap = parseFloat(document.defaultView.getComputedStyle(root).paddingLeft) + parseFloat(document.defaultView.getComputedStyle(root).paddingRight);
    const maximum = Math.max(1, available - gap);
    const next = Math.round(Math.min(maximum, Math.max(Math.min(32, maximum), width)));
    return { width: next, height: Math.max(1, Math.round(next * ratio)) };
  };
  const restore = () => {
    root.removeAttribute("data-resizing");
    const width = host.props.width.value;
    if (width > 0) root.style.setProperty("--_ui-image-width", `${width}px`);
    else root.style.removeProperty("--_ui-image-width");
  };
  const dispatch = (size, phase, trigger) => host.dispatch("resize", { ...size, phase, trigger });
  const finish = (phase) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    document.removeEventListener("keydown", onEscape, true);
    if (current.handle.hasPointerCapture(current.pointer)) current.handle.releasePointerCapture(current.pointer);
    if (phase === "commit" && !current.moved) phase = "cancel";
    restore();
    dispatch(phase === "commit" ? current.size : { width: Math.round(current.width), height: Math.round(current.height) }, phase, "pointer");
  };
  const onDown = (event) => {
    const handle = event.target.closest("[data-corner]");
    if (!enabled() || !handle || !root.contains(handle) || event.button !== 0 || drag) return;
    event.preventDefault();
    const measured = measure();
    drag = { ...measured, x: event.clientX, y: event.clientY, handle, pointer: event.pointerId, size: dimensions(measured.width, measured.ratio) };
    handle.setPointerCapture(event.pointerId);
    document.addEventListener("keydown", onEscape, true);
    root.setAttribute("data-resizing", "");
  };
  const onMove = (event) => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const corner = drag.handle.dataset.corner;
    const dx = (event.clientX - drag.x) * (corner.endsWith("left") ? -1 : 1);
    const dy = (event.clientY - drag.y) * (corner.startsWith("top") ? -1 : 1);
    // Project onto the aspect-ratio diagonal: either axis can drive a corner.
    const delta = (dx + drag.ratio * dy) / (1 + drag.ratio * drag.ratio);
    drag.size = dimensions(drag.width + delta, drag.ratio);
    drag.moved = drag.size.width !== Math.round(drag.width);
    root.style.setProperty("--_ui-image-width", `${drag.size.width}px`);
    dispatch(drag.size, "preview", "pointer");
  };
  const onUp = event => { if (drag?.pointer === event.pointerId) finish("commit"); };
  const onCancel = event => { if (drag?.pointer === event.pointerId) finish("cancel"); };
  const onEscape = (event) => {
    if (event.key !== "Escape" || !drag) return;
    event.preventDefault(); event.stopPropagation(); finish("cancel");
  };
  const onKey = (event) => {
    const handle = event.target.closest?.("[data-corner]");
    if (!enabled() || !handle || !root.contains(handle) || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const measured = measure();
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const backwards = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const reverse = horizontal ? handle.dataset.corner.endsWith("left") : handle.dataset.corner.startsWith("top");
    const amount = (backwards !== reverse ? -1 : 1) * (event.shiftKey ? 32 : 8);
    dispatch(dimensions(measured.width + amount / (horizontal ? 1 : measured.ratio), measured.ratio), "commit", "keyboard");
  };
  const stop = host.effect(() => {
    // Read all external geometry before deciding whether to abandon a preview.
    host.props.width.value; host.props.height.value; host.props.placement.value;
    if (drag) finish("cancel");
    restore();
    enabled();
  });
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  root.addEventListener("lostpointercapture", onCancel);
  root.addEventListener("keydown", onKey);
  return () => {
    stop();
    if (drag) { const active = drag; drag = null; if (active.handle.hasPointerCapture(active.pointer)) active.handle.releasePointerCapture(active.pointer); }
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onCancel);
    root.removeEventListener("lostpointercapture", onCancel);
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onEscape, true);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
