// Hides avatars beyond `max`, counts them into the "+N" badge, and overlaps the rest. Projected
// avatars are component roots, which this component's styles do not reach, so the overlap is inline.
export default function controller(host) {
  const element = host.element;
  const update = () => {
    const max = Number(host.state.max);
    const visible = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0;
    const avatars = Array.from(element.children).filter((child) => child !== host.refs.overflow);
    // Small avatars overlap less, so their initials stay clear of the next one.
    const overlap = host.state.size === "sm" ? "-0.25rem" : "-0.5rem";
    avatars.forEach((avatar, index) => {
      avatar.style.display = index >= visible ? "none" : "";
      avatar.style.marginInlineStart = index === 0 ? "0px" : overlap;
      avatar.style.borderRadius = "999px";
      // Later avatars cast a crisp shadow back onto the one they overlap; the first overlaps nothing.
      avatar.style.boxShadow = index === 0
        ? "var(--ui-avatar-group-edge-ring, var(--_edge-ring))"
        : "var(--ui-avatar-group-overlap-shadow, var(--_overlap-shadow)), var(--ui-avatar-group-edge-ring, var(--_edge-ring))";
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
