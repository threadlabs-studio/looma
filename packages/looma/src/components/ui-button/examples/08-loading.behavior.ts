import { updateComponentProps } from "@nextwebwg/html-next/runtime";

/** Simulates a save so the example shows the transition into and out of loading. */
export default function saveChanges(root: HTMLElement): () => void {
  const button = root.querySelector<HTMLElement>("#docs-save-changes");
  if (!button) return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onClick = () => {
    updateComponentProps(button, { loading: true });
    timer = setTimeout(() => {
      updateComponentProps(button, { loading: false });
      timer = undefined;
    }, 1500);
  };
  button.addEventListener("click", onClick);
  return () => {
    button.removeEventListener("click", onClick);
    if (timer !== undefined) clearTimeout(timer);
  };
}
