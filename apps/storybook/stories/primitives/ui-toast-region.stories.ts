import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/Toast Region",
  tags: ["autodocs"],
  argTypes: {
    ...createComponentArgTypes("ui-toast-region"),
    max: {
      control: "number",
      description: "Max visible toasts; older toasts are hidden."
    }
  },
  parameters: createComponentDocsParameters("ui-toast-region"),
  render: ({ open, max }) => `
    <ui-toast-region ${open ? "open" : ""} ${typeof max === "number" ? `max="${max}"` : ""}>
      <div data-ui-toast>
        Saved successfully.
        <ui-button><button type="button" data-ui-toast-dismiss aria-label="Dismiss">Dismiss</button></ui-button>
      </div>
      <div data-ui-toast>
        Another notification.
        <ui-button><button type="button" data-ui-toast-dismiss aria-label="Dismiss">Dismiss</button></ui-button>
      </div>
      <div data-ui-toast>
        Third toast.
        <ui-button><button type="button" data-ui-toast-dismiss aria-label="Dismiss">Dismiss</button></ui-button>
      </div>
    </ui-toast-region>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    max: 5
  }
};

export const MaxTwo: Story = {
  args: {
    open: true,
    max: 2
  }
};
