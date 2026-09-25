// While the table is wider than the root, or taller than a root of bounded height, the root scrolls
// it: it becomes a region a keyboard can focus and scroll with the arrow keys, named by the table's caption unless the author named it. When
// the table fits, the root is plain again, so it is not an empty stop in the tab order.
let captions = 0;

export default function controller(host) {
  const element = host.element;
  const authored = element.hasAttribute("tabindex") || element.hasAttribute("role");
  if (authored) return undefined;

  let labelled = false;
  const update = () => {
    const scrolls = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
    if (!scrolls) {
      element.removeAttribute("role");
      element.removeAttribute("tabindex");
      if (labelled) element.removeAttribute("aria-labelledby");
      labelled = false;
      return;
    }
    element.setAttribute("role", "region");
    element.setAttribute("tabindex", "0");
    const caption = element.querySelector(":scope > table > caption");
    if (caption && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby")) {
      caption.id ||= `ui-table-caption-${++captions}`;
      element.setAttribute("aria-labelledby", caption.id);
      labelled = true;
    }
  };

  const resize = new ResizeObserver(update);
  const observe = () => {
    resize.disconnect();
    resize.observe(element);
    for (const child of element.children) resize.observe(child);
  };
  // A table rendered or replaced later is observed too.
  const children = new MutationObserver(() => {
    observe();
    update();
  });
  children.observe(element, { childList: true });
  observe();
  update();
  return () => {
    resize.disconnect();
    children.disconnect();
  };
}
