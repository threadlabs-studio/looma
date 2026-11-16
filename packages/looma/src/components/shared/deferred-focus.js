/** Allow only the latest focus request to run after rendering.
 * @param {Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">} view Window that owns the control.
 * @lifecycle Call the returned cancel function when disconnecting the owner.
 */
export function deferredFocus(view) {
  /** @type {number | undefined} */
  let frame;
  const cancel = () => {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
  };
  /** @param {() => void} focus */
  const schedule = (focus) => {
    cancel();
    frame = view.requestAnimationFrame(() => {
      frame = undefined;
      focus();
    });
  };
  return { schedule, cancel };
}
