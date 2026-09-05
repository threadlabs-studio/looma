import type { Editor, JSONContent } from "@tiptap/core";
import { LOOMA_ICONS, type LoomaIconName } from "@threadlabs/looma-core";
import { Button, Popover } from "@threadlabs/looma-vue";
import { EditorInsertTableGrid, LoomaEditor } from "@threadlabs/looma-vue/editor";
import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createApp, defineComponent, h, ref, useId, type App } from "vue";

type PlaygroundArgs = {
  pickerOpen: boolean;
  rows: number;
  cols: number;
};

function icon(name: LoomaIconName) {
  return h("svg", {
    class: "looma-icon",
    "data-looma-icon": name,
    "aria-hidden": "true",
    focusable: "false",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }, LOOMA_ICONS[name].map(([tag, attributes]) => h(tag, attributes)));
}

function paragraph(text: string): JSONContent {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function tableCell(text: string, header: boolean): JSONContent {
  return {
    type: header ? "tableHeader" : "tableCell",
    attrs: { colspan: 1, rowspan: 1, colwidth: null, backgroundColor: null, textAlign: "left" },
    content: [paragraph(text)],
  };
}

function initialDocument(rows: number, cols: number): JSONContent {
  const boundedRows = Math.max(2, Math.min(6, rows));
  const boundedCols = Math.max(2, Math.min(6, cols));
  return {
    type: "doc",
    content: [
      paragraph("Select this sentence for formatting controls, or work directly in the table below."),
      {
        type: "table",
        content: Array.from({ length: boundedRows }, (_, rowIndex) => ({
          type: "tableRow",
          content: Array.from({ length: boundedCols }, (_, columnIndex) => tableCell(
            rowIndex === 0
              ? `Column ${columnIndex + 1}`
              : `Row ${rowIndex}, cell ${columnIndex + 1}`,
            rowIndex === 0,
          )),
        })),
      },
      paragraph("Hover a cell for row and column handles. Click into it for cell actions. Hover a column boundary to resize."),
    ],
  };
}

const TablePlaygroundApp = defineComponent({
  props: {
    initialPickerOpen: { type: Boolean, default: true },
    rows: { type: Number, default: 3 },
    cols: { type: Number, default: 4 },
  },
  setup(props) {
    const editor = ref<Editor | null>(null);
    const pickerOpen = ref(props.initialPickerOpen);
    const pickerAnchorId = `looma-table-playground-picker-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const document = ref(initialDocument(props.rows, props.cols));
    const status = ref("Ready — the controls below are connected to the real Looma editor.");

    return () => h("main", { class: "table-primitives-playground" }, [
      h("header", { class: "table-primitives-playground__header" }, [
        h("div", [
          h("h2", "Table interaction playground"),
          h("p", "This is the shipped editor behavior, not a fixed-state component display."),
        ]),
        h("div", { class: "table-primitives-playground__insert" }, [
          h(Button, { id: pickerAnchorId, variant: "ghost" }, {
            default: () => h("button", {
              type: "button",
              "aria-expanded": pickerOpen.value ? "true" : "false",
              onClick: () => { pickerOpen.value = !pickerOpen.value; },
            }, [icon("table"), h("span", "Insert table"), icon("chevron-down")]),
          }),
          h(Popover, {
            class: "table-primitives-playground__picker",
            open: pickerOpen.value,
            for: pickerAnchorId,
            placement: "bottom-end",
            onClose: () => { pickerOpen.value = false; },
          }, () => [
                h(EditorInsertTableGrid, {
                  open: true,
                  "max-rows": 6,
                  "max-cols": 6,
                  onInsertTable: (detail: { rows: number; cols: number; withHeaderRow: boolean }) => {
                    editor.value?.chain().focus().insertTable(detail).run();
                    pickerOpen.value = false;
                    status.value = `Inserted a ${detail.rows} × ${detail.cols} table${detail.withHeaderRow ? " with a header row" : ""}.`;
                  },
                }),
              ]),
        ]),
      ]),
      h("section", { class: "table-primitives-playground__editor", "aria-label": "Interactive editor" }, [
        h(LoomaEditor, {
          modelValue: document.value,
          "onUpdate:modelValue": (value: JSONContent) => { document.value = value; },
          onReady: (instance: Editor) => { editor.value = instance; },
        }),
      ]),
      h("p", { class: "table-primitives-playground__status", role: "status" }, status.value),
    ]);
  },
});

const HOST_TAG = "looma-table-primitives-playground";

if (!customElements.get(HOST_TAG)) {
  customElements.define(HOST_TAG, class extends HTMLElement {
    #app: App<Element> | null = null;

    connectedCallback() {
      if (this.#app) return;
      this.#app = createApp(TablePlaygroundApp, {
        initialPickerOpen: this.hasAttribute("picker-open"),
        rows: Number(this.getAttribute("rows") ?? 3),
        cols: Number(this.getAttribute("cols") ?? 4),
      });
      this.#app.mount(this);
    }

    disconnectedCallback() {
      this.#app?.unmount();
      this.#app = null;
    }
  });
}

const meta = {
  title: "Editor/Table Primitives Playground",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A real Looma editor table flow. Hover cells, edit a cell, open its actions, drag column widths, and insert another table."
      }
    }
  },
  argTypes: {
    pickerOpen: { control: "boolean" },
    rows: { control: { type: "range", min: 2, max: 6, step: 1 } },
    cols: { control: { type: "range", min: 2, max: 6, step: 1 } }
  },
  render: ({ pickerOpen, rows, cols }: PlaygroundArgs) => {
    const root = document.createElement(HOST_TAG);
    if (pickerOpen) root.setAttribute("picker-open", "");
    root.setAttribute("rows", String(rows));
    root.setAttribute("cols", String(cols));
    return root;
  }
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pickerOpen: false,
    rows: 3,
    cols: 4,
  },
};
