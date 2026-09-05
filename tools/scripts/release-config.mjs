export const RELEASE_VERSION = "0.1.18";
export const RELEASE_PACKAGES = [
  {
    name: "@threadlabs/looma",
    directory: "packages/looma",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/LICENSE",
      "package/dist/index.js",
      "package/dist/index.cjs",
      "package/dist/index.d.ts",
      "package/loader/index.js",
      "package/loader/index.d.ts",
      "package/layout/index.js",
      "package/layout/index.cjs",
      "package/layout/index.d.ts",
      "package/editor/index.js",
      "package/editor/index.d.ts",
      "package/editor/ui.js",
      "package/editor/ui.d.ts",
      "package/editor/extensions/index.js",
      "package/editor/extensions/index.d.ts",
      "package/vue/editor/index.js",
      "package/vue/editor/index.d.ts",
      "package/vue/index.js",
      "package/vue/index.d.ts",
      "package/tokens.css",
      "package/theme-light.css",
      "package/theme-dark.css",
      "package/theme-high-contrast.css",
      "package/layout.css",
      "package/styles.css",
      "package/editor.css"
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
