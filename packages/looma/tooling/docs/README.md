---
title: Weave your design system
---

# Weave your design system

Looma ships the documentation generator and theme customizer used by its public site. Run it in your project to browse Looma and your own HTML Next components as one design system. The customizer uses the same authored component cards as the reference.

## Start a local design system

In a project with a `package.json`, install Looma and its documentation tools:

```sh
pnpm add @threadlabs/looma @nextwebwg/html-next@1.0.0-alpha.69
pnpm add -D 'markupress@>=0.10.2 <1' '@threadlabs/markupkit@>=0.2.0 <1' vite
pnpm exec looma-docs init --title "The Fellowship"
pnpm exec looma-docs dev
```

Use the tool versions accepted by Looma's optional peer dependencies. Markupress 0.10.2 and later compatible 0.x releases supply the shared Looma site header, mobile home-page navigation, and one appearance button that cycles Automatic, Light and Dark. Regular component imports do not load the documentation server. Vue and Tiptap remain optional; install them when your own authored documentation mounts the Vue editor.

Initialization creates three project-owned files:

| File | Purpose |
| --- | --- |
| `looma.docs.json` | Documentation title, content, discovery roots and theme paths. |
| `looma.theme.json` | Editable semantic decisions. |
| `looma.theme.css` | Generated theme, including the shared derivation rules. |

Import `./looma.theme.css` after Looma's tokens and palette in your application's entry point. The initializer prints that import; it leaves existing application files intact. Commit the configuration, recipe and CSS. Add `.looma/` to your project's ignore file: it contains disposable generated documentation and tooling files.

The CSS includes generated derivation rules as well as values. Re-export or save your recipe after a Looma upgrade to adopt updated rules.

Open the local address printed by `dev`, choose **Customize**, and save your theme. Saving updates those shared theme files and rebuilds the documentation. Your application consumes the same CSS import. A static or public site instead offers CSS and recipe downloads.

Starting points set a complete identity across color, typography, shape, spacing,
material and motion. Looma is the default identity; Gold pairs a warm action color with Lato/Fraunces and restrained polished surfaces. Clear remains a neutral starting point. Palette and material refinements then change only their own
families. The compact sampler includes heading, body and supporting text beside
the controls. Search components searches your whole discovered catalog; nine
previews render initially, and **Show more components** reveals the next group.

```sh
pnpm exec looma-docs build
pnpm exec looma-docs preview
```

`build` produces a static MarkupKit site in the configured output directory. `preview` serves that output without a repository writer. All commands accept `--root`; `dev` and `preview` also accept `--port`.

## Name your local design system

`looma-docs init --title "Fellowship UI"` sets your site's name. To rename an
existing local documentation site, edit `title` in `looma.docs.json`; the local
server rebuilds the header, generated landing page and page titles with that
name. You do not need to fork Looma or change component imports.

You can also supply your logo and navigation:

```json
{
  "title": "Fellowship UI",
  "logo": {
    "light": "/assets/fellowship-light.svg",
    "dark": "/assets/fellowship-dark.svg"
  },
  "nav": [{ "label": "Our application", "href": "https://example.com" }]
}
```

Merge these fields into your existing configuration. Serve the logo URLs from
your application's public assets, such as `public/assets/`. Leave `logo` unset
for a text-only brand. To author your own introduction, set `content` to your
Markdown directory and add its `index.md`; it replaces the generated landing
page without replacing component reference pages.

The site name is yours. Component ownership stays accurate: built-in cards
still identify `@threadlabs/looma`, while your discovered components identify
the `packageName` you configure below. That is package attribution, not the
name of your design system. Shared CSS and recipe filenames are configured
under `theme`; changing a site title does not require renaming those files.

## Change the rule, keep the family consistent

The authoring model groups shared decisions as Colour, Type, Size & spacing, Material and Motion. The controls expose shared intent: control roominess relative to text, rhythm, spacing, corners, inner and outer depth, and response pace.

The generated values follow rules. The medium control height is base text size times control roominess; small and large heights follow the size ratio. Touch does not inflate the visible size ladder. Hit-area guidance is contextual and adjustable; 44px is a comfort preference for expanded targets, not a mandatory visible height. Invisible targets must not steal neighbouring controls. Rhythm coordinates vertical Stack gaps and unitless line-height multipliers. It leaves horizontal navigation and control-row gaps alone. Spacing adjusts gaps and padding independently of text ratios. Spacing derives from base text independently of control roominess and follows its own curve: linear at 1, increasingly curved toward 2, with stable endpoints so the largest gaps do not grow without bound. Depth generates families of shadows; it does not add motion amplitude. Fields and buttons with the same size setting use the same box height, while content can still grow when it needs more room.

