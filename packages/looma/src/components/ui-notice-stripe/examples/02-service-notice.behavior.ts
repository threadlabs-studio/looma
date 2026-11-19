export default function connect(root: HTMLElement) {
  const stripe = root.querySelector<HTMLElement>("[data-example-id=maintenance-notice]");
  const dismiss = () => { if (stripe) stripe.hidden = true; };
  stripe?.addEventListener("dismiss", dismiss);
  return () => stripe?.removeEventListener("dismiss", dismiss);
}
