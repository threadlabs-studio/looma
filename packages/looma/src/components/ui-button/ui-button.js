// Loading actions retain focus but cannot activate, navigate, submit, or notify click consumers.
export default function controller(host) {
  const onClick = (event) => {
    if (!host.state.loading && !host.state.pending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  host.element.addEventListener("click", onClick, true);
  return () => host.element.removeEventListener("click", onClick, true);
}