Choose a coordinated palette, then refine surface warmth, color intensity and palette relationship. Warmth runs from cool to warm paper and ink, with 0.5 neutral; intensity runs from quiet to vivid, with 0.5 retaining original seed intensity. Keep my colors preserves the base hues; Related colors and Contrasting colors tint quiet surfaces toward neighboring and opposite hues. These decisions regenerate paired light/dark colors through Oklab/OKLCH operations, gamut repair and readability checks. They do not transform existing CSS colors live. Four base colors remain visible for precise edits. Supporting accents optionally adds second and third brand seeds. They feed `tone="accent-secondary"` and `tone="accent-tertiary"` on Button, IconButton, Badge, Card, Meter and Text, with the same derived readable text, states and material response as the primary. Unset supporting accents follow primary; the primary remains the normal action voice.

Palette details expose relationships rather than arbitrary status colors. **Neutrals & shared borders** derives restrained neutrals from text, an accent family or untinted gray, with fill strength and a shared minimum boundary contrast (default 2:1). Neutral solid/outline actions and form fields all consume `--ui-control-border` and its hover role. **Status colors** lets each role retain its semantic hue, harmonize toward the primary hue by at most 15 degrees, or use one of the three brand families. Perceptual saturation is coordinated with the primary; readability and material stops are resolved for both modes. Dark derivation separates canvas and content elevations, compensates quiet neutral fills and borders, and derives selection washes from readable contextual pigment. Subtle badges, toned cards, callouts, toasts and generated notifications share semantic background, foreground and border roles. Composed Text inherits the containing foreground; the document root supplies the normal body color. These roles provide paler light fills and visible dark tints. Optional overlay group overrides remain explicit choices instead of masking semantic defaults. There are no per-status color pickers. Words and icons preserve meaning when all statuses use one family. **Accent assignments** selects families for links, focus rings and selected rows. Light/dark specimens show these roles together, including an actual field beside the shared neutral actions.

Documentation navigation stays out of the customization workspace. **Material & light** opens a movable light source, real component samples and bounded surface controls. **Palette** opens light/dark specimens, base seeds and advanced relationship controls. Each editor changes the same persistent theme. Returning to the overview, navigating to a component, or reloading keeps the result.

Material starts with Finish, Transparency and Frosting. Advanced material contains the light source and its color, edge light, glow, depth and decorative rim extent. The quiet grid stays fixed across the customizer while the page scrolls; content plates remain opaque.

A refined preset keeps its name with “customized” beside it. **Reset material** resets only material and light; **Reset palette** resets only the palette. These family choices are recorded in the recipe's optional `presets` mapping. The `values` mapping remains the complete source of the generated theme; a preset is a named combination of those values.

Number controls accept arithmetic such as `1rem / 1.2` or `150ms * 2`, calculate on entry and show the result. Unit changes preserve the quantity. Sliders include exact entry, and curve handles support dragging and arrow keys alongside numeric coordinates. LightEditor keeps its coordinate fields under **Exact position**. Light and curve drags preserve the grab offset; Escape or pointer cancellation restores the gesture start without creating a saved edit.

Lengths retain their CSS units, such as `rem`; times retain `ms` or `s`. The downloaded CSS includes the canonical shared CSS derivation rules as well as resolved theme values. Download JSON separately to retain editable decisions and font/preset provenance. Import a downloaded JSON recipe to continue editing it. Keep hand-written CSS in a separate overrides file so regenerating the theme does not replace it.

The customizer opens on a dashboard summarizing the current starting theme, palette,
material, typography, spacing and motion. Open a summary to edit that subject; use
**Overview** to return to the same dashboard position. Only the active editor shows
its controls. Precise adjustments sit inside the relevant editor's detail sections.

Typography pairs font selection with headings and body text. Field labels follow body size by default; choose a separate label size to keep labels independent while help stays smaller. Size & spacing shows
the shared control ladder and grouped content. Motion keeps a replayable study and
a real popover beside duration and curve editing; the study follows the shared
curve, travels at three times the feedback duration, and respects reduced motion.
**Browse components** searches the complete catalog, with previews loaded in batches.
**Export & save** contains downloads, recipe import and local repository saving.

Edits apply immediately. Undo and Redo move through completed changes; Reset restores
the current starting theme. There is no separate variation preview or apply step.

