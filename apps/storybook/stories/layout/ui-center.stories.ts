import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/ui-center",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-center"),
  parameters: createComponentDocsParameters("ui-center"),
  render: ({ measure, gutters }) => `
    <ui-center measure="${measure}" gutters="${gutters}">
      <h2 style="margin: 0;">Centered Content</h2>
      <p style="margin: 0.5rem 0 0;">Readable measure and consistent gutters.</p>
    </ui-center>
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
