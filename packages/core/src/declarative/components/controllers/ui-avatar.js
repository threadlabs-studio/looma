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
  const avatar = host.element.querySelector(".avatar");
  const managedImage = host.element.querySelector(".avatar__managed-image");
  const fallback = host.element.querySelector(".fallback");
  let activeImage;
  let hasImage = false;

  const authoredImage = () => Array.from(host.element.querySelectorAll(".avatar img"))
    .find((image) => image !== managedImage);

  const onLoad = () => { hasImage = true; apply(); };
  const onError = () => { hasImage = false; apply(); };

  const bindActiveImage = (next) => {
    if (activeImage === next) return;
    activeImage?.removeEventListener("load", onLoad);
    activeImage?.removeEventListener("error", onError);
    activeImage = next;
    activeImage?.addEventListener("load", onLoad);
    activeImage?.addEventListener("error", onError);
    hasImage = Boolean(activeImage?.complete && activeImage.naturalWidth > 0);
  };

  const apply = () => {
    const label = host.state.alt || host.state.name || "Avatar";
    const authored = authoredImage();
    const managedSource = host.state.src || "";
    if (managedImage && managedImage.getAttribute("src") !== managedSource) {
      managedImage.setAttribute("src", managedSource);
    }
    bindActiveImage(authored || managedImage);

    if (authored) {
      host.element.removeAttribute("role");
      host.element.removeAttribute("aria-label");
    } else {
      host.element.setAttribute("role", "img");
      host.element.setAttribute("aria-label", label);
    }
    if (fallback) fallback.textContent = host.state.fallback || toInitials(host.state.name || host.state.alt);
    if (managedImage) {
      managedImage.hidden = Boolean(authored) || !hasImage;
      managedImage.setAttribute("aria-hidden", "true");
    }
    if (authored) {
      authored.hidden = !hasImage;
      authored.removeAttribute("aria-hidden");
    }
    if (fallback) {
      fallback.hidden = hasImage;
      fallback.setAttribute("aria-hidden", hasImage ? "true" : "false");
    }
    if (hasImage) host.element.setAttribute("data-has-image", "");
    else host.element.removeAttribute("data-has-image");
  };

  // Watch only direct image-slot changes. Observing the full subtree would also
  // observe the fallback text that `apply` owns and recursively retrigger it.
  const observer = new MutationObserver(apply);
  if (avatar) observer.observe(avatar, { childList: true });
  const stop = host.effect(apply);
  apply();

  return () => {
    stop?.();
    observer.disconnect();
    activeImage?.removeEventListener("load", onLoad);
    activeImage?.removeEventListener("error", onError);
  };
}
