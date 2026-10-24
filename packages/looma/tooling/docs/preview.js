/** An opaque sandbox cannot read its parent; it accepts only theme CSS from that parent. */
export function connect(host) {
  const document = host.element.ownerDocument;
  const view = document.defaultView;
  const theme = document.createElement('style');
  theme.dataset.loomaTheme = '';
  document.head.append(theme);
  const height = () => view.parent.postMessage({ type: 'looma-preview-height', height: Math.max(host.element.getBoundingClientRect().height, host.element.scrollHeight) }, '*');
  const receive = event => {
    if (event.source !== view.parent || event.data?.type !== 'looma-theme' || typeof event.data.css !== 'string') return;
    theme.textContent = event.data.css;
    height();
  };
  view.addEventListener('message', receive);
  const observer = new ResizeObserver(height);
  observer.observe(host.element);
  view.parent.postMessage({ type: 'looma-preview-ready' }, '*');
  height();
  return () => { observer.disconnect(); view.removeEventListener('message', receive); theme.remove(); };
}
