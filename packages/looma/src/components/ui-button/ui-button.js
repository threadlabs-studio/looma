// Loading actions retain focus but cannot activate, navigate, submit, or notify click consumers.
function connect(host) {
  const onClick = (event) => {
    if (!host.props.loading.value && !host.props.pending.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  host.element.addEventListener("click", onClick, true);
  return () => host.element.removeEventListener("click", onClick, true);
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
