import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/Dialog",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-dialog"),
  parameters: createComponentDocsParameters("ui-dialog"),
  render: ({ open, modal, dismissible }) => `
    <ui-dialog label="Dialog title" ${open ? "open" : ""} ${modal ? "modal" : ""} ${dismissible ? "dismissible" : ""}>
      <h3>Dialog title</h3>
      <p>Overlay contract example.</p>
      <ui-button><button type="button">Close</button></ui-button>
    </ui-dialog>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    modal: true,
    dismissible: true
  }
};
