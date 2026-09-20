export default function controller(host) {
  const element = host.element;
  if (!element.hasAttribute("role")) element.setAttribute("role", "toolbar");
  if (!element.hasAttribute("aria-label")) element.setAttribute("aria-label", "Editor toolbar");
}
