// Loading actions retain focus but cannot activate, navigate, submit, or notify click consumers.
export function connect(host) {
  const onClick = (event) => {
    if (!host.props.loading.value && !host.props.pending.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  host.element.addEventListener("click", onClick, true);
  return () => host.element.removeEventListener("click", onClick, true);
}
