import { componentRegistry } from "@nextwebwg/html-next/runtime";

export default function setupExample(root: HTMLElement) {
  const popover = root.querySelector<HTMLElement>('[data-note-popover]');
  const editor = root.querySelector<HTMLElement>('[data-note-editor]');
  const done = () => { if (popover) componentRegistry.update(popover, { open: false }); };
  editor?.addEventListener("done", done);
  return () => editor?.removeEventListener("done", done);
}
