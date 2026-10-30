import { createIdResolver } from "../shared/overlay.js";

/** Reveal the duplicate title at the sticky edge; scroll never drives animation progress. */
export function connect(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const view = document.defaultView;
  let observer = null;
  let heading = null;
  let bottom = -1;
  let frame = 0;
  let alive = true;
  const resolver = createIdResolver(document, () => sync());

  function sync() {
    if (!alive) return;
    const id = host.props.titleFor.value;
    const next = resolver.get(id);
    const edge = Math.max(0, element.getBoundingClientRect().bottom);
    if (next === heading && Math.abs(edge - bottom) < 0.5 && observer) return;
    observer?.disconnect();
    observer = null;
    heading = next;
    bottom = edge;
    if (!id || !heading || !view.IntersectionObserver) {
      host.state.titleOutOfView = Boolean(id);
      return;
    }
    observer = new view.IntersectionObserver(entries => {
      if (!alive) return;
      const entry = entries.at(-1);
      if (entry?.target !== heading) return;
      if (!heading?.isConnected) { sync(); return; }
      host.state.titleOutOfView = !entry.isIntersecting && entry.boundingClientRect.top < bottom;
    }, { rootMargin: `-${bottom}px 0px 0px 0px` });
    observer.observe(heading);
  }

  // Nested scrollports may move the bar before it becomes sticky. Rebuild its
  // observation boundary only when that edge changes, not for every scroll tick.
  const schedule = () => {
    if (frame || !host.props.titleFor.value) return;
    frame = view.requestAnimationFrame(() => { frame = 0; sync(); });
  };
  const resize = new view.ResizeObserver(schedule);
  resize.observe(element);
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  view.addEventListener("resize", schedule);
  const stop = host.effect(sync);
  return () => {
    alive = false;
    stop();
    resolver.stop();
    observer?.disconnect();
    resize.disconnect();
    if (frame) view.cancelAnimationFrame(frame);
    document.removeEventListener("scroll", schedule, true);
    view.removeEventListener("resize", schedule);
  };
}