Changes apply throughout the documentation and remain in this browser across navigation and reload until reset. Repository files change only when you save locally. Starting points update the shell and all selected cards. Reset restores the selected starting theme’s values and remains undoable. Removing the header’s Custom theme chip instead clears the browser override and restores the repository baseline. Invalid input keeps the last valid preview and explains which decision needs attention.

Text offers body, display, heading, label, caption, eyebrow and code roles. Choose a heading's document level with `as` independently from its visual role. Button and IconButton keep appearance and tone independent, with four optional shortcuts: primary (solid accent), standard (solid neutral), quiet (ghost neutral) and destructive (solid danger). A named preset takes precedence over the separate choices; `preset="none"` uses the separate choices. Both default to neutral; choose `tone="accent"` or `preset="primary"` explicitly for emphasis.

**Font** sets body text and controls. Headings follow it while **Heading font** is
**Same as main font**; choose a second face there for headings and display text.
Google selections preview real faces and include their import in downloaded or
locally saved CSS. System font uses the operating system and needs no download.

## Theme decisions and public properties

The [public token reference](https://github.com/threadlabs-studio/looma/blob/main/apps/docs-next/docs/03.%28Foundations%29/tokens.md#optional-semantic-theme-recipe) lists defaults, customizer ranges, dependencies and derived outputs for every family. The recipe's `values` keys map to public CSS properties or generator decisions as follows. Values are strings; omitted keys take defaults and unknown keys are rejected.

| Family | Recipe decisions → CSS properties |
| --- | --- |
| Base colors | `action` → `--ui-accent`; `canvas` → `--ui-surface`; `surface` → `--ui-surface-raised`; `text` → `--ui-text` |
| Palette generation (recipe only) | `warmth`, `color-intensity`, `palette-relationship`, optional `secondary-action`/`tertiary-action`, `neutral-source`, `neutral-strength`, `neutral-border-contrast`, `status-chroma`, each status’s `*-source`, and `selection-accent`/`focus-accent`/`link-accent`; compiled into resolved color roles, with no matching CSS custom properties |
| Type | `body-font` → `--ui-font-sans`; `display-font` → `--ui-font-display`; `text-size` → `--ui-font-size`; `label-size` → `--ui-field-label-font-size` (`inherit` follows body); `text-weight` → `--ui-font-medium` |
| Rhythm & spacing | `rhythm` → `--ui-rhythm`; `control-roominess` → `--ui-control-roominess`; `spacing` → `--ui-spacing`; `scale-contrast` → `--ui-scale-ratio`; `space-curve` → `--ui-space-curve`; `corner-roundness` → `--ui-radius-md`; `line-weight` → `--ui-border-width` |
| Depth and transmission | `outer-depth` → `--ui-outer-depth`; `inner-depth` → `--ui-inner-depth`; `glassiness` → `--ui-glassiness`; `surface-separation` → `--ui-surface-separation`; `translucency` → `--ui-overlay-translucency` |
| Finish and illumination | `finish` → `--ui-finish`; `edge-light` → `--ui-edge-light`; `glow` → `--ui-glow`; `light-x` → `--ui-light-x`; `light-y` → `--ui-light-y`; `light-spread` → `--ui-light-spread`; `light-strength` → `--ui-light-strength` |
| Motion | `response-time` → `--ui-motion-fast`; `response-curve` → `--ui-motion-ease` |

Palette generation decisions exist only in the JSON recipe; edit it and regenerate to change resolved colors. Geometry, material and motion properties feed the included CSS recipe. `--ui-control-size` remains a derived public height role: author numeric roominess (default 2.5, range 2–4) instead of an absolute control size. Spacing (default 1, range 0.75–1.5) changes space without changing heights. Base text defaults to `16px` and sets the document root. Type and geometry derive from `1rem` once; the base editor accepts only px. Other relative length inputs preserve their units; editor ranges convert through the chosen root, and generated guards keep the documented pixel bounds. Visible size samples report actual rem/px heights. Set the base on `:root`; opposite-mode boundaries retain that same rem root.

Before 1.0 there are no compatibility aliases. Migrate recipe `density` to `spacing` and CSS `--ui-density` to `--ui-spacing`. Replace length-valued recipe `control-size` with numeric `control-roominess` by dividing the desired medium height by base text size: `40px / 16px` becomes `2.5`. Base `text-size` is now px-only and sets the document root. Replace older relative base values with an explicit px value using their original root; no compatibility conversion guesses it.

## Choose fonts

**System font** is the default and uses the operating system's native `system-ui` face without a download. Search the curated Google Fonts collection for body and display roles; selected faces load in the previews. Generated/downloaded CSS and locally saved CSS include the selected Google Fonts `@import` before rules, so the consuming application loads the same faces.

An optional recipe `fonts` mapping records Google family names by `body-font` and/or `display-font`, while `values` keeps their matching CSS stacks. Import/export preserves both. The advanced **Custom font stack** field is for already loaded or self-hosted faces; it does not download fonts. Load those faces in the consuming application.

## Describe material and light

Light position is relative to each surface: horizontal and vertical positions run from 0 to 1, with 0.5, 0 at top centre. Drag the source, use its arrow keys (Shift moves faster), or enter exact percentages. Home returns it to top centre. Spread runs from a concentrated spot to broad illumination; strength controls its intensity. The source influences reflections, illuminated edges and the direction of depth shadows throughout the theme.

Depth controls elevation and recession independently from finish, transmission and motion. Finish controls how strongly a material catches a reflection, from matte to polished; it needs nonzero light strength. Light spread shapes that reflection, while position also directs shadows. A light strength of zero does not remove depth shadows. Edge light catches its boundary; glow spills beyond it. Glassiness and glow use a gently increasing lower range and an expressive upper response (`g + 2g⁴`), so the maximum can be exuberant without raising restrained defaults. Glassiness and surface separation govern the decorative material around floating content, scaled by popup purpose and rendered size. The content plane stays opaque. Overlay translucency changes the shared overlay fill and decorative glass; it does not turn material content transparent. Separation can create a rim even with glassiness at zero. Reflection peaks are bounded for readable text, and reduced transparency disables the ornamental reflection and glow as well as backdrop blur.

Card keeps surface structure and decorative treatment independent:

```html
<ui-card variant="elevated">Standard subtle lift</ui-card>
<ui-card variant="elevated" treatment="expressive">Lift with the theme's material</ui-card>
<ui-card treatment="expressive">Material treatment without added lift</ui-card>
```

`treatment="standard"` is the default. Expressive treatment follows the theme: a matte theme stays opaque, while Bookish can use a light-catching frame. Card tones change colors without changing corners or adding a stripe. Solid neutral actions use quiet mode-appropriate surface fills with readable text, instead of inverted text-color fills.

To add a sample to the preview, search **Choose a component example**, select a result, then choose **Add to preview**. Existing component cards still link to the full reference.

## Use light, dark, or both

Every generated theme includes a coordinated light/dark pair. The type, geometry and motion decisions stay shared. Both palettes derive readable text, outlines, focus and action states from the same identity; the generator may adjust requested base colors to maintain contrast.

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

Build your design-system components in HTML Next. Their definitions, description attributes, modules and HTML examples are the source for the generated documentation and customizer cards. Use Looma’s public semantic properties to make your components respond to the same theme.

1. Create a directory for your HTML Next component resources, such as `app/components`.
2. Opt that directory into `components` in `looma.docs.json`, with your package's name.
3. Put `docs.json` and an `examples/` directory beside each resource, as shown below.
4. Run `looma-docs dev`. Your components appear beside Looma's in the reference,
   search and customizer example picker. Resources under registered directories
   are rediscovered when the local server rebuilds.

The configuration can combine your name, authored guides and discovery roots:

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

The local editor writes only the configured recipe and CSS inside the project. It rejects symlink paths, generated or dependency directories, cross-origin save requests and stale file revisions. A competing edit leaves your unsaved preview in place; reload and reconcile it before saving again. Examples run in isolated frames and receive theme CSS, never the local editing capability. Each preview's compiled runtime is embedded after its content and authorized by an exact content hash in the generated content policy. This keeps previews interactive in Safari while retaining their opaque origin and parent-page isolation.

The writer stages complete files, serializes saves with a project lock, and rolls back the recipe if replacing the CSS fails. If a process stops during a save or build, close the old editor before removing its `.looma/theme-write.lock` or `.looma/docs-build.lock`; restart and save the loaded recipe to regenerate a consistent pair. Change the server base, output directory or theme-file paths by restarting `dev`.

Preset choices use the styled, searchable dropdown already used for fonts and component examples. Palette choices include four color swatches for the accent, neutral fill, canvas and text; the selected field previews the current theme. An inherited default keeps muted text while its options remain readable.

Filled-action colors keep their supplied pigment. Readable on-fill ink is chosen independently from contextual text, outlines and focus. Neutral action and field boundaries derive from one contrast decision against their surfaces; their quiet fills are independent of primary pigment. Supporting brand families are separate from neutral secondary actions. Reflection preserves chromatic light and shade within that chosen foreground’s readability bounds.
