/**
 * Calls back once a form reset has restored `control`'s form to its defaults. The browser restores
 * each native control after the reset event has been dispatched, and a reset button's event runs
 * its listeners before that, so the callback waits a task.
 *
 * @ownership A controller that keeps its own copy of a control's state reads it back here; the
 * native defaults (defaultValue, defaultChecked, defaultSelected) are what the reset restores.
 * @lifecycle Returns the function that stops listening.
 */
export function afterFormReset(control, callback) {
  // Reset bubbles within a tree but does not cross a shadow boundary.
  const tree = control.getRootNode();
  const root = tree.host ? tree : control.ownerDocument;
  const pending = new Set();
  const onReset = (event) => {
    if (event.target !== control.form) return;
    const timer = setTimeout(() => {
      pending.delete(timer);
      if (!event.defaultPrevented) callback();
    });
    pending.add(timer);
  };
  root.addEventListener("reset", onReset, { capture: true });
  return () => {
    root.removeEventListener("reset", onReset, { capture: true });
    for (const timer of pending) clearTimeout(timer);
    pending.clear();
  };
}
