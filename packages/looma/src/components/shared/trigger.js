/**
 * Reports what caused the next change on a component: a `change` event is a plain Event, so the
 * keyboard or pointer that preceded it is remembered here. Returns [take, stop].
 */
export function trackTrigger(host) {
  let trigger = "programmatic";
  const offKey = host.on("keydown", (event) => {
    if (event.key === " " || event.key === "Enter" || event.key.startsWith("Arrow")) trigger = "keyboard";
  });
  const offPointer = host.on("pointerdown", () => { trigger = "pointer"; });
  const take = () => {
    const current = trigger;
    trigger = "programmatic";
    return current;
  };
  return [take, () => { offKey(); offPointer(); }];
}
