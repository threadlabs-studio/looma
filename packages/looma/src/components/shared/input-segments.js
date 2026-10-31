/** Give one native text input editable blocks, literal navigation and continuous code entry. */
export function inputSegments(input, readSegments, readInitialValue) {
  let connected = true;
  let composing = false;
  let internal = false;
  let continued = -1;
  let skipped = "";
  let expectedValue = input.value;
  let entering = false;
  const undo = [];
  const redo = [];
  const configuration = () => {
    if (input.value !== expectedValue) {
      undo.length = 0; redo.length = 0; continued = -1; skipped = ""; expectedValue = input.value;
    }
    if (input.type !== "text" && input.type !== "tel" && input.type !== "search") return null;
    const parts = readSegments() ?? [];
    if (!parts.some(part => part.placeholder)) return null;
    return parts.map(part => typeof part.literal === "string" ? { literal: part.literal } : {
      length: [...part.placeholder].length,
      accepts: new RegExp(`^(?:${part.pattern ?? "."})$`, "u"),
    });
  };
  const layout = (parts, text = input.value) => {
    const blocks = [];
    let offset = 0;
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (part.literal !== undefined) {
        if (offset < text.length) {
          if (!text.startsWith(part.literal, offset)) return null;
          offset += part.literal.length;
        }
        continue;
      }
      const start = offset;
      let value = "";
      const nextLiteral = parts[index + 1]?.literal;
      while (offset < text.length && [...value].length < part.length && !(nextLiteral && text.startsWith(nextLiteral, offset))) {
        const character = String.fromCodePoint(text.codePointAt(offset));
        if (!part.accepts.test(character)) break;
        value += character; offset += character.length;
      }
      blocks.push({ ...part, value, start, end: offset, index });
    }
    return offset === text.length ? blocks : null;
  };
  const snapshot = () => ({ value: input.value, start: input.selectionStart, end: input.selectionEnd });
  const select = block => input.setSelectionRange(block.start, block.end);
  const announce = inputType => {
    expectedValue = input.value;
    internal = true;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType }));
    internal = false;
  };
  const entryText = (parts, blocks, active) => {
    const lastFilled = blocks.findLastIndex(block => block.value);
    const last = blocks[Math.max(active, lastFilled)].index;
    let index = 0;
    return parts.slice(0, last + 1).map(part => part.literal ?? blocks[index++].value).join("");
  };
  const render = (parts, blocks, active, inputType) => {
    undo.push(snapshot()); redo.length = 0;
    input.value = blocks.every(block => !block.value) && !inputType.startsWith("insert") ? "" : entryText(parts, blocks, active);
    const next = layout(parts);
    if (next?.[active]) select(next[active]);
    announce(inputType);
  };
  const activeBlock = blocks => {
    if (continued >= 0 && input.selectionStart === input.selectionEnd && blocks[continued]?.end === input.selectionStart) return continued;
    const exact = blocks.findIndex(block => block.start === input.selectionStart);
    if (exact >= 0) return exact;
    const containing = blocks.findIndex(block => input.selectionStart < block.end);
    return containing >= 0 ? containing : blocks.length - 1;
  };
  const focus = (force = false) => {
    continued = -1; skipped = "";
    if (input.disabled || input.readOnly || force !== true && input.value && input.selectionStart === 0 && input.selectionEnd === input.value.length) return;
    const parts = configuration();
    const blocks = parts && layout(parts);
    if (blocks?.length) select(blocks[0]);
  };
  const down = () => { entering = input.ownerDocument.activeElement !== input; };
  const reselect = () => focus(true);
  const pointer = () => {
    if (entering) { entering = false; if (input.selectionStart === input.selectionEnd) focus(true); return; }
    const parts = configuration();
    const blocks = parts && layout(parts);
    if (!blocks || input.selectionStart !== input.selectionEnd) return;
    continued = -1; skipped = "";
    select(blocks[activeBlock(blocks)]);
  };
  const insert = (parts, blocks, data, inputType) => {
    let active = activeBlock(blocks);
    const block = blocks[active];
    const nextLiteral = parts[block.index + 1]?.literal ?? "";
    if (nextLiteral.includes(data) && data) {
      if (skipped === data) { skipped = ""; return; }
      continued = -1;
      if (blocks[active + 1]) {
        if (entryText(parts, blocks, active + 1) !== input.value) render(parts, blocks, active + 1, inputType);
        else select(blocks[active + 1]);
      }
      return;
    }
    if (skipped === data) { skipped = ""; return; }
    if (!block.accepts.test(data)) return;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length && blocks.length > 1;
    if (all) { blocks.forEach(part => { part.value = ""; }); active = 0; }
    const target = blocks[active];
    const replacing = continued !== active || input.selectionStart !== input.selectionEnd;
    target.value = (replacing ? "" : target.value) + data;
    if ([...target.value].length > target.length) return;
    const complete = [...target.value].length === target.length;
    const next = complete && blocks[active + 1] ? active + 1 : active;
    render(parts, blocks, next, inputType);
    const positions = layout(parts);
    if (next === active && positions) input.setSelectionRange(positions[active].end, positions[active].end);
    continued = next === active ? active : -1;
    skipped = complete ? nextLiteral : "";
  };
  const before = event => {
    if (composing || event.isComposing || input.disabled || input.readOnly) return;
    const parts = configuration();
    let blocks = parts && layout(parts);
    if (!blocks) return;
    if (event.inputType === "insertText" && event.data && [...event.data].length > 1) {
      // Bulk native replacement (including dictation and automation) replaces the field;
      // the owner retains parsing and validation of complete or incomplete pasted text.
      event.preventDefault(); undo.push(snapshot()); redo.length = 0;
      input.value = event.data; input.setSelectionRange(input.value.length, input.value.length);
      announce(event.inputType); continued = -1; skipped = "";
    } else if (event.inputType === "insertText" && event.data && [...event.data].length === 1) {
      event.preventDefault(); insert(parts, blocks, event.data, event.inputType);
    } else if (["deleteContentBackward", "deleteContentForward"].includes(event.inputType)) {
      event.preventDefault();
      const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
      let active = activeBlock(blocks);
      if (all) blocks.forEach(block => { block.value = ""; });
      else if (event.inputType === "deleteContentBackward") {
        if (!blocks[active].value && active > 0) active--;
        blocks[active].value = continued === active && input.selectionStart === input.selectionEnd ? [...blocks[active].value].slice(0, -1).join("") : "";
      } else blocks[active].value = "";
      render(parts, blocks, active, event.inputType);
      continued = -1; skipped = "";
    }
  };
  const key = event => {
    if (event.isComposing || input.disabled || input.readOnly) return;
    const parts = configuration();
    const blocks = parts && layout(parts);
    if (!blocks) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && ["z", "y"].includes(event.key.toLowerCase())) {
      const forward = event.key.toLowerCase() === "y" || event.shiftKey;
      const from = forward ? redo : undo, to = forward ? undo : redo;
      if (!from.length) return;
      event.preventDefault(); to.push(snapshot());
      const previous = from.pop(); input.value = previous.value; input.setSelectionRange(previous.start, previous.end);
      continued = -1; skipped = ""; announce(forward ? "historyRedo" : "historyUndo");
    } else if (!modifier && !event.altKey && !event.shiftKey && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const active = activeBlock(blocks);
      const next = event.key === "Home" ? 0 : event.key === "End" ? blocks.length - 1 : Math.max(0, Math.min(blocks.length - 1, active + (event.key === "ArrowLeft" ? -1 : 1)));
      select(blocks[next]); continued = -1; skipped = "";
    }
  };
  const paste = event => {
    const parts = configuration();
    const blocks = parts && layout(parts);
    const text = event.clipboardData?.getData("text");
    // Adjacent code blocks consume a paste from the active position, like continued typing.
    if (!blocks || !text || parts.some(part => part.literal) || input.disabled || input.readOnly) return;
    if (input.selectionStart === 0 && input.selectionEnd === input.value.length) return;
    if ([...text].some(character => !blocks[0].accepts.test(character))) return;
    event.preventDefault();
    const active = activeBlock(blocks);
    let characters = [...text];
    for (let index = active; index < blocks.length && characters.length; index++) blocks[index].value = characters.splice(0, blocks[index].length).join("");
    render(parts, blocks, Math.min(blocks.length - 1, active + [...text].length), "insertFromPaste");
    continued = -1; skipped = "";
  };
  const native = () => { if (!internal) { undo.length = 0; redo.length = 0; continued = -1; skipped = ""; expectedValue = input.value; } };
  const start = () => { composing = true; };
  const end = () => { composing = false; native(); };
  const events = { focus, "select-first-segment": reselect, pointerdown: down, click: pointer, beforeinput: before, keydown: key, paste, input: native, compositionstart: start, compositionend: end };
  for (const [name, listener] of Object.entries(events)) input.addEventListener(name, listener);
  queueMicrotask(() => { if (connected && input.ownerDocument.activeElement === input && input.value === String(readInitialValue() ?? input.defaultValue)) focus(); });
  return () => { connected = false; for (const [name, listener] of Object.entries(events)) input.removeEventListener(name, listener); };
}
