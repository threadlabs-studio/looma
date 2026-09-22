const initialized = new WeakSet();

/**
 * Marks the document `data-ui-input-modality="touch"` once the user actually touches it, rather than
 * guessing from capability media queries: hybrid devices keep compact pointer affordances until then.
 * Idempotent per document; touch is sticky once observed.
 *
 * @param {Document} document
 */
export function trackInputModality(document) {
  if (initialized.has(document)) return;
  initialized.add(document);
  const markTouch = () => {
    if (document.documentElement.getAttribute("data-ui-input-modality") === "touch") return;
    document.documentElement.setAttribute("data-ui-input-modality", "touch");
    document.dispatchEvent(new CustomEvent("ui-input-modality-change", { detail: { modality: "touch" } }));
  };
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") markTouch();
  }, { capture: true, passive: true });
  document.addEventListener("touchstart", markTouch, { capture: true, passive: true });
}
