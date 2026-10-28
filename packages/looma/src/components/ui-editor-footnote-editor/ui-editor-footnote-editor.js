export function connect(host) {
  const element = host.element;
  const onInput = event => {
    if (event.target.matches?.('[data-footnote-note]')) host.dispatch('text', { text: event.target.value });
  };
  const onKeyDown = event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault(); event.stopPropagation();
    host.dispatch('done', {});
  };
  element.addEventListener('input', onInput);
  element.addEventListener('keydown', onKeyDown);
  return () => {
    element.removeEventListener('input', onInput);
    element.removeEventListener('keydown', onKeyDown);
  };
}
