import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Forms/Form Showcase",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Example form combining form-field, input, checkbox, switch, and validation states."
      }
    }
  },
  render: () => `
    <form style="max-width: 20rem; display: flex; flex-direction: column; gap: var(--ui-space-4);">
      <ui-form-field required>
        <label for="showcase-email">Email</label>
        <ui-input>
          <input id="showcase-email" name="email" type="email" placeholder="you@example.com" />
        </ui-input>
        <small data-slot="help">We only use this for account notifications.</small>
      </ui-form-field>

      <ui-form-field invalid>
        <label for="showcase-password">Password</label>
        <ui-input>
          <input id="showcase-password" name="password" type="password" />
        </ui-input>
        <small data-slot="help">At least 8 characters.</small>
        <small data-slot="error">Password must be at least 8 characters.</small>
      </ui-form-field>

      <ui-checkbox>
        <label>
          <input type="checkbox" name="newsletter" />
          <span>Receive product updates</span>
        </label>
      </ui-checkbox>

      <ui-switch>
        <input type="checkbox" name="notifications" />
        Enable notifications
      </ui-switch>

      <div style="display: flex; gap: var(--ui-space-2); margin-top: var(--ui-space-2);">
        <ui-button variant="solid">
          <button type="submit">Sign up</button>
        </ui-button>
        <ui-button variant="ghost">
          <button type="button">Cancel</button>
        </ui-button>
      </div>
    </form>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithValidation: Story = {};
