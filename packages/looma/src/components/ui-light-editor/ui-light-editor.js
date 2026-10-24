const coordinate = value => Number.isFinite(Number(value)) ? Math.round(Math.max(0, Math.min(1, Number(value))) * 100) / 100 : 0.5;

export function connect(host) {
  const { plane, source } = host.refs;
  let x = coordinate(host.props.x.value), y = coordinate(host.props.y.value), drag;
  const listeners = [];
  const listen = (element, type, fn) => { element.addEventListener(type, fn); listeners.push(() => element.removeEventListener(type, fn)); };
  const paint = () => {
    x = coordinate(x); y = coordinate(y);
    source.style.left = `${x * 100}%`; source.style.top = `${y * 100}%`;
    source.setAttribute('aria-description', `Horizontal ${Math.round(x * 100)} percent; vertical ${Math.round(y * 100)} percent.`);
    host.state.horizontal = String(Math.round(x * 100)); host.state.vertical = String(Math.round(y * 100));
  };
  const emit = type => host.dispatch(type, { x, y });
  listen(source, 'pointerdown', event => {
    if (host.props.disabled.value || event.button !== 0) return;
    event.preventDefault(); source.focus(); drag = event.pointerId; source.setPointerCapture(drag);
  });
  listen(source, 'pointermove', event => {
    if (drag !== event.pointerId || host.props.disabled.value) return;
    const rect = plane.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    x = (event.clientX - rect.left) / rect.width; y = (event.clientY - rect.top) / rect.height;
    paint(); emit('input');
  });
  const end = event => {
    if (drag !== event.pointerId) return;
    drag = undefined;
    if (source.hasPointerCapture(event.pointerId)) source.releasePointerCapture(event.pointerId);
    if (!host.props.disabled.value) emit('change');
  };
  listen(source, 'pointerup', end); listen(source, 'pointercancel', end); listen(source, 'lostpointercapture', end);
  listen(source, 'keydown', event => {
    if (host.props.disabled.value || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? .1 : .01;
    if (event.key === 'Home') { x = .5; y = 0; }
    else if (event.key === 'End') { x = .5; y = 1; }
    else if (event.key === 'ArrowLeft') x -= step;
    else if (event.key === 'ArrowRight') x += step;
    else if (event.key === 'ArrowUp') y -= step;
    else y += step;
    paint(); emit('input'); emit('change');
  });
  for (const field of host.element.querySelectorAll('[data-coordinate]')) for (const type of ['input','change']) {
    listen(field, type, event => {
      event.stopPropagation(); if (host.props.disabled.value) return;
      if (field.dataset.coordinate === 'x') x = parseFloat(event.detail.value) / 100;
      else y = parseFloat(event.detail.value) / 100;
      paint(); emit(type);
    });
  }
  const stop = host.effect(() => { x = coordinate(host.props.x.value); y = coordinate(host.props.y.value); paint(); });
  return () => { stop(); listeners.forEach(cleanup => cleanup()); if (drag !== undefined && source.hasPointerCapture(drag)) source.releasePointerCapture(drag); };
}
