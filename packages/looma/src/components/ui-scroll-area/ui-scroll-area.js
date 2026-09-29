export default function controller(host) {
  const area = host.element;
  let frame = 0;

  const update = () => {
    frame = 0;
    const horizontal = host.state.orientation === "horizontal";
    const extent = horizontal ? area.scrollWidth - area.clientWidth : area.scrollHeight - area.clientHeight;
    const rtl = horizontal && getComputedStyle(area).direction === "rtl";
    const position = horizontal ? (rtl ? -area.scrollLeft : area.scrollLeft) : area.scrollTop;
    const start = Math.max(0, position);
    const end = Math.max(0, extent - position);
    area.style.setProperty("--_ui-scroll-fade-start", `min(var(--_ui-scroll-fade-size), ${start}px)`);
    area.style.setProperty("--_ui-scroll-fade-end", `min(var(--_ui-scroll-fade-size), ${end}px)`);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(area);
  observer.observe(host.refs.content);
  area.addEventListener("scroll", schedule, { passive: true });
  const stop = host.effect(schedule);
  schedule();

  return () => {
    stop();
    observer.disconnect();
    area.removeEventListener("scroll", schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
