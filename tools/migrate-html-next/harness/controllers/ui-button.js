export default function controller(host) {
  const element = host.element;
  const button = element.querySelector("button");
  const apply = () => {
    const disabled = Boolean(host.state.disabled);
    button && (button.disabled = disabled);
  };
  const onKeydown = (event) => {
    if (button || host.state.disabled || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    element.click();
  };
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("keydown", onKeydown);
  };
}
