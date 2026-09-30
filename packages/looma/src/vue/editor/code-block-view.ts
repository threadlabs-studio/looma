import type { NodeViewProps } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { createLowlight } from "lowlight";
import { computed, defineComponent, h } from "vue";
import type { LoomaCodeLanguages } from "@threadlabs/looma/editor";
import { Combobox } from "@threadlabs/looma/vue";

/** Per-block language control; the document stores only the code and explicit language. */
export function createCodeBlockView(languages: LoomaCodeLanguages, isEditable: () => boolean) {
  const lowlight = createLowlight(languages);
  const names = Object.keys(languages).sort();

  return defineComponent({
    name: "LoomaCodeBlockView",
    props: nodeViewProps,
    setup(props: NodeViewProps) {
      const selected = computed(() => {
        const language = props.node.attrs.language;
        return typeof language === "string" && language ? language : "auto";
      });
      const detected = computed(() => {
        if (!props.node.textContent.trim()) return null;
        const language = lowlight.highlightAuto(props.node.textContent).data?.language;
        return typeof language === "string" ? language : null;
      });
      const options = computed(() => [
        { id: "auto", value: "auto", label: detected.value ? `Auto (${detected.value.toUpperCase()})` : "Auto" },
        ...(selected.value !== "auto" && !Object.hasOwn(languages, selected.value)
          ? [{ id: selected.value, value: selected.value, label: `${selected.value.toUpperCase()} (unavailable)` }]
          : []),
        ...names.map((name) => ({ id: name, value: name, label: name.toUpperCase() })),
      ]);
      const choose = (detail: { value: string | null; kind: string }) => {
        if (detail.kind !== "selection" || !detail.value) return;
        const language = detail.value === "auto" ? null : detail.value;
        if (language !== null && !Object.hasOwn(languages, language)) return;
        props.editor.view.dispatch(closeHistory(props.editor.state.tr));
        props.updateAttributes({ language });
        props.editor.view.dispatch(closeHistory(props.editor.state.tr));
      };

      const showControl = () => names.length > 0 && isEditable() && props.editor.isEditable;

      return () => h(NodeViewWrapper, {
        as: "pre",
        spellcheck: "false",
        class: showControl() ? "looma-editor__code-block--has-language" : undefined,
      }, () => [
        showControl()
          ? h("div", { class: "looma-editor__code-language", contenteditable: "false" }, [
              h(Combobox, {
                label: "Code language",
                labelVisibility: "sr-only",
                size: "sm",
                disclosure: true,
                filter: "label",
                value: selected.value,
                onValueChange: choose,
              }, () => options.value.map((option) =>
                h("option", { value: option.value }, option.label))),
            ])
          : null,
        h(NodeViewContent, { as: "code" }),
      ]);
    },
  });
}
