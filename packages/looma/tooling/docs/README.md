---
title: Weave your design system
---

# Weave your design system

Looma ships the documentation generator and theme customizer used by its public site. Run it in your project to browse Looma and your own HTML Next components as one design system. The customizer uses the same authored component cards as the reference.

## Start a local design system

In a project with a `package.json`, install Looma and its documentation tools:

```sh
pnpm add @threadlabs/looma @nextwebwg/html-next@1.0.0-alpha.69
pnpm add -D markupress @nextwebwg/htmlkit@1.0.0-alpha.69 vite
pnpm exec looma-docs init --title "The Fellowship"
pnpm exec looma-docs dev
```

Use the tool versions accepted by Looma's optional peer dependencies. Regular component imports do not load the documentation server. Vue and Tiptap remain optional; install them when your own authored documentation mounts the Vue editor.

Initialization creates three project-owned files:

| File | Purpose |
| --- | --- |
| `looma.docs.json` | Documentation title, content, discovery roots and theme paths. |
| `looma.theme.json` | Editable semantic decisions. |
| `looma.theme.css` | Generated theme, including the shared derivation rules. |

Import `./looma.theme.css` after Looma's tokens and palette in your application's entry point. The initializer prints that import; it leaves existing application files intact. Commit the configuration, recipe and CSS. Add `.looma/` to your project's ignore file: it contains disposable generated documentation and tooling files.

Open the local address printed by `dev`, choose **Customize**, and save your theme. Saving updates those shared theme files and rebuilds the documentation. Your application consumes the same CSS import. A static or public site instead offers CSS and recipe downloads.

```sh
pnpm exec looma-docs build
pnpm exec looma-docs preview
```

`build` produces a static HTMLKit site in the configured output directory. `preview` serves that output without a repository writer. All commands accept `--root`; `dev` and `preview` also accept `--port`.

## Change the rule, keep the family consistent

The authoring model groups shared decisions as Colour, Type, Size & spacing, Material and Motion. The controls expose shared intent: a control size, spaciousness, corners, inner and outer depth, and response pace.

The generated values follow rules. Small and large control heights follow a ratio around the shared control size. Spacing follows an independent curve: linear at 1, increasingly curved toward 2, with stable endpoints so the largest gaps do not grow without bound. Depth generates families of shadows; it does not add motion amplitude. Fields and buttons with the same size setting use the same box height, while content can still grow when it needs more room.

Choose a coordinated palette to change related paper, ink and action seeds together without changing geometry or motion. Palette seeds remain available for precise edits; the light/dark range previews and resolved values explain readability adjustments.

Number controls accept arithmetic such as `42px / 1.2` or `150ms * 2`, calculate on entry and show the result. Unit changes preserve the quantity. Sliders include exact entry, and curve handles support dragging and arrow keys alongside numeric coordinates.

Lengths retain their CSS units, such as `rem`; times retain `ms` or `s`. The downloaded CSS includes the canonical shared recipe as well as your inputs. Import a downloaded JSON recipe to continue editing it. Keep hand-written CSS in a separate overrides file so regenerating the theme does not replace it.

Changes apply throughout the documentation and remain in this browser across navigation and reload until reset. Repository files change only when you save locally. Starting points update the shell and all selected cards. Reset returns to the repository baseline. Invalid input keeps the last valid preview and explains which decision needs attention.

Text offers body, display, heading, label, caption, eyebrow and code roles. Choose a heading's document level with `as` independently from its visual role. Button and IconButton keep appearance and tone independent, with four optional shortcuts: primary (solid accent), standard (solid neutral), quiet (ghost neutral) and destructive (solid danger). A named preset takes precedence over the separate choices; `preset="none"` preserves their existing defaults.

Glassiness and surface separation govern floating surfaces and the Card glass variant. Popup purpose and measured size refine the shared treatment. Decorative material can transmit the scene; the content plane remains opaque and readable, with opaque fallbacks for reduced transparency and unsupported backdrop filtering.

## Use light, dark, or both

Every generated theme includes a coordinated light/dark pair. The type, geometry and motion decisions stay shared. Both palettes derive readable text, outlines, focus and action states from the same identity; the generator may adjust requested color seeds to maintain contrast.

Load the generated CSS after Looma's tokens and palette. Choose how it runs:

- **System preference:** leave `data-theme` off the document root. The CSS follows the operating system automatically.
- **Light only:** set `<html data-theme="light">`.
- **Dark only:** set `<html data-theme="dark">`.
- **User switch:** set the root attribute to `light` or `dark`, and remove it to return to system preference. Persist that choice in your application if desired.

Fixed-mode applications still receive both palettes. A mode boundary applies to its descendants, so a dark panel can contain a light subsection without changing the page or its siblings:

```html
<section data-theme="dark">
  <h2>After-hours Fellowship office</h2>
  <div data-theme="light">Sam's daylight reading area</div>
</section>
```

Use the public semantic color properties inside those regions. A floating surface moved elsewhere in the DOM must retain its originating mode boundary; Looma's isolated documentation previews receive their card's mode automatically.

## Add your components

Opt into source directories in `looma.docs.json`:

```json
{
  "title": "The Fellowship",
  "base": "/",
  "outDir": ".looma/site",
  "content": "docs",
  "theme": { "recipe": "looma.theme.json", "css": "looma.theme.css" },
  "components": [{ "directory": "app/components", "packageName": "fellowship-ui" }],
  "overrides": ["styles/design-system-overrides.css"]
}
```

`content` and `overrides` are optional. Create files you configure before building. Markdown guidance supplements the generated reference; it cannot replace an API page. Relative component and asset dependencies keep their original project locations, and code examples remain literal. Local web fonts referenced by override CSS are embedded in the documentation's theme stylesheet so isolated examples render the same fonts on static hosts. Load your chosen web fonts in the consuming application; downloaded theme CSS selects their font families.

A resource can use any valid HTML Next component tag:

```html
<template component="office-status">
  <defs>
    <prop name="label" type="string" default="Ready">The team's current status.</prop>
  </defs>
  <p>{$label}<slot></slot></p>
</template>
```

Place a `docs.json` beside it to join a shared category:

```json
{
  "title": "Office status",
  "description": "A status for the Fellowship office.",
  "group": "display"
}
```

Looma's category IDs are listed in its published catalog. Components without a category appear in **Project components**. A discovery root can declare additional `groups` as `{ "id": "…", "label": "…" }` entries. The top-level `categories` mapping explicitly maps category IDs when combining catalogs.

Put authored examples in an `examples/` directory beside the resource. Each `.html` example starts with a metadata comment:

```html
<!--
title: Ready for second breakfast
description: Sam has finished the morning checklist.
-->
<office-status label="Ready for second breakfast"></office-status>
```

The example appears in both the reference and the customizer's selection list. Optional `.behavior.js` or `.behavior.ts` companions export a default setup function receiving the example root; return a cleanup function when needed. Add `preview: resizable` to expose the shared card's width control. Framework-specific `.snippet.html` and `.vue` companions provide literal source views.

Discovery reads definitions and descriptions without executing their controllers. New resources under a selected root appear after the local server rebuilds. External components keep their own contracts and supported token hooks; discovery does not invent a Vue adapter or make arbitrary components respond to Looma's tokens.

## Combine installed catalogs

A library can publish the versioned catalog shape exposed by `@threadlabs/looma/docs/catalog.json`. Add package exports or relative JSON files under `catalogs` in the configuration. Component identities are package-qualified; duplicate tags, conflicting categories and missing compound parents fail with ownership information instead of silently replacing a component.

Use the `@threadlabs/looma/docs` entrypoint for programmatic discovery, catalog merging, theme validation, and build/dev/preview integration. Its TypeScript definitions describe the configuration and catalog interfaces. The browser card renderer, catalog data and compiled example companions ship in the package.

## Saving and recovery

The local editor writes only the configured recipe and CSS inside the project. It rejects symlink paths, generated or dependency directories, cross-origin save requests and stale file revisions. A competing edit leaves your unsaved preview in place; reload and reconcile it before saving again. Examples run in isolated frames and receive theme CSS, never the local editing capability.

The writer stages complete files, serializes saves with a project lock, and rolls back the recipe if replacing the CSS fails. If a process stops during a save or build, close the old editor before removing its `.looma/theme-write.lock` or `.looma/docs-build.lock`; restart and save the loaded recipe to regenerate a consistent pair. Change the server base, output directory or theme-file paths by restarting `dev`.
