/** Stack the group when the authored child count exceeds the optional row limit. */
function connect(host) {
  const element = host.element;
  const update = () => {
    const limit = Number(host.props.limit.value);
    host.state.overLimit = Number.isFinite(limit) && limit >= 1 && element.children.length > Math.floor(limit);
  };
  const stop = host.effect(update);
  const observer = new MutationObserver(update);
  observer.observe(element, { childList: true });
  return () => {
    stop();
    observer.disconnect();
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
