import type { Preview } from "@storybook/web-components-vite";

import "./preview.css";
import { withOverlayAnimation } from "./overlay-animate";
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import "@threadlabs/looma/theme-dark.css";
import "@threadlabs/looma/vue.css";
// Registers every component with the HTML Next runtime; each carries its own scoped styles.
import "@threadlabs/looma";

const preview: Preview = {
  decorators: [withOverlayAnimation],
  parameters: {
    controls: {
      expanded: true
    },
    options: {
      storySort: {
        order: ["Layout", "Forms", "Overlay", "Display", "Editor"]
      }
    }
  }
};

export default preview;
