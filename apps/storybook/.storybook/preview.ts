import type { Preview } from "@storybook/web-components-vite";

import "./preview.css";
import { withOverlayAnimation } from "./overlay-animate";
import "../../../packages/tokens/src/tokens.css";
import "../../../packages/tokens/src/theme-light.css";
import "../../../packages/tokens/src/theme-dark.css";
import "../../../packages/layout/src/layout.css";
import "../../../packages/core/src/styles.css";
import "../../../packages/editor/src/editor.css";
import { defineCustomElements } from "@threadlabs/looma-core/loader";
import "../../../packages/layout/src/index.ts";
import "../../../packages/core/src/index.ts";
import "../../../packages/editor/src/index.ts";

defineCustomElements();

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
