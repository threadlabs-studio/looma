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

Use the tool versions accepted by Looma's optional peer dependencies (Markupress 0.8.5 or newer on the supported 0.8 line). Regular component imports do not load the documentation server. Vue and Tiptap remain optional; install them when your own authored documentation mounts the Vue editor.

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

The authoring model groups shared decisions as Colour, Type, Size & spacing, Material and Motion. The controls expose shared intent: control roominess relative to text, spacing, corners, inner and outer depth, and response pace.

The generated values follow rules. The medium control height is base text size times control roominess; small and large heights follow the size ratio. On touch, small rises to at least the comfortable 44px floor and medium/large grow from it, preserving the ratio. Spacing derives from base text independently of control roominess and follows its own curve: linear at 1, increasingly curved toward 2, with stable endpoints so the largest gaps do not grow without bound. Depth generates families of shadows; it does not add motion amplitude. Fields and buttons with the same size setting use the same box height, while content can still grow when it needs more room.

Choose a coordinated palette, then refine surface warmth, color intensity and palette relationship. Warmth runs from cool to warm paper and ink, with 0.5 neutral; intensity runs from quiet to vivid, with 0.5 retaining original seed intensity. Tonal keeps seed hues; neighboring and complementary relate quiet hues to the action hue. These decisions regenerate paired light/dark colors through Oklab/OKLCH operations, gamut repair and readability checks. They do not transform existing CSS colors live. Four color seeds remain available for precise edits; the light/dark range previews and resolved values explain adjustments.

The customizer uses Starting point, Palette and Material as its controls sidebar, with documentation navigation left out of this workspace. Detailed type, size and motion controls, example selection and exports open when needed.

The main customizer offers Material and Palette presets. **Refine material & light** opens a focused view with a movable light source, real component samples and bounded surface controls. **Refine palette** opens the coordinated light/dark ranges and their four color seeds. Both views edit the same theme as the main customizer. Returning to the overview, navigating to a component, or reloading keeps the result.

A refined preset keeps its name with “customized” beside it. **Restore material preset** resets only material and light; **Restore palette preset** resets only the palette. These family choices are recorded in the recipe's optional `presets` mapping. The `values` mapping remains the complete source of the generated theme; a preset is a named combination of those values.

Number controls accept arithmetic such as `1rem / 1.2` or `150ms * 2`, calculate on entry and show the result. Unit changes preserve the quantity. Sliders include exact entry, and curve handles support dragging and arrow keys alongside numeric coordinates. Light and curve drags preserve the grab offset; Escape or pointer cancellation restores the gesture start without creating a saved edit.

Lengths retain their CSS units, such as `rem`; times retain `ms` or `s`. The downloaded CSS includes the canonical shared CSS derivation rules as well as resolved theme values. Download JSON separately to retain editable decisions and font/preset provenance. Import a downloaded JSON recipe to continue editing it. Keep hand-written CSS in a separate overrides file so regenerating the theme does not replace it.

Undo and Redo move through accepted recipe changes. **Compare entry theme** temporarily previews the theme present when this customizer opened; it does not replace your edits. **Explore nearby styles** previews Warmer, Quieter, More expressive or More compact before you apply it. Palette, Material and Type & spacing locks preserve those families during variations. Cancel preview returns to the current recipe.

Changes apply throughout the documentation and remain in this browser across navigation and reload until reset. Repository files change only when you save locally. Starting points update the shell and all selected cards. Reset returns to the repository baseline. Invalid input keeps the last valid preview and explains which decision needs attention.

Text offers body, display, heading, label, caption, eyebrow and code roles. Choose a heading's document level with `as` independently from its visual role. Button and IconButton keep appearance and tone independent, with four optional shortcuts: primary (solid accent), standard (solid neutral), quiet (ghost neutral) and destructive (solid danger). A named preset takes precedence over the separate choices; `preset="none"` preserves their existing defaults.

## Theme decisions and public properties

