import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Primitives/ui-toast-region",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-toast-region"),
  parameters: createComponentDocsParameters("ui-toast-region"),
  render: ({ open }) => `
    <ui-toast-region ${open ? "open" : ""}>
      <div id="story-toast" data-ui-toast>
        Saved successfully.
        <button type="button" data-ui-toast-dismiss aria-label="Dismiss">Dismiss</button>
      </div>
    </ui-toast-region>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true
  }
};
