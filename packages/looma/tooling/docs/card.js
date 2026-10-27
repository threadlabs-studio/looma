import { exampleBehaviors } from './example-behaviors.js';
/** Cards share their document's theme and runtime; width controls size only this stage. */
export function connect(host) {
  const { stage, width, remove } = host.refs;
  const stopExample = exampleBehaviors[host.props.identity.value]?.(host.element.querySelector('[data-preview]'));
  const removeCard = () => host.element.dispatchEvent(new CustomEvent('looma-example-remove', { bubbles: true, detail: { id: host.props.identity.value } }));
  const resize = event => {
    const value = Number(event.detail?.value ?? event.target.value);
    if (value >= 240 && value <= 1600) stage.style.setProperty('--_preview-width', `${value}px`);
  };
  width?.addEventListener('input', resize);
  remove?.addEventListener('click', removeCard);
  return () => {
    stopExample?.();
    width?.removeEventListener('input', resize);
    remove?.removeEventListener('click', removeCard);
  };
}
