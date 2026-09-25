import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Primitives/List",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-list"),
  parameters: createComponentDocsParameters("ui-list"),
  render: ({ layout }) => `
    <ui-list layout="${layout}" aria-label="Pages">
      ${["Roadmap", "Onboarding", "Glossary"].map((title) => `
        <ui-list-item variant="${layout === "grid" ? "card" : "row"}">
          <ui-icon slot="leading" name="file-text"></ui-icon>
          <a href="#${title.toLowerCase()}">${title}</a>
          <span slot="description">Edited 2h ago</span>
        </ui-list-item>`).join("")}
    </ui-list>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { layout: "rows" } };
export const Grid: Story = { args: { layout: "grid" } };
