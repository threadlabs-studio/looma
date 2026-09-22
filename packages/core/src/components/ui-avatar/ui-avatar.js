function toInitials(value) {
  const tokens = (value || "").trim().split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

// Shows an authored <img>, else the `src` image, else initials, and tracks whether the image loaded.
export default function controller(host) {
  const element = host.element;
  const managed = host.refs.image;
  let active;
  const onLoad = () => { host.state.hasImage = true; };
  const onError = () => { host.state.hasImage = false; };
  const watch = (image) => {
    if (image === active) return;
    active?.removeEventListener("load", onLoad);
    active?.removeEventListener("error", onError);
    active = image;
    active.addEventListener("load", onLoad);
    active.addEventListener("error", onError);
    host.state.hasImage = active.complete && active.naturalWidth > 0;
  };
  const apply = () => {
    const authored = Array.from(element.querySelectorAll("img")).find((image) => image !== managed);
    host.state.hasAuthoredImage = Boolean(authored);
    watch(authored ?? managed);
    if (authored) {
      authored.hidden = !host.state.hasImage;
      element.removeAttribute("role");
      element.removeAttribute("aria-label");
    } else {
      element.setAttribute("role", "img");
      element.setAttribute("aria-label", host.state.alt || host.state.name || "Avatar");
    }
    host.state.initials = host.state.fallback || toInitials(host.state.name || host.state.alt);
  };
  const observer = new MutationObserver(apply);
  observer.observe(element, { childList: true });
  const stop = host.effect(apply);
  return () => {
    stop();
    observer.disconnect();
    active?.removeEventListener("load", onLoad);
    active?.removeEventListener("error", onError);
  };
}
