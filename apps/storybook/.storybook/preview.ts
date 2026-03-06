import type { Preview } from "@storybook/web-components-vite";

import "@ui/tokens/tokens.css";
import "@ui/tokens/theme-light.css";
import "@ui/tokens/theme-dark.css";
import "@ui/layout/layout.css";
import "@ui/core/styles.css";
import "@ui/layout";
import "@ui/core";

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
