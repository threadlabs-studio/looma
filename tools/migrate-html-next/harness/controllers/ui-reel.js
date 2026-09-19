export default function controller(host) {
  const element = host.element;
  if (!element.hasAttribute("role")) element.setAttribute("role", "region");
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
}
