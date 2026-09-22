// Hides avatars beyond `max`, counts them into the "+N" badge, and overlaps the rest. Projected
// avatars are component roots, which this component's styles do not reach, so the overlap is inline.
export default function controller(host) {
  const element = host.element;
  const update = () => {
    const max = Number(host.state.max);
    const visible = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0;
    const avatars = Array.from(element.children).filter((child) => child !== host.refs.overflow);
    avatars.forEach((avatar, index) => {
      avatar.style.display = index >= visible ? "none" : "";
      avatar.style.marginInlineStart = index === 0 ? "0px" : "-0.625rem";
      avatar.style.borderRadius = "999px";
      // Later avatars cast a soft shadow back onto the one they overlap; the first overlaps nothing.
      avatar.style.boxShadow = index === 0
        ? "0 0 0 1px rgb(0 0 0 / 0.06)"
        : "var(--ui-avatar-group-overlap-shadow, -2px 0 5px -1px rgb(0 0 0 / 0.28)), 0 0 0 1px rgb(0 0 0 / 0.06)";
    });
    host.state.overflowCount = Math.max(0, avatars.length - visible);
  };
  const observer = new MutationObserver(update);
  observer.observe(element, { childList: true });
  const stop = host.effect(update);
  return () => {
    stop();
    observer.disconnect();
  };
}
