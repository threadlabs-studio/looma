import { dateInputSegments } from "../shared/date-input-segments.js";
import { canonicalValue, parseInput, formatInput, formatDisplay, isValueAllowed, Temporal } from "../shared/date-time.js";
import { afterFormReset } from "../shared/form-reset.js";
import { externalValueTracker } from "../shared/external-value.js";

const optionNames = ["type", "valueFormat", "locale", "timeZone", "disambiguation", "hourCycle", "granularity", "displayOptions", "min", "max", "disabledDates", "disabledRanges", "disabledWeekdays", "allowedDates", "allowedRanges", "required"];

/** Keep the editable draft separate from the canonical form value, following Input's native-like value ownership. */
export function connect(host) {
  const editor = host.element.querySelector("[data-date-editor]");
  const fallback = host.element.querySelector("[data-date-fallback]");
  const field = host.element.querySelector("[data-date-value]");
  let options;
  let current = host.state.current ?? "";
  const initialValue = current;
  const initialExternal = host.props.value.value;
  const nativeValue = fallback.value;
  const nativePartial = fallback.validity.badInput;
  let focusValue = current;
  let focused = false;
  let dirty = false;
  let signature;
  const externalChanged = externalValueTracker(host.element);
  let lastValidation;
  let validityMessage = "";
  let trigger = "programmatic";
  const blocked = () => editor.matches(":disabled") || editor.readOnly;
  const write = text => { if (editor.value !== text) editor.value = text; };
  const accept = value => { current = value; host.state.current = value; field.value = value; };
  const show = () => {
    try {
      host.state.segments = dateInputSegments(current, options);
      host.state.editingPlaceholder = host.state.segments.map(part => part.literal ?? part.placeholder).join("");
      write(focused ? formatInput(current, options) : formatDisplay(current, options));
    }
    catch { write(current); }
  };
  // Input's generated prop checks refresh native validity during rendering. Reapply
  // the domain error after that flush as well as immediately for synchronous submit.
  const setValidity = message => {
    validityMessage = message;
    editor.setCustomValidity(message);
    queueMicrotask(() => { if (connected) editor.setCustomValidity(validityMessage); });
  };
  const validate = (value, announce = false) => {
    let message = "";
    try {
      if (!value && editor.required) message = "Enter a complete value.";
      else if (!isValueAllowed(value, options)) message = "Choose an available value within the permitted range.";
    } catch (error) { message = error.message; }
    if (announce || !message) host.state.localInvalid = Boolean(message);
    if (announce && message !== lastValidation) {
      lastValidation = message;
      host.dispatch("validation-change", { invalid: Boolean(message), message });
    }
    setValidity(message);
    return !message;
  };
  const parse = (announce = false) => {
    try {
      let settings = options;
      if (options.type === "zoned" && current) {
        // Invalid external text must still be replaceable by a complete ISO paste.
        let boundTimeZone;
        try { boundTimeZone = Temporal.ZonedDateTime.from(current).timeZoneId; } catch { /* No saved zone to preserve. */ }
        settings = { ...options, boundTimeZone, timeZone: options.timeZone || boundTimeZone };
      }
      const value = parseInput(editor.value, settings);
      return validate(value, announce) ? value : null;
    } catch (error) {
      if (announce) {
        host.state.localInvalid = true;
        if (lastValidation !== error.message) host.dispatch("validation-change", { invalid: true, message: error.message });
        lastValidation = error.message;
      }
      setValidity(error.message);
      return null;
    }
  };
  const input = event => {
    event.stopPropagation();
    if (blocked()) return;
    dirty = true;
    host.dispatch("query-change", { query: editor.value });
    const value = parse();
    if (value === null) return;
    accept(value);
    host.dispatch("input", { value, trigger: event.isTrusted ? "keyboard" : trigger });
  };
  const commit = () => {
    if (blocked()) return;
    const value = parse(true);
    if (value === null) return;
    accept(value);
    if (value !== focusValue) host.dispatch("change", { value, trigger });
    focusValue = value;
    dirty = false;
    // Let child bindings flush before displaying the localized committed value.
    queueMicrotask(() => { if (connected && !focused) show(); });
  };
  const focus = () => {
    const displayed = editor.value;
    const selectedAll = editor.selectionStart === 0 && editor.selectionEnd === editor.value.length;
    focused = true; focusValue = current;
    if (!dirty) {
      show();
      // Changing representation invalidates the old caret/selection. Select the
      // numeric value so typing or paste replaces it instead of appending to it.
      if (host.state.segments.length && !selectedAll) editor.dispatchEvent(new Event("select-first-segment"));
      else if (selectedAll || editor.value !== displayed) editor.select();
    }
  };
  const blur = () => { focused = false; commit(); };
  const paste = event => {
    if (blocked()) return;
    const text = event.clipboardData?.getData("text");
    if (!text) return;
    try {
      parseInput(text, { ...options, timeZone: options.timeZone || (options.type === "zoned" && current ? Temporal.ZonedDateTime.from(current).timeZoneId : undefined) });
    } catch { return; }
    event.preventDefault(); write(text);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: text }));
  };
  const change = event => { event.stopPropagation(); };
  const key = event => {
    trigger = "keyboard";
    if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); commit(); }
    else if (event.key === "Escape") { event.preventDefault(); dirty = false; show(); validate(current, true); }
  };
  const pointer = () => { trigger = "pointer"; };
  const explicitValidation = () => { if (dirty) parse(true); else validate(current, true); };
  const setValue = event => {
    if (event.target !== host.element) return;
    if (!event.detail || blocked()) { event.preventDefault(); return; }
    event.stopPropagation();
    try {
      const value = canonicalValue(event.detail.value, options);
      if (!value && editor.required) throw new RangeError("Enter a complete value.");
      if (!isValueAllowed(value, options)) throw new RangeError("Choose an available value within the permitted range.");
      validate(value, true);
      const previous = current;
      stopNative(); accept(value); dirty = false; focusValue = current; show(); reveal(true);
      if (value !== previous) {
        const detail = { value, trigger: ["keyboard", "pointer"].includes(event.detail.trigger) ? event.detail.trigger : "programmatic" };
        host.dispatch("input", detail); host.dispatch("change", detail);
      }
    } catch { event.preventDefault(); }
  };
  let connected = true;
  let focusFrame;
  let nativeFrame;
  let nativeCommit = false;
  const stopNative = () => {
    cancelAnimationFrame(nativeFrame); nativeFrame = undefined;
    fallback.removeEventListener("input", nativeInput); fallback.removeEventListener("change", nativeChange);
  };
  const reveal = (force = false) => {
    if (host.state.enhanced || fallback.validity.badInput && !force) return;
    const focusedFallback = fallback.ownerDocument.activeElement === fallback;
    if (fallback.id && !host.props.inputId.value) { editor.id = fallback.id; fallback.removeAttribute("id"); }
    for (const name of ["aria-describedby", "aria-labelledby"]) if (fallback.hasAttribute(name)) editor.setAttribute(name, fallback.getAttribute(name));
    host.state.enhanced = true;
    if (focusedFallback) focusFrame = requestAnimationFrame(() => {
      const active = editor.ownerDocument.activeElement;
      if (connected && (active === fallback || active === editor.ownerDocument.body)) { editor.focus(); editor.select(); }
    });
  };
  const nativeInput = event => {
    event.stopPropagation();
    if (host.state.enhanced || fallback.validity.badInput || nativeFrame !== undefined) return;
    const query = fallback.value;
    const previous = current;
    write(query);
    const value = parse();
    if (value !== null) { accept(value); focusValue = value; show(); }
    else dirty = true;
    reveal();
    nativeFrame = requestAnimationFrame(() => {
      nativeFrame = undefined;
      if (!connected) return;
      host.dispatch("query-change", { query });
      if (value !== null) {
        const detail = { value, trigger: event.isTrusted ? "keyboard" : "programmatic" };
        host.dispatch("input", detail);
        if (nativeCommit && value !== previous && current === value) host.dispatch("change", detail);
      }
      stopNative();
    });
  };
  const nativeChange = event => {
    event.stopPropagation();
    if (fallback.validity.badInput) return;
    nativeCommit = true;
    if (!host.state.enhanced) nativeInput(event);
  };
  if (nativePartial) { fallback.addEventListener("input", nativeInput); fallback.addEventListener("change", nativeChange); }
  editor.addEventListener("input", input);
  editor.addEventListener("paste", paste);
  editor.addEventListener("change", change);
  editor.addEventListener("focus", focus);
  editor.addEventListener("blur", blur);
  editor.addEventListener("keydown", key);
  editor.addEventListener("pointerdown", pointer);
  editor.addEventListener("invalid", explicitValidation);
  host.element.addEventListener("validate", explicitValidation);
  host.element.addEventListener("set-value", setValue);
  const stop = host.effect(() => {
    const next = Object.fromEntries(optionNames.map(name => [name, host.props[name].value]));
    const value = host.props.value.value;
    const nextSignature = JSON.stringify([next, value]);
    if (signature === nextSignature) return;
    const first = signature === undefined;
    signature = nextSignature;
    options = next;
    if (externalChanged(value)) {
      const raw = value;
      let accepted;
      try { accepted = canonicalValue(raw ?? "", options); }
      catch { accepted = raw ?? ""; }
      const replace = first || accepted !== current;
      accept(accepted);
      // A model echo of an accepted edit updates the reset seed without disturbing typing.
      if (replace) { dirty = false; focusValue = current; show(); }
      if (!first && replace) { stopNative(); reveal(true); }
    } else if (!dirty) show();
    if (first && !nativePartial && value === initialExternal && (value ?? "") === initialValue && nativeValue !== initialValue) {
      let usableSeed = true;
      try { canonicalValue(initialValue, options); } catch { usableSeed = false; }
      if (usableSeed || nativeValue !== "") {
        write(nativeValue);
        const adopted = parse();
        if (adopted !== null) { accept(adopted); focusValue = adopted; show(); }
        else dirty = true;
      }
    }
    // Required and other native constraints reach the child during the same render turn.
    queueMicrotask(() => { if (connected) { if (dirty) parse(); else validate(current); } });
  });
  // Partial native date/time segments are opaque; retain that control until they are usable.
  reveal();
  const reset = afterFormReset(editor, () => {
    stopNative();
    try { accept(canonicalValue(host.props.value.value ?? "", options)); }
    catch { accept(host.props.value.value ?? ""); }
    dirty = false; focusValue = current; show(); validate(current, true);
    reveal(true);
  });
  return () => {
    connected = false; cancelAnimationFrame(focusFrame); stopNative(); stop(); reset(); host.state.enhanced = false;
    editor.setCustomValidity("");
    editor.removeEventListener("paste", paste);
    editor.removeEventListener("input", input); editor.removeEventListener("change", change);
    editor.removeEventListener("focus", focus); editor.removeEventListener("blur", blur);
    editor.removeEventListener("keydown", key); editor.removeEventListener("pointerdown", pointer);
    editor.removeEventListener("invalid", explicitValidation); host.element.removeEventListener("validate", explicitValidation);
    host.element.removeEventListener("set-value", setValue);
  };
}
