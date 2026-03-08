import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Display/Disclosure",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-disclosure"),
  parameters: createComponentDocsParameters("ui-disclosure"),
  render: ({ open, disabled }) => `
    <ui-disclosure ${open ? "open" : ""} ${disabled ? "disabled" : ""}>
      <ui-button><button type="button" aria-controls="disclosure-panel">Toggle details</button></ui-button>
      <div id="disclosure-panel" hidden>Progressive enhancement disclosure content.</div>
    </ui-disclosure>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    disabled: false
  }
};
