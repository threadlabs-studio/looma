export const RELEASE_VERSION = "0.53.26";
export const RELEASE_PACKAGES = [
  {
    name: "@threadlabs/looma",
    directory: "packages/looma",
    requiredFiles: [
      "package/package.json",
      "package/README.md",
      "package/LICENSE",
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/components/shared/input-modality.js",
      "package/components/shared/input-modality.d.ts",
      "package/components/shared/behaviors.js",
      "package/components/shared/behaviors.d.ts",
      "package/components/shared/collection-navigation.js",
      "package/components/shared/collection-navigation.d.ts",
      "package/components/shared/deferred-focus.js",
      "package/components/shared/deferred-focus.d.ts",
      "package/blocks/editor-workspace.html",
      "package/blocks/editor-workspace.js",
      "package/blocks/list-detail.html",
      "package/blocks/list-detail.js",
      "package/blocks/settings-form.html",
      "package/blocks/settings-form.js",
      "package/blocks/search-and-open.html",
      "package/blocks/search-and-open.js",
      "package/editor/index.js",
      "package/editor/index.d.ts",
      "package/editor/compact.js",
      "package/editor/compact.d.ts",
      "package/components/ui-editor/ui-editor.html",
      "package/components/ui-compact-editor/ui-compact-editor.html",
      "package/components/ui-compact-content/ui-compact-content.html",
      "package/editor/expressmark.js",
      "package/editor/expressmark.d.ts",
      "package/editor/ui.js",
      "package/editor/ui.d.ts",
      "package/editor/extensions/index.js",
      "package/editor/extensions/index.d.ts",
      "package/markdown/index.js",
      "package/markdown/index.d.ts",
      "package/markdown/fixtures.js",
      "package/markdown/fixtures.d.ts",
      "package/vanilla/index.js",
      "package/components/ui-button/ui-button.html",
      "package/tokens.css",
      "package/theme-light.css",
      "package/theme-dark.css",
      "package/theme-high-contrast.css",
      "package/theme-system.css",
      "package/docs/catalog.json"
    ]
  },
  {
    name: "@threadlabs/looma-docs",
    directory: "packages/looma-docs",
    requiredFiles: ["package/package.json", "package/README.md", "package/LICENSE", "package/bin/looma-docs.mjs", "package/docs/index.mjs", "package/docs/index.d.ts", "package/docs/cli.mjs", "package/docs/README.md"]
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

/** A prerelease publishes under `next`, so `latest` always means the newest stable release. */
export function distTag(version) {
  return version.includes("-") ? "next" : "latest";
}
