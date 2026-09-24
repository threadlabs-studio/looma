// Tracks whether the toolbar's row hides controls past either edge, so the stylesheet can fade that
// edge and only that edge. A row that fits shows no fade at all.
export default function controller(host) {
  const strip = host.refs.strip;
  const update = () => {
    const hidden = strip.scrollWidth - strip.clientWidth;
    // Right-to-left rows scroll from 0 into negative values; measure from the start either way.
    const scrolled = Math.abs(strip.scrollLeft);
    host.state.overflowStart = hidden > 1 && scrolled > 1;
    host.state.overflowEnd = hidden > 1 && scrolled < hidden - 1;
  };
  strip.addEventListener("scroll", update, { passive: true });
  const resize = new ResizeObserver(update);
  resize.observe(strip);
  // Controls arriving, leaving, or changing size change the row's width without resizing the strip.
  const content = new MutationObserver(update);
  content.observe(strip, { childList: true, subtree: true, attributes: true });
  update();
  return () => {
    strip.removeEventListener("scroll", update);
    resize.disconnect();
    content.disconnect();
  };
}
