const observed = new WeakMap();

/** Compare external inputs across connections; live edits remain in the renderer's state. */
export function externalValueTracker(instance, options = {}) {
  if (!observed.has(instance) && Object.hasOwn(options, "initialValue")) observed.set(instance, options.initialValue);
  return value => {
    const known = observed.has(instance);
    const previous = observed.get(instance);
    observed.set(instance, value);
    return !known || !Object.is(previous, value);
  };
}
