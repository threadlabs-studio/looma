import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { defineComponent, h, onBeforeUnmount, ref, useId, type PropType } from "vue";
import { Button, Cluster, EditorToolbar, FormField, Icon, IconButton, Input, Popover, Stack, Text, Tooltip } from "@threadlabs/looma/vue";
import { normalizeImagePlacement, type LoomaImagePlacement } from "../../editor/extensions/image";

const placements: { value: LoomaImagePlacement; label: string; icon: string }[] = [
  { value: "block", label: "Image in line", icon: "panel-top" },
  { value: "center", label: "Center image", icon: "align-center" },
  { value: "wrap-left", label: "Wrap text to the right", icon: "panel-left" },
  { value: "wrap-right", label: "Wrap text to the left", icon: "panel-right" },
];

/** One contextual editing bar; sizing belongs to the image's corner handles.
 * @contract Placement applies immediately. Alt text is a secondary draft with
 * Save/Cancel; editing another node cancels it rather than changing that node.
 */
export const ImageControls = defineComponent({
  props: { editor: { type: Object as PropType<Editor>, required: true } },
  setup(props) {
    const id = `looma-image-${useId()}`;
    const open = ref(false);
    const alt = ref("");
    const placement = ref<LoomaImagePlacement>("block");
    let target: import("@tiptap/pm/model").Node | null = null;
    const selected = () => props.editor.state.selection instanceof NodeSelection
      && props.editor.state.selection.node.type.name === "image" ? props.editor.state.selection : null;
    const refresh = () => {
      const selection = selected();
      placement.value = normalizeImagePlacement(selection?.node.attrs.placement);
      if (open.value && selection?.node !== target) open.value = false;
    };
    props.editor.on("transaction", refresh);
    onBeforeUnmount(() => props.editor.off("transaction", refresh));
    const begin = () => {
      const selection = selected();
      if (!selection) return;
      target = selection.node; alt.value = selection.node.attrs.alt ?? ""; open.value = true;
    };
    const update = (attrs: Record<string, unknown>) => {
      const selection = selected();
      if (!selection || !props.editor.isEditable) return;
      props.editor.view.dispatch(props.editor.state.tr.setNodeMarkup(selection.from, undefined, { ...selection.node.attrs, ...attrs }));
      props.editor.view.focus();
    };
    return () => h(Text, { as: "div", font: "sans" }, () => [
      h(EditorToolbar, { floating: true, "aria-label": "Image actions" }, () => [
        ...placements.map(option => h(IconButton, {
          id: `${id}-${option.value}`, label: option.label, size: "sm", variant: placement.value === option.value ? "outline" : "ghost",
          "aria-pressed": placement.value === option.value,
          onClick: () => update({ placement: option.value, ...(option.value.startsWith("wrap-") ? { width: null, height: null } : {}) }),
        }, () => h(Icon, { name: option.icon, size: "sm" }))),
        h(IconButton, { id, label: "Image description", size: "sm", variant: "ghost" }, () => h(Icon, { name: "file-text", size: "sm" })),
        h(IconButton, { id: `${id}-delete`, label: "Delete image", size: "sm", variant: "ghost", onClick: () => { if (selected() && props.editor.isEditable) props.editor.chain().focus().deleteSelection().run(); } }, () => h(Icon, { name: "trash", size: "sm" })),
      ]),
      ...placements.map(option => h(Tooltip, { for: `${id}-${option.value}` }, () => option.label)),
      h(Tooltip, { for: id }, () => "Image description"),
      h(Tooltip, { for: `${id}-delete` }, () => "Delete image"),
      h(Popover, { for: id, open: open.value, size: "sm", "aria-label": "Image description", onOpen: begin, onClose: () => { open.value = false; } }, () => h("form", { "aria-label": "Image description", onSubmit: (event: Event) => {
        event.preventDefault(); if (selected()?.node !== target) return; open.value = false; update({ alt: alt.value });
      } }, [h(Stack, { gap: "s" }, () => [
        h(FormField, {}, {
          label: () => h("label", { for: `${id}-alt` }, "Alt text"),
          default: () => h(Input, { id: `${id}-alt`, size: "sm", value: alt.value, onInput: (event: Event) => { alt.value = (event.target as HTMLInputElement).value; } }),
        }),
        h(Text, { size: "xs", tone: "secondary" }, () => "Describe the image for people using a screen reader."),
        h(Cluster, { justify: "end", gap: "xs" }, () => [
          h(Button, { type: "button", variant: "ghost", tone: "neutral", size: "sm", onClick: () => { open.value = false; } }, () => "Cancel"),
          h(Button, { type: "submit", variant: "solid", size: "sm" }, () => "Save"),
        ]),
      ])])),
    ]);
  },
});
