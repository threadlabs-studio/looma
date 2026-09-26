// Warnings about authoring mistakes the controllers work around but cannot fix. They run in
// development only: bundlers replace process.env.NODE_ENV, the convention Vue and React follow, and a
// production build ("production") skips them. Without a bundler there is no process, and they run.
export const DEV = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
})();

// True when another element in the same document or shadow root has this element's id.
export function duplicateId(element) {
  return Boolean(element.id) && element.getRootNode().querySelectorAll(`[id="${CSS.escape(element.id)}"]`).length > 1;
}

// A Form Field's authoring problems, read before the field links its label and input.
export function fieldProblems(label, input) {
  const problems = [];
  const target = label?.getAttribute("for");
  if (label && !target && !label.contains(input)) {
    problems.push(
      "ui-form-field: the label has no for, so the field linked it to its input, which works only once JavaScript runs. Give the input an id and the label a matching for, or put the input inside the label, so the label works without JavaScript.",
    );
  }
  if (duplicateId(input)) {
    problems.push(
      `ui-form-field: the input's id "${input.id}" is used by another element in the same document or shadow root, so its label and description can reach the wrong element. Give each input its own id.`,
    );
  }
  if (target && input.getRootNode().querySelector(`#${CSS.escape(target)}`) !== input) {
    problems.push(
      `ui-form-field: the label's for="${target}" does not point at this field's input, so the label names another element or none. Set for to the input's id.`,
    );
  }
  return problems;
}

// Each problem is said once per field, with the field, however often the controller re-links it.
export function warnOnce(warned, problems, element) {
  for (const problem of problems) {
    if (warned.has(problem)) continue;
    warned.add(problem);
    console.warn(problem, element);
  }
}
