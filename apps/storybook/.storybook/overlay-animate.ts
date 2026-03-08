/**
 * Anime.js enter animation for overlay elements (ui-menu, ui-popover).
 * Minimal: decorator schedules a one-off scan after each story render. No observers.
 */
import { animate } from "animejs";

const OVERLAY_SELECTORS = ["ui-menu", "ui-popover", "ui-tooltip"];
const ANIMATION_OPTS = { y: [-6, 0], opacity: [0, 1], duration: 180, ease: "out(2)" as const };

function runEnterAnimation(el: HTMLElement): void {
  el.style.opacity = String(ANIMATION_OPTS.opacity[0]);
  el.style.transform = `translateY(${ANIMATION_OPTS.y[0]}px)`;
  requestAnimationFrame(() => {
    animate(el, {
      opacity: ANIMATION_OPTS.opacity,
      y: ANIMATION_OPTS.y,
      duration: ANIMATION_OPTS.duration,
      ease: ANIMATION_OPTS.ease
    });
  });
}

let scanTimeoutId: ReturnType<typeof setTimeout> | null = null;

function scheduleScan(): void {
  if (scanTimeoutId) clearTimeout(scanTimeoutId);
  scanTimeoutId = setTimeout(() => {
    scanTimeoutId = null;
    const root = document.getElementById("storybook-root");
    if (!root) return;
    for (const sel of OVERLAY_SELECTORS) {
      root.querySelectorAll(`${sel}[open]`).forEach((el) => runEnterAnimation(el as HTMLElement));
    }
  }, 50);
}

export function withOverlayAnimation(Story: () => unknown): unknown {
  const result = Story();
  scheduleScan();
  return result;
}
