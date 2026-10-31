/** Omitted optional inputs have no prerequisite; supplied or producing inputs retain readiness. */
export function readOptionalInput(inputs, props, name) {
  const status = inputs.status(name);
  return inputs.supplied(name) || status.ready || status.pending || status.error ? props[name] : undefined;
}
