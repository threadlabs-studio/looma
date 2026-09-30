/**
 * Reports what caused the next change on a component: a `change` event is a plain Event, so the
 * keyboard or pointer that preceded it is remembered here. Returns [take, stop].
 */
export function trackTrigger(host) {
  let trigger = "programmatic";
  const onKey = (event) => {
    if (event.key === " " || event.key === "Enter" || event.key.startsWith("Arrow")) trigger = "keyboard";
  };
  const onPointer = () => { trigger = "pointer"; };
  host.element.addEventListener("keydown", onKey);
  host.element.addEventListener("pointerdown", onPointer);
  const take = () => {
    const current = trigger;
    trigger = "programmatic";
    return current;
  };
  return [take, () => {
    host.element.removeEventListener("keydown", onKey);
    host.element.removeEventListener("pointerdown", onPointer);
  }];
}