The [public token reference](https://github.com/threadlabs-studio/looma/blob/main/apps/docs-next/docs/03.%28Foundations%29/tokens.md#optional-semantic-theme-recipe) lists defaults, customizer ranges, dependencies and derived outputs for every family. The recipe's `values` keys map to public CSS properties or generator decisions as follows. Values are strings; omitted keys take defaults and unknown keys are rejected.

| Family | Recipe decisions → CSS properties |
| --- | --- |
| Palette seeds | `action` → `--ui-accent`; `canvas` → `--ui-surface`; `surface` → `--ui-surface-raised`; `text` → `--ui-text` |
| Palette generation (recipe only) | `warmth`, `color-intensity`, `palette-relationship`; compiled into resolved color roles, with no matching CSS custom properties |
| Type | `body-font` → `--ui-font-sans`; `display-font` → `--ui-font-display`; `text-size` → `--ui-font-size`; `text-weight` → `--ui-font-medium` |
| Size & spacing | `control-roominess` → `--ui-control-roominess`; `spacing` → `--ui-spacing`; `scale-contrast` → `--ui-scale-ratio`; `space-curve` → `--ui-space-curve`; `corner-roundness` → `--ui-radius-md`; `line-weight` → `--ui-border-width` |
| Depth and transmission | `outer-depth` → `--ui-outer-depth`; `inner-depth` → `--ui-inner-depth`; `glassiness` → `--ui-glassiness`; `surface-separation` → `--ui-surface-separation`; `translucency` → `--ui-overlay-translucency` |
| Finish and illumination | `finish` → `--ui-finish`; `edge-light` → `--ui-edge-light`; `glow` → `--ui-glow`; `light-x` → `--ui-light-x`; `light-y` → `--ui-light-y`; `light-spread` → `--ui-light-spread`; `light-strength` → `--ui-light-strength` |
| Motion | `response-time` → `--ui-motion-fast`; `response-curve` → `--ui-motion-ease` |

Palette generation decisions exist only in the JSON recipe; edit it and regenerate to change resolved colors. Geometry, material and motion properties feed the included CSS recipe. `--ui-control-size` remains a derived public height role: author numeric roominess (default 2.5, range 2–4) instead of an absolute control size. Spacing (default 1, range 0.75–1.5) changes space without changing heights. Base text defaults to `1rem`. Relative length bounds use `rem` endpoints in generated CSS.

Before 1.0 there are no compatibility aliases. Migrate recipe `density` to `spacing` and CSS `--ui-density` to `--ui-spacing`. Replace length-valued recipe `control-size` with numeric `control-roominess` by dividing the desired medium height by base text size: `40px / 16px` becomes `2.5`.

## Choose fonts

**System font** is the default and uses the operating system's native `system-ui` face without a download. Search the curated Google Fonts collection for body and display roles; selected faces load in the previews. Generated/downloaded CSS and locally saved CSS include the selected Google Fonts `@import` before rules, so the consuming application loads the same faces.

An optional recipe `fonts` mapping records Google family names by `body-font` and/or `display-font`, while `values` keeps their matching CSS stacks. Import/export preserves both. The advanced **Custom font stack** field is for already loaded or self-hosted faces; it does not download fonts. Load those faces in the consuming application.

## Describe material and light

Light position is relative to each surface: horizontal and vertical positions run from 0 to 1, with 0.5, 0 at top centre. Drag the source, use its arrow keys (Shift moves faster), or enter exact percentages. Home returns it to top centre. Spread runs from a concentrated spot to broad illumination; strength controls its intensity. The source influences reflections, illuminated edges and the direction of depth shadows throughout the theme.

Depth controls elevation and recession independently from finish, transmission and motion. Finish controls how strongly a material catches a reflection, from matte to polished; it needs nonzero light strength. Light spread shapes that reflection, while position also directs shadows. A light strength of zero does not remove depth shadows. Edge light catches its boundary; glow spills softly beyond it. Glassiness and surface separation govern the decorative material around floating content, scaled by popup purpose and rendered size. The content plane stays opaque. Overlay translucency changes the shared overlay fill and decorative glass; it does not turn material content transparent. Separation can create a rim even with glassiness at zero. Reflection peaks are bounded for readable text, and reduced transparency disables the ornamental reflection and glow as well as backdrop blur.

Card keeps surface structure and decorative treatment independent:

```html
<ui-card variant="elevated">Standard subtle lift</ui-card>
<ui-card variant="elevated" treatment="expressive">Lift with the theme's material</ui-card>
<ui-card treatment="expressive">Material treatment without added lift</ui-card>
```

`treatment="standard"` is the default. Expressive treatment follows the theme: a matte theme stays opaque, while Bookish can use a light-catching frame. Card tones change colors without changing corners or adding a stripe. Solid neutral actions use quiet mode-appropriate surface fills with readable text, instead of inverted text-color fills.

To add a sample to the preview, search **Choose a component example**, select a result, then choose **Add to preview**. Existing component cards still link to the full reference.

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

Build your design-system components in HTML Next. Their definitions, description attributes, controllers and HTML examples are the source for the generated documentation and customizer cards. Use Looma’s public semantic properties to make your components respond to the same theme.

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

`content` and `overrides` are optional. Create files you configure before building. Markdown guidance supplements the generated reference; it cannot replace an API page. Relative component and asset dependencies keep their original project locations, and code examples remain literal. Local web fonts referenced by override CSS are embedded in the documentation's theme stylesheet so isolated examples render the same fonts on static hosts. Google font selections travel in the generated CSS import. Load custom or self-hosted faces in the consuming application; their stacks only select families.

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

Discovery reads definitions and descriptions without executing their controllers. New resources under a selected root appear after the local server rebuilds. External components keep their own contracts and supported token hooks; discovery does not make arbitrary components respond to Looma's tokens.

The planned HTML Next-only distribution will use the HTML Next Vite plugin or converter for Vue consumption. Author components and documentation examples in HTML Next; framework conversion belongs in the consuming application. The current package still includes Vue exports while that packaging migration is pending.

## Combine installed catalogs

A library can publish the versioned catalog shape exposed by `@threadlabs/looma/docs/catalog.json`. Add package exports or relative JSON files under `catalogs` in the configuration. Component identities are package-qualified; duplicate tags, conflicting categories and missing compound parents fail with ownership information instead of silently replacing a component.

Use the `@threadlabs/looma/docs` entrypoint for programmatic discovery, catalog merging, theme validation, and build/dev/preview integration. Its TypeScript definitions describe the configuration and catalog interfaces. The browser card renderer, catalog data and compiled example companions ship in the package.

## Saving and recovery

The local editor writes only the configured recipe and CSS inside the project. It rejects symlink paths, generated or dependency directories, cross-origin save requests and stale file revisions. A competing edit leaves your unsaved preview in place; reload and reconcile it before saving again. Examples run in isolated frames and receive theme CSS, never the local editing capability.

The writer stages complete files, serializes saves with a project lock, and rolls back the recipe if replacing the CSS fails. If a process stops during a save or build, close the old editor before removing its `.looma/theme-write.lock` or `.looma/docs-build.lock`; restart and save the loaded recipe to regenerate a consistent pair. Change the server base, output directory or theme-file paths by restarting `dev`.
