const ICONS = {
  info: '<svg data-looma-icon="info" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
  note: '<svg data-looma-icon="notebook-pen" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2Z"></path><path d="M13 2v7h7"></path><path d="m9.5 17.5 4-4 2 2-4 4H9.5v-2Z"></path></svg>',
  warning: '<svg data-looma-icon="triangle-alert" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
  success: '<svg data-looma-icon="circle-check" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>',
  danger: '<svg data-looma-icon="circle-x" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>'
};

/**
 * Restores the tone icon that Stencil supplied through computed `innerHTML`.
 * The migration compiler intentionally does not execute arbitrary render-time
 * HTML, so this controller owns a closed, reviewable map of trusted SVGs.
 */
export default function controller(host) {
  const icon = host.element.querySelector(".icon");
  let renderedTone;

  const apply = () => {
    const tone = Object.hasOwn(ICONS, host.state.tone) ? host.state.tone : "info";
    if (!icon || renderedTone === tone) return;
    icon.innerHTML = ICONS[tone];
    renderedTone = tone;
  };

  const stop = host.effect(apply);
  apply();
  return () => stop?.();
}
