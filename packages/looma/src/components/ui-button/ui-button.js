// Loading actions retain focus but cannot activate, navigate, submit, or notify click consumers.
export function connect(host) {
  const onClick = (event) => {
    if (!host.props.loading.value && !host.props.pending.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  return host.effect(() => {
    const element = host.element;
    element.addEventListener("click", onClick, true);
    return () => element.removeEventListener("click", onClick, true);
  });
}
