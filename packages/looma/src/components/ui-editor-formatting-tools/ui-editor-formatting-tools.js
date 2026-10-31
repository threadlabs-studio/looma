import { createToolbarTooltip } from "@threadlabs/looma/editor";
import { tooltipShowDelay } from "../shared/tooltip.js";

// The toolbar owns focus and hints; the document session owns commands and selection.
export function connect(host) {
  const root = host.element;
  const hint = createToolbarTooltip(value => { host.state.hint = value; }, () => tooltipShowDelay(root));
  const itemFor = event => {
    const control = event.target instanceof Element ? event.target.closest("[data-editor-tool]") : null;
    return control && root.contains(control) ? host.props.items.value.find(item => item.id === control.dataset.editorTool) : null;
  };
  const press = event => {
    const item = itemFor(event);
    if (!item || item.disabled) return;
    event.preventDefault();
    host.dispatch("tool-press", { id: item.id });
  };
  const activate = event => {
    const item = itemFor(event);
    if (item && !item.disabled) host.dispatch("tool-action", { id: item.id });
  };
  const show = event => {
    const item = itemFor(event);
    if (item) {
      if (event.type === "focusin") host.dispatch("tool-focus", { id: item.id });
      hint.show(item.id, item.label, event.type === "focusin", item.shortcut);
    }
  };
  root.addEventListener("pointerdown", press, true);
  root.addEventListener("click", activate);
  root.addEventListener("pointerover", show);
  root.addEventListener("focusin", show);
  root.addEventListener("pointerleave", hint.hide);
  root.addEventListener("focusout", hint.hide);
  return () => {
    hint.destroy();
    root.removeEventListener("pointerdown", press, true);
    root.removeEventListener("click", activate);
    root.removeEventListener("pointerover", show);
    root.removeEventListener("focusin", show);
    root.removeEventListener("pointerleave", hint.hide);
    root.removeEventListener("focusout", hint.hide);
  };
}
