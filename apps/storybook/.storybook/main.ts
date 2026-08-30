import type { StorybookConfig } from "@storybook/web-components-vite";
import type { RollupLog } from "rollup";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/web-components-vite",
    options: {}
  },
  docs: {
    autodocs: "tag"
  },
  viteFinal: async (viteConfig) => {
    const existingOnWarn = viteConfig.build?.rollupOptions?.onwarn;
    return {
      ...viteConfig,
      build: {
        ...viteConfig.build,
        // Storybook's docs renderer is intentionally one large internal chunk.
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
          ...viteConfig.build?.rollupOptions,
          onwarn(warning: RollupLog, warn) {
            const isKnownStorybookRuntimeEval =
              warning.code === "EVAL" &&
              warning.id?.includes("@storybook/core/dist/preview/runtime.js");
            if (isKnownStorybookRuntimeEval) {
              return;
            }
            if (typeof existingOnWarn === "function") {
              existingOnWarn(warning, warn);
              return;
            }
            warn(warning);
          }
        }
      }
    };
  }
};

export default config;
