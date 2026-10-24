import { documentationTheme, themeEvent } from './theme-session.mjs';
/** Only theme data and measured height cross the opaque preview boundary. */
export function connect(host) {
  const frame = host.refs.frame;
  const width = host.refs.width;
  const remove = host.refs.remove;
  const removeCard = () => host.element.dispatchEvent(new CustomEvent("looma-example-remove", { bubbles: true, detail: { id: host.props.identity.value } }));
  const view = frame.ownerDocument.defaultView;
  let theme = documentationTheme(view)?.css ?? '';
  const documentTheme = () => { theme = documentationTheme(view)?.css ?? ''; send(); };
  const send = () => frame.contentWindow?.postMessage({ type: 'looma-theme', css: theme }, '*');
  const message = event => {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type === 'looma-preview-ready') send();
    if (event.data?.type === 'looma-preview-height' && Number.isFinite(event.data.height)) frame.height = String(Math.max(120, Math.min(2400, Math.ceil(event.data.height))));
  };
  const update = event => { theme = event.detail.css; send(); };
  const resize = event => {
    const value = Number(event.detail?.value ?? event.target.value);
    if (value >= 240 && value <= 1600) frame.width = String(value);
  };
  host.element.addEventListener('looma-theme-preview', update);
  width?.addEventListener('input', resize);
  remove?.addEventListener('click', removeCard);
  view.addEventListener('message', message);
  view.addEventListener(themeEvent, documentTheme);
  frame.addEventListener('load', send);
  return () => {
    host.element.removeEventListener('looma-theme-preview', update);
    width?.removeEventListener('input', resize);
    remove?.removeEventListener('click', removeCard);
    view.removeEventListener('message', message);
    view.removeEventListener(themeEvent, documentTheme);
    frame.removeEventListener('load', send);
  };
}
