/** Bound a wrapping group by complete rows while preserving its overflow action. */
export function connect(host) {
  const element = host.element;
  const view = element.ownerDocument.defaultView;
  const overflow = host.refs.overflow;
  const trailing = host.refs.trailing;
  const collapsed = new Set();
  const observed = new Set();
  let limit = 0;
  let frame = 0;
  let count = 0;
  let alive = true;

  function report(next) {
    overflow.hidden = next === 0;
    host.state.overflowCount = next;
    if (next !== count) host.dispatch('overflow-change', { count: next });
    count = next;
  }

  function restore() {
    for (const item of collapsed) item.removeAttribute('hidden');
    collapsed.clear();
  }

  function rows(items) {
    let total = 0;
    let end = -Infinity;
    for (const item of items) {
      const box = item.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (box.top >= end - 0.5) total++;
      end = Math.max(end, box.bottom);
    }
    return total;
  }

  function measure() {
    frame = 0;
    if (!alive || !limit) return;
    const active = element.ownerDocument.activeElement;
    restore();
    overflow.hidden = true;
    const items = Array.from(element.children).filter(item => item !== overflow && item !== trailing && !item.hasAttribute('hidden'));
    for (const item of observed) if (!items.includes(item)) { resize.unobserve(item); observed.delete(item); }
    for (const item of items) if (!observed.has(item)) { resize.observe(item); observed.add(item); }
    if (!element.clientWidth || !overflow.childElementCount || getComputedStyle(element).flexWrap === 'nowrap'
      || rows([...items, trailing]) <= limit) { report(0); return; }

    // Measure the real overflow/trailing controls in the final row, rather than clipping a partial item.
    overflow.hidden = false;
    const showPrefix = count => {
      for (const [index, item] of items.entries()) {
        item.toggleAttribute('hidden', index >= count);
        if (index >= count) collapsed.add(item);
        else collapsed.delete(item);
      }
    };
    let visible = 0;
    let upper = items.length;
    while (visible < upper) {
      const candidate = Math.ceil((visible + upper) / 2);
      showPrefix(candidate);
      if (rows([...items.slice(0, candidate), overflow, trailing]) <= limit) visible = candidate;
      else upper = candidate - 1;
    }
    showPrefix(visible);
    report(items.length - visible);
    if (active && Array.from(collapsed).some(item => item.contains(active))) {
      overflow.querySelector('button, a[href], input, [tabindex="0"]')?.focus({ preventScroll: true });
    }
  }

  const schedule = () => {
    if (alive && limit && !frame) frame = view.requestAnimationFrame(measure);
  };
  let resize;
  let changes;
  const stop = host.effect(() => {
    const requested = Number(host.props.maxRows.value);
    host.props.wrap.value;
    limit = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
    resize?.disconnect();
    observed.clear();
    changes?.disconnect();
    element.ownerDocument.fonts?.removeEventListener('loadingdone', schedule);
    if (limit) {
      resize ??= new view.ResizeObserver(schedule);
      changes ??= new view.MutationObserver(schedule);
      resize.observe(element);
      resize.observe(overflow);
      resize.observe(trailing);
      changes.observe(element, { childList: true, subtree: true, characterData: true });
      element.ownerDocument.fonts?.addEventListener('loadingdone', schedule);
      schedule();
    } else { restore(); report(0); }
  });
  return () => {
    alive = false;
    stop();
    resize?.disconnect();
    changes?.disconnect();
    element.ownerDocument.fonts?.removeEventListener('loadingdone', schedule);
    if (frame) view.cancelAnimationFrame(frame);
    restore();
  };
}
