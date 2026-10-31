import { DEV, fieldProblems, warnOnce } from "../shared/authoring.js";

let nextFieldId = 0;

function id(prefix) {
  nextFieldId += 1;
  return `${prefix}-${nextFieldId}`;
}

function descriptionIds(input) {
  return Array.from(new Set((input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean)));
}

export function connect(host) {
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
    const selector = "[data-ui-field-control]:not([hidden]), input:not([type=hidden]):not([hidden]), textarea:not([hidden]), select:not([hidden])";
    const target = label?.getAttribute("for") ? element.ownerDocument.getElementById(label.getAttribute("for")) : null;
    const requested = target && element.contains(target) ? (target.matches(selector) ? target : target.querySelector(selector)) : null;
    const input = requested ?? element.querySelector(selector);
    // A Vue named slot carries no slot attribute, so the help and error regions are read too.
    const helpRegion = element.querySelector(':scope > .help');
    const help = element.querySelector(':scope > .help > *, [slot="help"]') ?? (helpRegion?.textContent.trim() ? helpRegion : null);
    const errorRegion = element.querySelector(':scope > .error');
    const error = element.querySelector(':scope > .error > *, [slot="error"], [role="alert"]') ?? (errorRegion?.textContent.trim() ? errorRegion : null);
    if (input !== activeInput) {
      removeOwned(activeInput);
      activeInput = input;
      owned = new Set();
    }
    if (!input) return;
    if (DEV) warnOnce(warned, fieldProblems(label, input), element);
    if (!input.id) input.id = id("form-field-input");
    if (label && (!label.getAttribute("for") || target && target !== input && target.contains(input))) label.setAttribute("for", input.id);
    const external = descriptionIds(input).filter((value) => !owned.has(value));
    const described = [];
    if (help) {
      if (!help.id) help.id = id("form-field-help");
      described.push(help.id);
    }
    if (error && host.props.invalid.value) {
      if (!error.id) error.id = id("form-field-error");
      described.push(error.id);
    }
    owned = new Set(described.filter((value) => !external.includes(value)));
    const next = Array.from(new Set([...external, ...described])).join(" ");
    if (next && input.getAttribute("aria-describedby") !== next) input.setAttribute("aria-describedby", next);
    else if (!next && input.hasAttribute("aria-describedby")) input.removeAttribute("aria-describedby");
    input.disabled = Boolean(host.props.disabled.value);
    if (input.matches("[data-ui-field-control]")) {
      for (const value of element.querySelectorAll("[data-ui-field-value]")) value.disabled = input.disabled;
    }
    input.required = Boolean(host.props.required.value);
    input.setAttribute("aria-invalid", String(Boolean(host.props.invalid.value)));
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
  observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-describedby", "slot", "id", "role", "hidden"] });
  // Track props before deferred rewiring, even when no control is mounted yet.
  const stop = host.effect(() => {
    void host.props.disabled.value;
    void host.props.required.value;
    void host.props.invalid.value;
    schedule();
  });
  wire();
  return () => {
    stop();
    observer.disconnect();
    removeOwned(activeInput);
  };
}
