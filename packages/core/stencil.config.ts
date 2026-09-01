import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'looma',
  tsconfig: 'tsconfig.stencil.json',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'single-export-module',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
  ],
};
