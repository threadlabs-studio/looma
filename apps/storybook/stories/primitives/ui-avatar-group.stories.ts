import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const avatarMarkup = (name: string, src: string) =>
  `<ui-avatar name="${name}" src="${src}" alt="${name}"><img /><span data-ui-avatar-fallback></span></ui-avatar>`;

const meta = {
  title: "Display/Avatar Group",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-avatar-group"),
  parameters: createComponentDocsParameters("ui-avatar-group"),
  render: ({ max, label }) => {
    const names = ["Alex Morgan", "Sam Chen", "Jordan Lee", "Riley Kim", "Casey Drew", "Jamie Fox", "Quinn Bell"];
    const avatars = names.map((name, i) => avatarMarkup(name, `https://i.pravatar.cc/64?u=${i}`)).join("");
    return `<ui-avatar-group max="${max}" label="${label}">${avatars}</ui-avatar-group>`;
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    max: 5,
    label: "People"
  }
};

export const WithOverflow: Story = {
  args: {
    max: 3,
    label: "Collaborators"
  }
};
