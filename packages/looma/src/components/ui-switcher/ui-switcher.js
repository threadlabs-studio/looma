/** Stack the group when the authored child count exceeds the optional row limit. */
export default function controller(host) {
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
