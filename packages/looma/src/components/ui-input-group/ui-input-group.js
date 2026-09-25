let nextAffixId = 0;

function descriptionIds(input) {
  return (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
}

// The affixes are hidden from assistive technology and linked to the input as its description
// instead, so the input's name stays its label and the affix is read once, with the input. The
// consumer's own aria-describedby (or a Form Field's) is kept. A click on an affix, or anywhere in
// the box outside the input, focuses the input without moving its caret or selecting the affix.
export default function controller(host) {
  const element = host.element;
  let owned = [];
  let described = null;
  const wire = () => {
    const input = element.querySelector("input");
    const affixes = Array.from(element.querySelectorAll("[data-affix]"));
    for (const affix of affixes) {
      if (!affix.id) affix.id = `input-group-${affix.dataset.affix}-${(nextAffixId += 1)}`;
    }
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
  const outsideInput = (event) => !(event.target instanceof Element && event.target.closest("input"));
  // Keep focus, and the caret, where they are, and start no text selection on the affix.
  const onMousedown = (event) => {
    if (outsideInput(event)) event.preventDefault();
  };
  // Click, not pointerdown: a tap's click is a user activation, so a touch keyboard opens.
  const onClick = (event) => {
    if (outsideInput(event)) element.querySelector("input")?.focus();
  };
  element.addEventListener("mousedown", onMousedown);
  element.addEventListener("click", onClick);
  // Re-link when the input, an affix, or a description set elsewhere changes. Only the input's
  // aria-describedby is watched, and it is written only when it differs, so this settles.
  const observer = new MutationObserver(() => queueMicrotask(wire));
  observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-describedby"] });
  wire();
  return () => {
    observer.disconnect();
    element.removeEventListener("mousedown", onMousedown);
    element.removeEventListener("click", onClick);
  };
}
