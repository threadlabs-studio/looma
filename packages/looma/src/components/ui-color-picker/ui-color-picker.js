import { afterFormReset } from "../shared/form-reset.js";
import { closeOverlay, createAnchoredSurface, openOverlay } from "../shared/overlay.js";

export function connect(host) {
  const { trigger, editor, colour, hex, red, green, blue, field, clear, emptyMark } = host.refs;
  const document = trigger.ownerDocument;
  const id = `ui-color-picker-${Math.random().toString(36).slice(2, 11)}`;
  editor.id = id;
  trigger.setAttribute("aria-controls", id);
  const surface = createAnchoredSurface(editor, { anchor: trigger });
  surface.hide();
  let opened = false;
  let current = "#000000";
  let external;
  let pigment = current;
  // A hidden input’s value writes also change defaultValue; reset needs the last valid external colour.
  let resetValue = "#000000";
  const valid = value => /^#[0-9a-f]{6}$/i.test(String(value)) || host.props.clearable.value && value === "";
  const paint = value => {
    current = value.toLowerCase();
    if (current) pigment = current;
    field.value = current;
    hex.removeAttribute("aria-invalid");
    colour.style.backgroundColor = current || "transparent";
    emptyMark.hidden = Boolean(current);
    trigger.title = current || "None";
    hex.value = pigment;
    [red, green, blue].forEach((input, i) => { input.value = String(parseInt(pigment.slice(i * 2 + 1, i * 2 + 3), 16)); });
  };
  paint(current);
  const close = reason => {
    opened = false;
    trigger.setAttribute("aria-expanded", "false");
    surface.hide();
    closeOverlay(document, id);
    if (reason === "escape") trigger.focus();
  };
  const toggle = () => {
    if (host.props.disabled.value) return;
    if (opened) { close("action"); return; }
    opened = true;
    trigger.setAttribute("aria-expanded", "true");
    surface.show();
    openOverlay({ id, modal: false, element: editor, relatedElements: [trigger], dismissible: true, requestClose: close });
    hex.focus();
  };
  const edit = event => {
    event.stopPropagation();
    const value = event.currentTarget === hex ? hex.value : "#" + [red, green, blue].map(input => Number(input.value).toString(16).padStart(2, "0")).join("");
    if (!valid(value)) { hex.setAttribute("aria-invalid", "true"); return; }
    paint(value);
    host.dispatch(event.type, { value: current });
  };
  const escape = event => {
    if (event.key === "Escape" && opened) { event.preventDefault(); close("escape"); }
  };
  const clearColour = event => {
    event.stopPropagation();
    if (!host.props.clearable.value || host.props.disabled.value) return;
    paint("");
    host.dispatch("input", { value: "" });
    host.dispatch("change", { value: "" });
    close("escape");
  };
  clear.addEventListener("click", clearColour);
  trigger.addEventListener("click", toggle);
  editor.addEventListener("keydown", escape);
  for (const input of [hex, red, green, blue]) for (const type of ["input", "change"]) input.addEventListener(type, edit);
  const stop = host.effect(() => {
    clear.hidden = !host.props.clearable.value;
    const value = host.props.value.value;
    if (value !== external) {
      external = value;
      if (valid(value)) {
        resetValue = String(value).toLowerCase();
        field.defaultValue = resetValue;
        paint(value);
      }
    }
    if (host.props.disabled.value && opened) close("disabled");
  });
  const stopReset = afterFormReset(field, () => { paint(resetValue); close("reset"); });
  return () => {
    stop(); stopReset(); close("disconnect"); surface.destroy();
    clear.removeEventListener("click", clearColour);
    trigger.removeEventListener("click", toggle);
    editor.removeEventListener("keydown", escape);
    for (const input of [hex, red, green, blue]) for (const type of ["input", "change"]) input.removeEventListener(type, edit);
  };
}
