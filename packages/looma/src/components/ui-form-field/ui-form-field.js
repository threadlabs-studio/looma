import { DEV, fieldProblems, warnOnce } from "../shared/authoring.js";

let nextFieldId = 0;

function id(prefix) {
  nextFieldId += 1;
  return `${prefix}-${nextFieldId}`;
}

function descriptionIds(input) {
  return Array.from(new Set((input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean)));
}

export default function controller(host) {
  const element = host.element;
  let activeInput = null;
  let owned = new Set();
  let queued = false;
  const warned = new Set();
  const removeOwned = (input) => {
    if (!input || owned.size === 0) return;
    const remaining = descriptionIds(input).filter((value) => !owned.has(value));
    if (remaining.length) input.setAttribute("aria-describedby", remaining.join(" "));
    else input.removeAttribute("aria-describedby");
  };
  const wire = () => {
    const label = element.querySelector('[slot="label"], label');
    const input = element.querySelector("input, textarea, select");
    // A Vue named slot carries no slot attribute, so the help and error regions are read too.
    const help = element.querySelector(':scope > .help > *, [slot="help"]');
    const error = element.querySelector(':scope > .error > *, [slot="error"], [role="alert"]');
    if (input !== activeInput) {
      removeOwned(activeInput);
      activeInput = input;
      owned = new Set();
    }
    if (!input) return;
    if (DEV) warnOnce(warned, fieldProblems(label, input), element);
    if (!input.id) input.id = id("form-field-input");
    if (label && !label.getAttribute("for")) label.setAttribute("for", input.id);
    const external = descriptionIds(input).filter((value) => !owned.has(value));
    const described = [];
    if (help) {
      if (!help.id) help.id = id("form-field-help");
      described.push(help.id);
    }
    if (error) {
      if (!error.id) error.id = id("form-field-error");
      described.push(error.id);
    }
    owned = new Set(described.filter((value) => !external.includes(value)));
    const next = Array.from(new Set([...external, ...described])).join(" ");
    if (next && input.getAttribute("aria-describedby") !== next) input.setAttribute("aria-describedby", next);
    else if (!next && input.hasAttribute("aria-describedby")) input.removeAttribute("aria-describedby");
    input.disabled = Boolean(host.state.disabled);
    input.required = Boolean(host.state.required);
    input.setAttribute("aria-invalid", String(Boolean(host.state.invalid)));
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      wire();
    });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-describedby", "slot", "id", "role"] });
  const stop = host.effect(schedule);
  wire();
  return () => {
    stop();
    observer.disconnect();
    removeOwned(activeInput);
  };
}
