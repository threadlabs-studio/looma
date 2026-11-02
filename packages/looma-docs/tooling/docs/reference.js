/** A deep link opens its containing tab through the tab's native, accessible activation. */
export function connect(host) {
  const root = host.element;
  const view = root.ownerDocument.defaultView;
  let currentHash = view.location.hash;
  const open = () => {
    let id;
    try { id = decodeURIComponent(currentHash.slice(1)); } catch { return; }
    const target = root.ownerDocument.getElementById(id);
    if (!target || !root.contains(target)) { observer.disconnect(); return; }
    const panel = target.closest('[role="tabpanel"]');
    const tab = panel && [...root.querySelectorAll('[role="tab"]')].find(button => button.getAttribute('aria-controls') === panel.id);
    if (!tab) return;
    if (panel.hidden) tab.click();
    if (!panel.hidden) { target.scrollIntoView({ block: 'start' }); observer.disconnect(); }
  };
  const observer = new MutationObserver(open);
  const activate = value => {
    currentHash = value;
    observer.disconnect();
    if (!currentHash) return;
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['role', 'id', 'hidden'] });
    open();
  };
  const hash = () => activate(view.location.hash);
  const click = event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.target && link.target !== '_self') return;
    const target = new URL(link.href, view.location.href);
    if (target.origin === view.location.origin && target.pathname === view.location.pathname && target.hash) activate(target.hash);
  };
  root.addEventListener('click', click);
  view.addEventListener('hashchange', hash); hash();
  return () => { observer.disconnect(); root.removeEventListener('click', click); view.removeEventListener('hashchange', hash); };
}
