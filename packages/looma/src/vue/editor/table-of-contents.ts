import type { NodeViewRenderer } from "@tiptap/core";
import { createApp, computed, h, ref, shallowRef } from "vue";
import { Button, Cluster, FormField, Icon, IconButton, List, Menu, MenuItem, Popover, Stack, Text } from "@threadlabs/looma/vue";
import { getTableOfContentsEntries, normalizeTableOfContentsConfig, type LoomaTableOfContentsConfig } from "@threadlabs/looma/editor";
import { navigateTableOfContents, tableOfContentsTree } from "../../editor/extensions/table-of-contents";

let tocSequence = 0;

/**
 * Composes TOC presentation and settings from the same controls as link editing.
 * @lifecycle Each node owns a Vue app and document subscriptions, all released
 * by its node-view destroy callback. Only configuration enters editor state.
 */
export const tableOfContentsNodeView: NodeViewRenderer = ({ editor, node, getPos }) => {
  const dom = document.createElement("div");
  dom.contentEditable = "false";
  const current = shallowRef(node);
  const doc = shallowRef(editor.state.doc);
  const editable = ref(editor.isEditable);
  const refresh = () => { doc.value = editor.state.doc; editable.value = editor.isEditable; };
  const app = createApp({
    setup() {
      const id = `looma-toc-${++tocSequence}`;
      const open = ref(false);
      const draft = ref<LoomaTableOfContentsConfig>(normalizeTableOfContentsConfig(current.value.attrs));
      const config = computed(() => normalizeTableOfContentsConfig(current.value.attrs));
      const branches = computed(() => tableOfContentsTree(getTableOfContentsEntries(doc.value, config.value.depth)));
      const begin = () => { draft.value = { ...config.value }; open.value = true; };
      const cancel = () => { open.value = false; };
      const save = () => {
        const position = getPos();
        if (typeof position !== "number" || !editor.isEditable) return;
        const existing = editor.state.doc.nodeAt(position);
        if (existing?.type.name !== "loomaTableOfContents") return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, normalizeTableOfContentsConfig(draft.value)));
        open.value = false;
        editor.commands.focus();
      };
      const list = (items: ReturnType<typeof tableOfContentsTree>): ReturnType<typeof h> => h(List, {
        as: config.value.format === "numbered" ? "ol" : "ul",
        markers: config.value.format === "bulleted" ? "disc" : "none",
        density: "compact",
      }, () => items.map(({ entry, children }) => h("li", { key: entry.id }, [
        h(Button, { as: "a", href: `#${entry.id}`, variant: "link", tone: "neutral", size: "sm", onClick: (event: MouseEvent) => {
          event.preventDefault(); navigateTableOfContents(editor, entry.id);
        } }, () => h(Text, { as: "span", wrap: "anywhere" }, () => entry.text)),
        children.length ? list(children) : null,
      ])));
      const formatLabels = { plain: "Plain", bulleted: "Bulleted", numbered: "Numbered" } as const;
      const dropdown = (field: "format" | "depth") => {
        const label = field === "format" ? "Formatting" : "Heading depth";
        const trigger = `${id}-${field}`;
        const options = field === "format"
          ? Object.entries(formatLabels).map(([value, text]) => ({ value, text }))
          : [1, 2, 3].map(value => ({ value: String(value), text: `Through heading ${value}` }));
        return h(FormField, {}, {
          label: () => h("label", { for: trigger }, label),
          default: () => [
            h(Button, { id: trigger, variant: "outline", tone: "neutral", size: "sm", stretch: true, align: "start", "aria-label": label }, () => h(Cluster, { justify: "between", gap: "s" }, () => [
              field === "format" ? formatLabels[draft.value.format] : `Through heading ${draft.value.depth}`,
              h(Icon, { name: "chevron-down", size: "sm" }),
            ])),
            h(Menu, { for: trigger, size: "sm", "aria-label": label, onSelect: (event: CustomEvent<{ value: string }>) => {
              draft.value = normalizeTableOfContentsConfig({ ...draft.value, [field]: field === "depth" ? Number(event.detail.value) : event.detail.value });
            } }, () => options.map(option => h(MenuItem, {
              value: option.value, type: "radio", checked: String(draft.value[field]) === option.value,
            }, () => option.text))),
          ],
        });
      };
      return () => h("nav", { "data-looma-toc": "", "data-format": config.value.format, "data-depth": config.value.depth, "aria-label": "Table of contents" }, [
        h(Stack, { gap: "s" }, () => [
          h(Cluster, { justify: "between", gap: "s" }, () => [
            h(Text, { as: "strong", size: "sm", weight: "semibold" }, () => "Table of contents"),
            editable.value ? h(IconButton, { id, label: "Table of contents settings", variant: "ghost", size: "sm" }, () => h(Icon, { name: "settings", size: "sm" })) : null,
          ]),
          branches.value.length ? list(branches.value) : h(Text, { size: "sm", tone: "secondary" }, () => "Add headings to build your table of contents."),
          editable.value ? h(Popover, { for: id, open: open.value, size: "sm", "aria-label": "Table of contents settings", onOpen: begin, onClose: cancel }, () => h(Stack, { gap: "s" }, () => [
            h(Text, { as: "strong", size: "sm", weight: "semibold" }, () => "Table of contents"),
            dropdown("format"), dropdown("depth"),
            h(Cluster, { justify: "end", gap: "xs" }, () => [
              h(Button, { variant: "ghost", tone: "neutral", size: "sm", onClick: cancel }, () => "Cancel"),
              h(Button, { variant: "solid", size: "sm", onClick: save }, () => "Save"),
            ]),
          ])) : null,
        ]),
      ]);
    },
  });
  editor.on("transaction", refresh);
  editor.on("update", refresh);
  app.mount(dom);
  return {
    dom,
    update(next) { if (next.type !== current.value.type) return false; current.value = next; refresh(); return true; },
    stopEvent: () => true,
    ignoreMutation: () => true,
    destroy() { editor.off("transaction", refresh); editor.off("update", refresh); app.unmount(); },
  };
};
