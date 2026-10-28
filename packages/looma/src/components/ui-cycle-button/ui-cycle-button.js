/** Cycle an ordered choice without replacing its native button or moving focus. */
export function connect(host) {
  let external;
  const stop = host.effect(() => {
    const signature = JSON.stringify([host.props.items.value, host.props.index.value]);
    if (signature === external) return;
    external = signature;
    const items = host.props.items.value ?? [];
    const index = Math.trunc(Number(host.props.index.value));
    host.state.current = Number.isFinite(index) && index >= 0 && index < items.length ? index : 0;
  });
  const cycle = () => {
    const items = host.props.items.value ?? [];
    if (host.props.disabled.value || items.length < 2) return;
    host.state.current = (host.state.current + 1) % items.length;
    host.dispatch('change', { value: items[host.state.current].value, index: host.state.current });
  };
  host.element.addEventListener('click', cycle);
  return () => { stop(); host.element.removeEventListener('click', cycle); };
}
