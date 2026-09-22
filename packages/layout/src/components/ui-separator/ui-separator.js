export default function controller(host) {
  const element = host.element;
  const sync = () => {
    if (!element.hasAttribute("role")) element.setAttribute("role", "separator");
    if (element.getAttribute("role") === "separator") {
      element.setAttribute("aria-orientation", host.state.orientation === "vertical" ? "vertical" : "horizontal");
    } else {
      element.removeAttribute("aria-orientation");
    }
  };
  const stop = host.effect(sync);
  const observer = new MutationObserver(sync);
  observer.observe(element, { attributes: true, attributeFilter: ["role"] });
  sync();
  return () => { stop(); observer.disconnect(); };
}
