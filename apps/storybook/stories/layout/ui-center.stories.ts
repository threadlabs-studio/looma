import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-center",
  tags: ["autodocs"],
  argTypes: {
    measure: { control: "text" },
    gutters: { control: "text" }
  },
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
