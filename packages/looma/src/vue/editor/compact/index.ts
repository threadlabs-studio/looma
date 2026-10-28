import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type PropType, type VNodeChild } from "vue";
import type { AnyExtension, JSONContent } from "@tiptap/core";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { getCompactEditorExtensions } from "./extensions";
import "./compact-editor.css";

export { getCompactEditorExtensions } from "./extensions";
const emptyDocument = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

/**
 * Toolbar-free editing for short rich text. Owns editor lifecycle and standard
 * formatting/history shortcuts; the host owns persistence and optional extensions.
 * Importing this entry is SSR-safe and does not load the full document editor.
 * @ownership The component owns the editor; callers own content and extensions.
 * @lifecycle Mount creates one editor; unmount destroys it and prop watchers.
 * @failure Persistence failures are host-owned; the controlled document can restore input.
 */
export const LoomaCompactEditor = defineComponent({
  name: "LoomaCompactEditor",
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<JSONContent>, default: emptyDocument },
    label: { type: String, default: "Message" },
    id: { type: String, default: "" },
    editable: { type: Boolean, default: true },
    extensions: { type: Array as PropType<AnyExtension[]>, default: () => [] },
  },
  emits: {
    "update:modelValue": (_value: JSONContent) => true,
    ready: (_editor: Editor) => true,
  },
  setup(props, { attrs, emit, expose }) {
    const editor = shallowRef<Editor>();
    onMounted(() => {
      editor.value = new Editor({
        extensions: [...getCompactEditorExtensions().filter(extension => !props.extensions.some(supplied => supplied.name === extension.name)), ...props.extensions],
        content: props.modelValue,
        editable: props.editable,
        editorProps: { attributes: () => ({ role: "textbox", "aria-multiline": "true", "aria-label": props.label, "aria-readonly": String(!props.editable), id: props.id }) },
        onUpdate: ({ editor }) => emit("update:modelValue", editor.getJSON()),
      });
      // EditorContent attaches the view in its own nextTick after this render.
      void nextTick().then(() => nextTick()).then(() => {
        if (editor.value && !editor.value.isDestroyed) emit("ready", editor.value);
      });
    });
    watch(() => props.modelValue, value => {
      if (editor.value && JSON.stringify(value) !== JSON.stringify(editor.value.getJSON())) editor.value.commands.setContent(value, false);
    }, { deep: true });
    watch(() => [props.id, props.label, props.editable], () => editor.value?.setEditable(props.editable, false));
    onBeforeUnmount(() => editor.value?.destroy());
    expose({ focus: () => editor.value?.commands.focus(), getEditor: () => editor.value });
    return () => h("div", { ...attrs, id: undefined, class: ["looma-compact-editor", attrs.class] }, [editor.value ? h(EditorContent, { editor: editor.value }) : null]);
  },
});

function renderNode(node: JSONContent): VNodeChild {
  if (node.type === "hardBreak") return h("br");
  if (node.type === "text") {
    let text: VNodeChild = node.text ?? "";
    for (const mark of node.marks ?? []) {
      const tag = { bold: "strong", italic: "em", code: "code" }[mark.type as "bold" | "italic" | "code"];
      if (tag) text = h(tag, {}, [text]);
    }
    return text;
  }
  const children = (node.content ?? []).map(renderNode);
  return node.type === "paragraph" ? h("p", {}, children) : children;
}

/** Renders basic compact JSON as escaped Vue nodes, including during SSR. */
export const LoomaCompactContent = defineComponent({
  name: "LoomaCompactContent",
  props: { content: { type: Object as PropType<JSONContent>, required: true } },
  setup: props => () => h("div", { class: "looma-compact-content" }, [renderNode(props.content)]),
});
