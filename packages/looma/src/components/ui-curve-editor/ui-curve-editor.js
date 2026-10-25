import { curvePoints, curveText } from "./curve.js";

export function connect(host) {
  const { plot, first, second, firstLine, secondLine, curve, result } = host.refs;
  const fields = [...host.element.querySelectorAll("[data-curve-coordinate]")];
  let points = [.25, .1, .25, 1]; let external; let drag;
  const limit = () => { points = curvePoints(curveText(points)); };
  const paint = () => {
    limit();
    const x = index => points[index] * 100;
    const y = index => (2 - points[index]) / 3 * 100;
    for (const [index, handle] of [[0, first], [2, second]]) {
      handle.style.left = `${x(index)}%`; handle.style.top = `${y(index + 1)}%`;
      handle.setAttribute("aria-description", `X ${points[index]}, Y ${points[index + 1]}`);
    }
    firstLine.setAttribute("d", `M0 66.667 L${x(0)} ${y(1)}`);
    secondLine.setAttribute("d", `M100 33.333 L${x(2)} ${y(3)}`);
    curve.setAttribute("d", `M0 66.667 C${x(0)} ${y(1)} ${x(2)} ${y(3)} 100 33.333`);
    fields.forEach((field, index) => { host.state[`point${index}`] = String(points[index]); });
    result.value = curveText(points); result.textContent = curveText(points);
  };
  const emit = type => host.dispatch(type, { value: curveText(points) });
  const move = event => {
    if (!drag || event.pointerId !== drag.id || host.props.disabled.value) return;
    const rect = plot.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    points[drag.index] = (event.clientX - rect.left - drag.offsetX) / rect.width;
    points[drag.index + 1] = 2 - (event.clientY - rect.top - drag.offsetY) / rect.height * 3;
    paint(); emit("input");
  };
  const finish = event => {
    if (drag?.id !== event.pointerId) return;
    const start = drag; drag = undefined;
    if (start.handle.hasPointerCapture(start.id)) start.handle.releasePointerCapture(start.id);
    if (event.type !== 'pointerup' || host.props.disabled.value) { points = start.points; paint(); emit('input'); emit('cancel'); }
    else emit('change');
  };
  const cleanups = [];
  for (const [index, handle] of [[0, first], [2, second]]) {
    const down = event => { if (host.props.disabled.value || event.button !== 0) return; event.preventDefault(); handle.focus(); const rect = plot.getBoundingClientRect();
      drag = { id: event.pointerId, index, handle, points: [...points], offsetX: event.clientX - rect.left - points[index] * rect.width, offsetY: event.clientY - rect.top - (2 - points[index + 1]) / 3 * rect.height };
      handle.setPointerCapture(event.pointerId); };
    const key = event => {
      if (event.key === 'Escape' && drag) { event.preventDefault(); finish({ pointerId: drag.id, type: 'cancel' }); return; }
      if (host.props.disabled.value || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); const step = event.shiftKey ? .1 : .01;
      points[index + (event.key === "ArrowUp" || event.key === "ArrowDown" ? 1 : 0)] += (event.key === "ArrowLeft" || event.key === "ArrowDown" ? -step : step);
      paint(); emit("input"); emit("change");
    };
    for (const [type, callback] of [["pointerdown", down], ["pointermove", move], ["pointerup", finish], ["pointercancel", finish], ["lostpointercapture", finish], ["keydown", key]]) {
      handle.addEventListener(type, callback); cleanups.push(() => handle.removeEventListener(type, callback));
    }
  }
  fields.forEach((field, index) => {
    const edit = event => { event.stopPropagation(); if (host.props.disabled.value) return; points[index] = Number(event.detail.value); paint(); emit(event.type); };
    for (const type of ["input", "change"]) { field.addEventListener(type, edit); cleanups.push(() => field.removeEventListener(type, edit)); }
  });
  const stop = host.effect(() => { const value = host.props.value.value; if (value === external) return; external = value; try { points = curvePoints(value); } catch { /* Keep the last valid curve. */ } paint(); });
  return () => { stop(); cleanups.forEach(cleanup => cleanup()); if (drag?.handle.hasPointerCapture(drag.id)) drag.handle.releasePointerCapture(drag.id); };
}
