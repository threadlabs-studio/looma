import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Display/Tabs",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tabs"),
  parameters: createComponentDocsParameters("ui-tabs"),
  render: ({ orientation }) => `
    <ui-tabs orientation="${orientation}">
      <div role="tablist" aria-label="Sections">
        <ui-button><button role="tab" id="tab-a" aria-controls="panel-a">Overview</button></ui-button>
        <ui-button><button role="tab" id="tab-b" aria-controls="panel-b">Details</button></ui-button>
      </div>
      <section role="tabpanel" id="panel-a" aria-labelledby="tab-a">Overview content</section>
      <section role="tabpanel" id="panel-b" aria-labelledby="tab-b" hidden>Details content</section>
    </ui-tabs>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: "horizontal"
  }
};
