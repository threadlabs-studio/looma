import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/Container",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-container"),
  parameters: createComponentDocsParameters("ui-container"),
  render: ({ measure, gutters }) => `
    <ui-container measure="${measure}" gutters="${gutters}">
      <h2 style="margin: 0;">Centered Content</h2>
      <p style="margin: 0.5rem 0 0;">Readable measure and consistent gutters.</p>
    </ui-container>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    measure: "wide",
    gutters: "m"
  }
};
