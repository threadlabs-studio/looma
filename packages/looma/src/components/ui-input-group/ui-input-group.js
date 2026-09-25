let nextAffixId = 0;
// An affix holding a control keeps it: its clicks are its own, and it is not hidden or described.
const INTERACTIVE = "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

function descriptionIds(input) {
  return (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
}

// A text affix is hidden from assistive technology and linked to the input as its description
// instead, so the input's name stays its label and the affix is read once, with the input. The
// consumer's own aria-describedby (or a Form Field's) is kept. A press on an affix, or anywhere in
// the box outside the input, focuses the input without moving its caret or selecting the affix.
export default function controller(host) {
  const element = host.element;
  let owned = [];
  let described = null;
  const wire = () => {
    const input = element.querySelector(".field input");
    const affixes = Array.from(element.querySelectorAll(":scope > .affix")).filter((affix) => {
      const text = affix.textContent.trim() !== "" && !affix.querySelector(INTERACTIVE);
      if (text) affix.setAttribute("aria-hidden", "true");
      else affix.removeAttribute("aria-hidden");
      return text;
    });
    for (const affix of affixes) affix.id ||= `ui-input-group-affix-${(nextAffixId += 1)}`;
    if (described && described !== input) {
      const rest = descriptionIds(described).filter((id) => !owned.includes(id));
      if (rest.length) described.setAttribute("aria-describedby", rest.join(" "));
      else described.removeAttribute("aria-describedby");
    }
    described = input;
    if (!input) return;
    const external = descriptionIds(input).filter((id) => !owned.includes(id));
    owned = affixes.map((affix) => affix.id);
    const next = [...owned, ...external].join(" ");
    if (next && input.getAttribute("aria-describedby") !== next) input.setAttribute("aria-describedby", next);
    else if (!next && input.hasAttribute("aria-describedby")) input.removeAttribute("aria-describedby");
  };
  const pressedAround = (event) => !(event.target instanceof Element && event.target.closest(INTERACTIVE));
  // Keep focus, and the caret, where they are, and start no text selection on the affix.
  const onMousedown = (event) => {
    if (pressedAround(event)) event.preventDefault();
  };
  // Click, not pointerdown: a tap's click is a user activation, so a touch keyboard opens.
  const onClick = (event) => {
    if (pressedAround(event) && !host.state.disabled) element.querySelector(".field input")?.focus();
  };
  element.addEventListener("mousedown", onMousedown);
  element.addEventListener("click", onClick);
  // Re-link when the input, an affix, or a description set elsewhere changes. Only aria-describedby
  // is watched, and it is written only when it differs, so this settles.
  const observer = new MutationObserver(() => queueMicrotask(wire));
  observer.observe(element, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["aria-describedby"] });
  wire();
  return () => {
    observer.disconnect();
    element.removeEventListener("mousedown", onMousedown);
    element.removeEventListener("click", onClick);
  };
}
