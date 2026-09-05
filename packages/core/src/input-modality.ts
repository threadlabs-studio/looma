const initializedDocuments = new WeakSet<Document>();

/**
 * Reflects real touch use instead of guessing from device capability media
 * queries. Hybrid devices therefore keep compact pointer affordances until the
 * user actually touches the interface.
 */
export function initializeInputModality(owner: Document = document): void {
  if (initializedDocuments.has(owner)) return;
  initializedDocuments.add(owner);

  const markTouch = () => {
    if (owner.documentElement.getAttribute("data-ui-input-modality") === "touch") return;
    owner.documentElement.setAttribute("data-ui-input-modality", "touch");
    owner.dispatchEvent(new CustomEvent("ui-input-modality-change", {
      detail: { modality: "touch" },
    }));
  };

  owner.addEventListener("pointerdown", (event) => {
    if ((event as PointerEvent).pointerType === "touch") markTouch();
  }, { capture: true, passive: true });
  owner.addEventListener("touchstart", markTouch, { capture: true, passive: true });
}
