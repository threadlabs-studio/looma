// Retarget Looma's shipped light-DOM compatibility stylesheet to lowered HTML Next roots.
// The original custom-element tag is replaced during lowering, while data-component-root retains
// the component identity as a space-separated token list (including nested/composite roots).

export function convertLightDomStyles(css) {
  return css.replace(
    /(?<![-\w])ui-[a-z0-9]+(?:-[a-z0-9]+)*(?![-\w])/g,
    (tag) => `[data-component-root~="${tag}"]`,
  );
}
