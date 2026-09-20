// HTML Next controller for ui-avatar, hand-converted from the Stencil component (proof of the
// controller path; the automated controller converter is the follow-up). Reproduces the fallback
// initials and the image load/error -> hasImage visibility logic on the lowered light-DOM root.

function toInitials(value) {
  const tokens = (value || "").trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

export default function controller(host) {
  const img = host.element.querySelector("img");
  const fallback = host.element.querySelector(".fallback");

  const apply = () => {
    const hasImage = host.state.hasImage;
    const label = host.state.alt || host.state.name || "Avatar";
    host.element.setAttribute("role", "img");
    host.element.setAttribute("aria-label", label);
    if (fallback) fallback.textContent = host.state.fallback || toInitials(host.state.name || host.state.alt);
    if (img) {
      img.src = host.state.src || "";
      img.alt = label;
      img.hidden = !hasImage;
      img.setAttribute("aria-hidden", hasImage ? "false" : "true");
    }
    if (fallback) {
      fallback.hidden = hasImage;
      fallback.setAttribute("aria-hidden", hasImage ? "true" : "false");
    }
    if (hasImage) host.element.setAttribute("data-has-image", "");
    else host.element.removeAttribute("data-has-image");
  };

  const onLoad = () => { host.state.hasImage = true; };
  const onError = () => { host.state.hasImage = false; };
  img?.addEventListener("load", onLoad);
  img?.addEventListener("error", onError);
  const stop = host.effect(apply);

  return () => {
    stop?.();
    img?.removeEventListener("load", onLoad);
    img?.removeEventListener("error", onError);
  };
}
