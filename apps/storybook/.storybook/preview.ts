import type { Preview } from "@storybook/web-components-vite";

import "@looma/tokens/tokens.css";
import "@looma/tokens/theme-light.css";
import "@looma/tokens/theme-dark.css";
import "@looma/layout/layout.css";
import "@looma/core/styles.css";
import "@looma/layout";
import "@looma/core";

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true
    },
    options: {
      storySort: {
        order: ["Layout", "Primitives", "Essentials"]
      }
    }
  }
};

export default preview;
