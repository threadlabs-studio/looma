/** Keep the form demonstration on this page while exercising native submit behavior. */
export default function setupExample(root: HTMLElement): () => void {
  const form = root.querySelector("form");
  const submit = (event: Event) => event.preventDefault();
  form?.addEventListener("submit", submit);
  return () => form?.removeEventListener("submit", submit);
}
