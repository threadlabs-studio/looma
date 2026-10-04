import type { NodeViewRenderer } from "@tiptap/core";
import { createApp, h, nextTick, ref, shallowRef } from "vue";
import { Button, Checkbox, Cluster, Disclosure, FormField, Icon, IconButton, Input, Popover, Stack, Text, Tooltip } from "@threadlabs/looma/vue";

let expandSequence = 0;

/**
 * Composes a section's transient disclosure and saved settings from shared controls.
 * @lifecycle The content DOM remains owned by ProseMirror; Vue owns surrounding
 * controls. Unmount removes the app, listeners, and editor subscription.
 */
export const expandNodeView: NodeViewRenderer = ({ editor, node, getPos }) => {
  const dom = document.createElement("div");
  dom.dataset.loomaExpand = "";
  const current = shallowRef(node);
  const editable = ref(editor.isEditable);
  const expanded = ref(editor.isEditable || Boolean(node.attrs.open));
  let contentDOM!: HTMLElement;
  const refresh = () => {
    if (editable.value !== editor.isEditable) expanded.value = editor.isEditable || Boolean(current.value.attrs.open);
    editable.value = editor.isEditable;
  };
  const reveal = (event: Event) => {
    expanded.value = true;
    (event as CustomEvent<{ pending: Promise<void>[] }>).detail.pending.push(nextTick().then(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const panel = dom.querySelector<HTMLElement>("[data-component='ui-disclosure'] .panel");
      await Promise.all((panel?.getAnimations() ?? []).map(animation => animation.finished.catch(() => {})));
    }));
  };
  const app = createApp({
    setup() {
      const id = `looma-expand-${++expandSequence}`;
      const settings = ref(false);
      const title = ref(String(current.value.attrs.summary));
      const defaultOpen = ref(Boolean(current.value.attrs.open));
      const begin = () => { title.value = current.value.attrs.summary; defaultOpen.value = Boolean(current.value.attrs.open); settings.value = true; };
      const save = () => {
        const position = getPos();
        if (typeof position !== "number" || !editor.isEditable || editor.state.doc.nodeAt(position)?.type.name !== "loomaExpand") return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { summary: title.value.trim() || "Details", open: defaultOpen.value }));
        settings.value = false; editor.commands.focus();
      };
      return () => h(Stack, { gap: "xs" }, () => [
        editable.value ? h(Cluster, { justify: "end", gap: "xs" }, () => h(IconButton, { id, label: "Section settings", variant: "ghost", size: "sm" }, () => h(Icon, { name: "settings", size: "sm" }))) : null,
        editable.value ? h(Tooltip, { for: id }, () => "Section settings") : null,
        h(Disclosure, { summary: current.value.attrs.summary, open: expanded.value, density: "compact", onOpen: () => { expanded.value = true; }, onClose: () => { expanded.value = false; } }, () => h("div", {
          "data-looma-expand-body": "", ref: (element: unknown) => { if (element) contentDOM = element as HTMLElement; },
        })),
        editable.value ? h(Popover, { for: id, open: settings.value, size: "sm", "aria-label": "Section settings", onOpen: begin, onClose: () => { settings.value = false; } }, () => h(Stack, { gap: "s" }, () => [
          h(Text, { as: "strong", size: "sm", weight: "semibold" }, () => "Section settings"),
          h(FormField, {}, { label: () => h("label", { for: `${id}-summary` }, "Summary"), default: () => h(Input, { id: `${id}-summary`, value: title.value, size: "sm", onInput: (event: Event) => { title.value = (event.target as HTMLInputElement).value; } }) }),
          h(Checkbox, { checked: defaultOpen.value, onChange: (event: CustomEvent<{ checked: boolean }>) => { defaultOpen.value = event.detail.checked; } }, () => "Initially expanded"),
          h(Cluster, { justify: "end", gap: "xs" }, () => [
            h(Button, { variant: "ghost", tone: "neutral", size: "sm", onClick: () => { settings.value = false; } }, () => "Cancel"),
            h(Button, { variant: "solid", size: "sm", onClick: save }, () => "Save"),
          ]),
        ])) : null,
      ]);
    },
  });
  dom.addEventListener("looma-editor-reveal", reveal);
  editor.on("update", refresh);
  app.mount(dom);
  return {
    dom, contentDOM,
    update(next) {
      if (next.type !== current.value.type) return false;
      if (next.attrs.open !== current.value.attrs.open) expanded.value = editor.isEditable || Boolean(next.attrs.open);
      current.value = next; refresh(); return true;
    },
    stopEvent: event => !contentDOM.contains(event.target as globalThis.Node),
    ignoreMutation: mutation => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
    destroy() { dom.removeEventListener("looma-editor-reveal", reveal); editor.off("update", refresh); app.unmount(); },
  };
};
