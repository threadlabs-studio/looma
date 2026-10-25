/**
 * Keep one viewport gradient aligned through mounting, scrolling and transformed surfaces.
 * @lifecycle CSS owns motion preferences; geometry tracking stops with the animation or disconnect.
 */
export function connect(host) {
  const element = host.element;
  const view = element.ownerDocument.defaultView;
  let motion;
  let frame = 0;
  let previousPosition = "";
  let previousScale = "";
  const trackPosition = () => {
    frame = 0;
    if (motion?.playState !== "running") return;
    const bounds = element.getBoundingClientRect();
    const width = parseFloat(view.getComputedStyle(element).width);
    const scale = bounds.width > 0 && width > 0 ? bounds.width / width : 1;
    const position = `${bounds.left / scale}px`;
    const scaleValue = String(scale);
    if (position !== previousPosition) {
      element.style.setProperty("--_ui-skeleton-viewport-x", position);
      previousPosition = position;
    }
    if (scaleValue !== previousScale) {
      element.style.setProperty("--_ui-skeleton-viewport-scale", scaleValue);
      previousScale = scaleValue;
    }
    frame = view.requestAnimationFrame(trackPosition);
  };
  const synchronize = () => {
    const names = view.getComputedStyle(element, "::before").animationName.split(",").map(name => name.trim());
    for (const animation of element.getAnimations({ subtree: true })) {
      if (names.includes(animation.animationName)) {
        motion = animation;
        motion.startTime = 0;
      }
    }
    if (!frame) trackPosition();
  };
  element.addEventListener("animationstart", synchronize);
  synchronize();
  return () => {
    element.removeEventListener("animationstart", synchronize);
    view.cancelAnimationFrame(frame);
  };
}
