export const RELEASE_VERSION = "0.1.0";
export const RELEASE_PACKAGES = [
  {
    name: "@looma/tokens",
    directory: "packages/tokens",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/src/tokens.css",
      "package/src/theme-light.css",
      "package/src/theme-dark.css",
      "package/src/theme-high-contrast.css"
    ]
  },
  {
    name: "@looma/layout",
    directory: "packages/layout",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/dist/index.js",
      "package/dist/index.cjs",
      "package/dist/index.d.ts",
      "package/src/layout.css"
    ]
  },
  {
    name: "@looma/core",
    directory: "packages/core",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/dist/index.js",
      "package/dist/index.cjs",
      "package/dist/types/index.d.ts",
      "package/loader/index.js",
      "package/loader/index.cjs.js",
      "package/loader/index.d.ts",
      "package/src/styles.css"
    ]
  },
  {
    name: "@looma/editor",
    directory: "packages/editor",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/extensions/index.js",
      "package/dist/extensions/index.d.ts",
      "package/src/editor.css"
    ]
  },
  {
    name: "@looma/vue",
    directory: "packages/vue",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/dist/index.js",
      "package/dist/index.d.ts"
    ]
  }
];

export const RELEASE_PACKAGE_NAMES = new Set(
  RELEASE_PACKAGES.map((releasePackage) => releasePackage.name)
);

export function assertExactReleasePackageSet(packages) {
  const actualNames = packages.map((entry) => entry?.name).toSorted();
  const expectedNames = [...RELEASE_PACKAGE_NAMES].toSorted();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error("release manifest does not contain the exact approved package set");
  }
}
