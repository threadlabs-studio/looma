// Purpose has greater influence than size: even a large menu stays lighter than a dialog.
const roleWeight = Object.freeze({ tooltip: 0.08, menu: 0.28, popover: 0.55, dialog: 1, panel: 0.65 });

/** Derive a bounded material scale from a surface's purpose and rendered border box. */
export function surfaceMaterialScale(role, width, height) {
  if (!Object.hasOwn(roleWeight, role)) throw new Error(`Unknown surface material role: ${role}`);
  const measured = [width, height].every(value => Number.isFinite(value) && value > 0);
  const size = measured ? Math.max(0.8, Math.min(1.35, Math.sqrt(width * height / (320 * 240)))) : 1;
  return Math.round(roleWeight[role] * size * 1000) / 1000;
}

/** Update component-owned material geometry; a tolerance prevents its rim feeding tiny resize changes back into itself. */
export function updateSurfaceMaterial(element, role) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const next = surfaceMaterialScale(role, width, height);
  const previous = Number.parseFloat(element.style.getPropertyValue("--_ui-material-scale"));
  if (!Number.isFinite(previous) || Math.abs(next - previous) >= Math.max(0.002, Math.abs(previous) * 0.04)) {
    element.style.setProperty("--_ui-material-scale", String(next));
  }
}
