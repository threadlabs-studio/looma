import { componentRegistry } from "@nextwebwg/html-next/runtime";

/** Opens this specimen from its own trigger and closes it after a choice. */
export default function setup(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLElement>("[data-demo-trigger]");
  const surface = root.querySelector<HTMLElement>("[data-demo-surface]");
  if (!trigger || !surface) return () => {};
  const open = () => componentRegistry.update(surface, { open: true });
  const close = () => componentRegistry.update(surface, { open: false });
  trigger.addEventListener("click", open);
  surface.addEventListener("select", close);
  surface.addEventListener("close", close);
  return () => { trigger.removeEventListener("click", open); surface.removeEventListener("select", close); surface.removeEventListener("close", close); };
}
