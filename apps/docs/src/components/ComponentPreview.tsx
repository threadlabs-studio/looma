import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  ScenarioModeExample,
  type ScenarioPropertyAssignment
} from "./ComponentModeExample";
import type { FrameworkExamples } from "./FrameworkMode";
import { useLoomaRuntime } from "./LiveExample";

interface ComponentPreviewProps {
  component: string;
  compact?: boolean;
}

interface PreviewScenario {
  label: string;
  description: string;
  markup: string;
  propertyAssignments?: readonly ScenarioPropertyAssignment[];
  examples?: FrameworkExamples;
}

const mentionItems = [
  { id: "maya", label: "Maya Chen", detail: "Design", initials: "MC" },
  { id: "noah", label: "Noah Williams", detail: "Engineering", initials: "NW" }
];

const slashItems = [
  { title: "Text", description: "Plain paragraph", icon: "T" },
  { title: "Table", description: "Rows and columns", icon: "▦" }
];

const menuAnchor = { left: 0, top: 0, right: 240, bottom: 40, x: 0, y: 0, width: 240, height: 40 };
const tableGeometry = {
  rowBoundaries: [0, 48, 96],
  columnBoundaries: [0, 120, 240],
  activeCell: { left: 0, top: 0, width: 120, height: 48, rowIndex: 0, columnIndex: 0 }
};
const tableGeometryThree = {
  rowBoundaries: [0, 40, 80, 120],
  columnBoundaries: [0, 80, 160, 240],
  activeCell: { left: 80, top: 40, width: 80, height: 40, rowIndex: 1, columnIndex: 1 },
  hoveredCell: { left: 80, top: 40, width: 80, height: 40, rowIndex: 1, columnIndex: 1 }
};
const tableActionsBasic = ["add-row-after", "add-column-after"];
const tableActions = [
  "align-left",
  "align-center",
  "align-right",
  "background-none",
  "background-yellow",
  "add-row-before",
  "add-row-after",
  "add-column-before",
  "add-column-after",
  "merge-cells",
  "delete-table"
];

const plusIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 5v14M5 12h14" />
  </svg>`;

const searchIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>`;

const searchShellMarkup = `<ui-search-shell id="docs-search-shell" open dismissible label="Search documentation">
  <ui-input id="docs-search-input" slot="search" type="search" aria-label="Search documentation" placeholder="Search documentation"></ui-input>
  <div id="docs-search-status" slot="status" aria-live="polite">3 results</div>
  <div id="docs-search-results" slot="body">
    <ui-search-result-row id="docs-result-design-tokens">
      <strong slot="title">Design tokens</strong>
      <span slot="excerpt">Color, type, spacing, and motion.</span>
    </ui-search-result-row>
    <ui-search-result-row id="docs-result-token-overrides">
      <strong slot="title">Token overrides</strong>
      <span slot="excerpt">Customize shared and component tokens.</span>
    </ui-search-result-row>
    <ui-search-result-row id="docs-result-button-variants">
      <strong slot="title">Button variants</strong>
      <span slot="excerpt">Choose solid, outline, ghost, or danger.</span>
    </ui-search-result-row>
    <p id="docs-search-empty" hidden>No matching documentation.</p>
  </div>
  <form slot="footer" method="dialog">
    <ui-button type="submit" size="sm">Close</ui-button>
  </form>
</ui-search-shell>`;

const searchShellExamples: FrameworkExamples = {
  "html-next": {
    language: "html",
    code: `<script type="module">
  import "@threadlabs/looma";

  const input = document.querySelector("#docs-search-input");
  const status = document.querySelector("#docs-search-status");
  const empty = document.querySelector("#docs-search-empty");
  const results = [
    document.querySelector("#docs-result-design-tokens"),
    document.querySelector("#docs-result-token-overrides"),
    document.querySelector("#docs-result-button-variants")
  ];

  function updateResults() {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    for (const result of results) {
      result.hidden = !result.textContent.toLowerCase().includes(query);
      if (!result.hidden) visible += 1;
    }
    status.textContent = visible + " result" + (visible === 1 ? "" : "s");
    empty.hidden = visible !== 0;
  }

  input.addEventListener("input", updateResults);
</script>

${searchShellMarkup}`
  },
  vue: {
    language: "vue",
    code: `<script setup lang="ts">
import { computed, ref } from "vue";
import { Button, Input, SearchResultRow, SearchShell } from "@threadlabs/looma/vue";

const query = ref("");
const results = [
  ["Design tokens", "Color, type, spacing, and motion."],
  ["Token overrides", "Customize shared and component tokens."],
  ["Button variants", "Choose solid, outline, ghost, or danger."]
];
const filtered = computed(() => results.filter((result) =>
  result.join(" ").toLowerCase().includes(query.value.toLowerCase())
));
</script>

<template>
  <SearchShell open dismissible label="Search documentation">
    <Input slot="search" type="search" aria-label="Search documentation"
      :value="query" @input="query = $event.target.value" />
    <div slot="status" aria-live="polite">{{ filtered.length }} results</div>
    <div slot="body">
      <SearchResultRow v-for="result in filtered" :key="result[0]">
        <strong slot="title">{{ result[0] }}</strong>
        <span slot="excerpt">{{ result[1] }}</span>
      </SearchResultRow>
      <p v-if="filtered.length === 0">No matching documentation.</p>
    </div>
    <form slot="footer" method="dialog"><Button type="submit" size="sm">Close</Button></form>
  </SearchShell>
</template>`
  },
  react: {
    language: "tsx",
    code: `import { useState } from "react";
import { Button, Input, SearchResultRow, SearchShell } from "@threadlabs/looma-react";

const results = [
  ["Design tokens", "Color, type, spacing, and motion."],
  ["Token overrides", "Customize shared and component tokens."],
  ["Button variants", "Choose solid, outline, ghost, or danger."]
];

export function Example() {
  const [query, setQuery] = useState("");
  const filtered = results.filter((result) =>
    result.join(" ").toLowerCase().includes(query.toLowerCase())
  );
  return (
    <SearchShell open dismissible label="Search documentation">
      <Input slot="search" type="search" aria-label="Search documentation"
        value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
      <div slot="status" aria-live="polite">{filtered.length} results</div>
      <div slot="body">
        {filtered.map(([title, excerpt]) => (
          <SearchResultRow key={title}>
            <strong slot="title">{title}</strong><span slot="excerpt">{excerpt}</span>
          </SearchResultRow>
        ))}
        {filtered.length === 0 ? <p>No matching documentation.</p> : null}
      </div>
      <form slot="footer" method="dialog"><Button type="submit" size="sm">Close</Button></form>
    </SearchShell>
  );
}`
  },
  svelte: {
    language: "svelte",
    code: `<script lang="ts">
  import "@threadlabs/looma";
  let query = "";
  const results = [
    ["Design tokens", "Color, type, spacing, and motion."],
    ["Token overrides", "Customize shared and component tokens."],
    ["Button variants", "Choose solid, outline, ghost, or danger."]
  ];
  $: filtered = results.filter((result) =>
    result.join(" ").toLowerCase().includes(query.toLowerCase())
  );
</script>

<ui-search-shell open dismissible label="Search documentation">
  <ui-input slot="search" type="search" aria-label="Search documentation"
    value={query} oninput={(event) => query = event.currentTarget.value}></ui-input>
  <div slot="status" aria-live="polite">{filtered.length} results</div>
  <div slot="body">
    {#each filtered as result (result[0])}
      <ui-search-result-row>
        <strong slot="title">{result[0]}</strong><span slot="excerpt">{result[1]}</span>
      </ui-search-result-row>
    {/each}
    {#if filtered.length === 0}<p>No matching documentation.</p>{/if}
  </div>
  <form slot="footer" method="dialog"><ui-button type="submit" size="sm">Close</ui-button></form>
</ui-search-shell>`
  }
};

function avatarMarkup(name: string): string {
  const initials = name.split(" ").map((part) => part[0]).join("");
  return `<ui-avatar name="${name}" fallback="${initials}"></ui-avatar>`;
}

/* Scenario names and explanations are editorial content, not generated API metadata. */
const primaryScenarioCopy: Readonly<Record<string, readonly [label: string, description: string]>> = {
  "ui-affordance-scope": ["Default radius", "With no radius supplied, nearby affordances use the default 16px activation distance."],
  "ui-avatar": ["Name and fallback", "The name supplies the accessible identity and fallback supplies visible initials when no image is available."],
  "ui-avatar-group": ["Default maximum", "The default max of five leaves all three avatars visible."],
  "ui-badge": ["Default", "With no properties supplied, Badge renders its base appearance."],
  "ui-button": ["Default", "With no properties supplied, Button uses the outline variant at its default size."],
  "ui-callout": ["Default tone", "With no tone supplied, Callout uses the info treatment."],
  "ui-center": ["Default", "With no properties supplied, Center applies its default measure and gutters."],
  "ui-checkbox": ["Default", "With no state properties supplied, Checkbox starts unchecked and enabled."],
  "ui-combobox": ["Label and options", "Native option elements provide the ordinary no-script option list."],
  "ui-context-menu": ["Target binding", "The for property binds the menu to a separate context-click target while the trigger slot remains available."],
  "ui-dialog": ["Default", "With no boolean properties supplied, Dialog is non-modal and only explicit controls close it."],
  "ui-disclosure": ["Default closed", "With open omitted, Disclosure initially shows only its trigger."],
  "ui-editable": ["Default display mode", "With edit omitted, Editable initially exposes its display slot."],
  "ui-editor-insert-table-grid": ["Open and grid limits", "Open makes the picker visible while max-rows and max-cols bound its dimensions."],
  "ui-editor-mention-menu": ["Open", "The open property exposes the supplied suggestion controls."],
  "ui-editor-slash-menu": ["Open", "The open property exposes the supplied command controls."],
  "ui-editor-table-context-menu": ["Open", "The open property exposes the supplied table commands."],
  "ui-editor-table-overlay": ["Open with geometry", "Open exposes controls at the row, column, and active-cell coordinates supplied through the geometry property."],
  "ui-editor-table-toolbar": ["Open", "The open property exposes the available table controls."],
  "ui-editor-toolbar": ["Default", "Editor Toolbar has no scalar configuration; its supplied controls define the toolbar."],
  "ui-form-field": ["Label, control, and help", "Named label and help slots wrap a Looma input without manual IDs or ARIA wiring."],
  "ui-grid": ["Default", "With no properties supplied, Grid uses its default gap and minimum column size."],
  "ui-icon-button": ["Default", "Label provides the accessible name while the default appearance is a medium ghost button."],
  "ui-inline": ["Default", "With no properties supplied, Inline keeps its children on one row using its default gap, alignment, and distribution."],
  "ui-input": ["Default", "With no value or state properties supplied, Input exposes an empty, editable native control."],
  "ui-menu": ["Open", "The open property makes the supplied menu items visible."],
  "ui-menu-item": ["Default", "With disabled omitted, Menu Item is selectable inside its required menu context."],
  "ui-popover": ["Trigger binding", "The for property connects Popover to the Looma button that toggles it."],
  "ui-radio": ["Default", "With checked omitted, Radio starts unselected and enabled."],
  "ui-radio-group": ["Default horizontal", "With orientation omitted, Radio Group lays out its options horizontally."],
  "ui-reel": ["Default", "With no layout properties supplied, Reel uses its base gap, item width, and snap behavior."],
  "ui-search-result-row": ["Default", "With selected and disabled omitted, Search Result Row renders its normal state."],
  "ui-search-shell": ["open", "Open reveals the labeled shell while the optional status and footer regions remain absent."],
  "ui-select": ["Default", "With no value or state properties supplied, Select follows its native selected option."],
  "ui-separator": ["Default horizontal", "With orientation omitted, Separator renders horizontally."],
  "ui-sidebar": ["Default", "With no properties supplied, Sidebar uses the start side and default width."],
  "ui-stack": ["Default", "With no properties supplied, Stack uses its default gap, alignment, and distribution."],
  "ui-switch": ["Default", "With checked omitted, Switch starts off and enabled."],
  "ui-switcher": ["Default", "With no properties supplied, Switcher uses its default gap, threshold, and alignment."],
  "ui-tabs": ["Default horizontal", "With orientation omitted, Tabs arranges its tablist horizontally."],
  "ui-textarea": ["Default", "With rows omitted, Textarea exposes four editable rows."],
  "ui-toast-region": ["Default closed", "With open omitted, Toast Region keeps its supplied messages hidden."],
  "ui-tooltip": ["Target binding", "The for property connects Tooltip to the element that receives its description."],
  "ui-top-bar": ["Default", "With no named slots supplied, the default slot fills the title region."],
  "ui-tree": ["Default", "Label names the tree while the default depth remains unrestricted."],
  "ui-tree-item": ["Default", "With state properties omitted, Tree Item renders an enabled, unselected leaf row."]
};

/** The first scenario isolates the component's simplest useful contract. */
function previewMarkup(component: string, id: string): string {
  const items = `<span>One</span><span>Two</span><span>Three</span>`;

  switch (component) {
    case "ui-affordance-scope":
      return `<ui-affordance-scope><ui-icon-button anticipatory variant="outline" label="Add">${plusIcon}</ui-icon-button></ui-affordance-scope>`;
    case "ui-avatar":
      return `<ui-avatar name="Maya Chen"></ui-avatar>`;
    case "ui-avatar-group":
      return `<ui-avatar-group label="People">${avatarMarkup("Maya Chen")}${avatarMarkup("Noah Williams")}${avatarMarkup("Ari Kim")}</ui-avatar-group>`;
    case "ui-badge":
      return `<ui-badge>Default</ui-badge>`;
    case "ui-button":
      return `<ui-button>Button</ui-button>`;
    case "ui-callout":
      return `<ui-callout>Information message.</ui-callout>`;
    case "ui-center":
      return `<ui-center><p>Centered content.</p></ui-center>`;
    case "ui-checkbox":
      return `<ui-checkbox>Checkbox</ui-checkbox>`;
    case "ui-combobox":
      return `<ui-combobox label="Destination" disclosure><option value="north" data-description="Harbor district">North terminal</option><option value="west" data-description="Riverside">West terminal</option></ui-combobox>`;
    case "ui-context-menu":
      return `<ui-button id="${id}-target">Open menu</ui-button><ui-context-menu for="${id}-target"><ui-menu-item value="first">First item</ui-menu-item><ui-menu-item value="second">Second item</ui-menu-item></ui-context-menu>`;
    case "ui-dialog":
      return `<ui-button id="open-confirmation">Open dialog</ui-button><ui-dialog id="confirmation-dialog" for="open-confirmation" label="Confirmation"><form method="dialog"><strong>Continue?</strong><p>Confirm or cancel this action.</p><ui-button type="submit">Cancel</ui-button></form></ui-dialog>`;
    case "ui-disclosure":
      return `<ui-disclosure summary="Details">Disclosure content.</ui-disclosure>`;
    case "ui-editable":
      return `<ui-editable value="Editable text" label="Project title"></ui-editable>`;
    case "ui-editor-insert-table-grid":
      return `<ui-editor-insert-table-grid open max-rows="3" max-cols="4"></ui-editor-insert-table-grid>`;
    case "ui-editor-mention-menu":
      return `<ui-editor-mention-menu id="mention-menu" open></ui-editor-mention-menu>`;
    case "ui-editor-slash-menu":
      return `<ui-editor-slash-menu id="slash-menu" open></ui-editor-slash-menu>`;
    case "ui-editor-table-context-menu":
      return `<ui-editor-table-context-menu id="table-context-menu" open></ui-editor-table-context-menu>`;
    case "ui-editor-table-overlay":
      return `<div class="demo-editor-table-stage"><table aria-label="Example table"><tbody><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></tbody></table><ui-editor-table-overlay id="${id}-overlay" open></ui-editor-table-overlay></div>`;
    case "ui-editor-table-toolbar":
      return `<ui-editor-table-toolbar id="table-toolbar" open></ui-editor-table-toolbar>`;
    case "ui-editor-toolbar":
      return `<ui-editor-toolbar aria-label="Formatting"><ui-button type="button" variant="ghost" size="sm"><strong>B</strong></ui-button><ui-button type="button" variant="ghost" size="sm"><em>I</em></ui-button><ui-button type="button" variant="ghost" size="sm">Link</ui-button></ui-editor-toolbar>`;
    case "ui-form-field":
      return `<ui-form-field><label slot="label">Label</label><ui-input aria-label="Label"></ui-input><small slot="help">Help text</small></ui-form-field>`;
    case "ui-grid":
      return `<ui-grid>${items}</ui-grid>`;
    case "ui-icon-button":
      return `<ui-icon-button label="Search" variant="ghost" size="md">${searchIcon}</ui-icon-button>`;
    case "ui-inline":
      return `<ui-inline><span>One</span><span>Two</span><span>Three</span></ui-inline>`;
    case "ui-input":
      return `<ui-input type="text" aria-label="Text" placeholder="Enter text"></ui-input>`;
    case "ui-menu":
      return `<ui-menu role="menu" aria-label="Actions" open><ui-menu-item value="first">First item</ui-menu-item><ui-menu-item value="second">Second item</ui-menu-item></ui-menu>`;
    case "ui-menu-item":
      return `<ui-menu role="menu" aria-label="Actions" open><ui-menu-item value="item">Menu item</ui-menu-item></ui-menu>`;
    case "ui-popover":
      return `<ui-button id="popover-trigger">Open popover</ui-button><ui-popover id="example-popover" for="popover-trigger">Popover content.</ui-popover>`;
    case "ui-radio":
      return `<ui-radio value="option" name="${id}-group">Radio</ui-radio>`;
    case "ui-radio-group":
      return `<ui-radio-group label="Options" name="${id}-group"><ui-radio value="one">One</ui-radio><ui-radio value="two">Two</ui-radio></ui-radio-group>`;
    case "ui-reel":
      return `<ui-reel item-width="sm" aria-label="Items"><span>One</span><span>Two</span><span>Three</span><span>Four</span></ui-reel>`;
    case "ui-search-result-row":
      return `<ui-search-result-row><span slot="leading">○</span><span slot="title">Result title</span><span slot="meta">Metadata</span></ui-search-result-row>`;
    case "ui-search-shell":
      return `<ui-search-shell open label="Search commands"><ui-input slot="search" type="search" aria-label="Search commands" placeholder="Search commands"></ui-input><div slot="body">Start typing to filter commands.</div></ui-search-shell>`;
    case "ui-select":
      return `<ui-select aria-label="Option"><option value="one">One</option><option value="two">Two</option></ui-select>`;
    case "ui-separator":
      return `<div><span>Above</span><ui-separator></ui-separator><span>Below</span></div>`;
    case "ui-sidebar":
      return `<ui-sidebar><aside><strong>Sidebar</strong><p>Navigation and controls</p></aside><main><strong>Main content</strong><p>The primary content region grows to fill the remaining space.</p></main></ui-sidebar>`;
    case "ui-stack":
      return `<ui-stack>${items}</ui-stack>`;
    case "ui-switch":
      return `<ui-switch>Switch</ui-switch>`;
    case "ui-switcher":
      return `<ui-switcher>${items}</ui-switcher>`;
    case "ui-tabs":
      return `<ui-tabs label="View"><section id="preview" aria-label="Preview">A live component preview.</section><section id="code" aria-label="Code">Semantic HTML.</section></ui-tabs>`;
    case "ui-textarea":
      return `<ui-textarea aria-label="Text" placeholder="Enter a longer message"></ui-textarea>`;
    case "ui-toast-region":
      return `<ui-toast-region id="notifications"></ui-toast-region><ui-button commandfor="notifications" command="--show-toast" value="Page saved.">Show toast</ui-button>`;
    case "ui-tooltip":
      return `<ui-button id="${id}-trigger">Help</ui-button><ui-tooltip for="${id}-trigger">Tooltip content.</ui-tooltip>`;
    case "ui-top-bar":
      return `<ui-top-bar><strong>Title</strong></ui-top-bar>`;
    case "ui-tree":
      return `<ui-tree label="Items"><ui-tree-item item-id="parent" label="Parent"><ui-tree-item item-id="child" label="Child"></ui-tree-item></ui-tree-item><ui-tree-item item-id="sibling" label="Sibling"></ui-tree-item></ui-tree>`;
    case "ui-tree-item":
      return `<ui-tree label="Items"><ui-tree-item item-id="item" label="Item"></ui-tree-item></ui-tree>`;
    default:
      return `<${component}>Live ${component} example</${component}>`;
  }
}

function propertyAssignments(component: string, id: string): readonly ScenarioPropertyAssignment[] {
  switch (component) {
    case "ui-editor-mention-menu":
      return [
        { elementId: "mention-menu", property: "items", variable: "mentionItems", value: mentionItems },
        { elementId: "mention-menu", property: "anchorRect", variable: "anchorRect", value: menuAnchor }
      ];
    case "ui-editor-slash-menu":
      return [
        { elementId: "slash-menu", property: "items", variable: "slashItems", value: slashItems },
        { elementId: "slash-menu", property: "anchorRect", variable: "anchorRect", value: menuAnchor }
      ];
    case "ui-editor-table-overlay":
      return [
        { elementId: `${id}-overlay`, property: "geometry", variable: "tableGeometry", value: tableGeometry }
      ];
    case "ui-editor-table-context-menu":
      return [
        { elementId: "table-context-menu", property: "actions", variable: "tableActionsBasic", value: tableActionsBasic }
      ];
    case "ui-editor-table-toolbar":
      return [
        { elementId: "table-toolbar", property: "actions", variable: "tableActionsBasic", value: tableActionsBasic }
      ];
    default:
      return [];
  }
}

/**
 * Additional scenarios are deliberately curated around important states and
 * common values. Exhaustively echoing every prop belongs in the API table and
 * would hide the combinations readers actually need to copy.
 */
function curatedScenarios(component: string, id: string): PreviewScenario[] {
  switch (component) {
    case "ui-affordance-scope":
      return [{
        label: `near-radius="8"`,
        description: "A smaller near-radius delays anticipatory activation until the pointer is closer.",
        markup: `<ui-affordance-scope near-radius="8"><ui-icon-button anticipatory variant="outline" label="Add">${plusIcon}</ui-icon-button><ui-icon-button anticipatory variant="outline" label="Search">${searchIcon}</ui-icon-button></ui-affordance-scope>`
      }];
    case "ui-avatar":
      return [{
        label: "Image",
        description: "Place an ordinary image inside Avatar; its own alt text supplies the accessible name and the fallback remains available if loading fails.",
        markup: `<ui-avatar name="Maya Chen" fallback="MC"><img src="/looma/img/avatar-maya.svg" alt="Maya Chen" /></ui-avatar>`
      }, {
        label: `fallback="UX"`,
        description: "Fallback overrides the initials derived from name without requiring internal hooks or extra markup.",
        markup: `<ui-avatar name="Maya Chen" fallback="UX"></ui-avatar>`
      }];
    case "ui-avatar-group":
      return [{
        label: `max="2"`,
        description: "Max limits the visible avatars and replaces the remainder with an overflow count.",
        markup: `<ui-avatar-group max="2" label="Reviewers">${avatarMarkup("Maya Chen")}${avatarMarkup("Noah Williams")}${avatarMarkup("Ari Kim")}${avatarMarkup("Sam Rivera")}</ui-avatar-group>`
      }];
    case "ui-badge":
      return [
        {
          label: `variant="solid" and tone`,
          description: "Solid badges use the strongest filled treatment for each semantic tone.",
          markup: `<div><ui-badge variant="solid" tone="accent">Accent</ui-badge> <ui-badge variant="solid" tone="info">Info</ui-badge> <ui-badge variant="solid" tone="success">Success</ui-badge> <ui-badge variant="solid" tone="warning">Warning</ui-badge> <ui-badge variant="solid" tone="danger">Danger</ui-badge></div>`
        },
        {
          label: `variant="subtle" and tone`,
          description: "Subtle badges retain the same semantic tones on quiet tinted surfaces.",
          markup: `<div><ui-badge variant="subtle" tone="accent">Accent</ui-badge> <ui-badge variant="subtle" tone="info">Info</ui-badge> <ui-badge variant="subtle" tone="success">Success</ui-badge> <ui-badge variant="subtle" tone="warning">Warning</ui-badge> <ui-badge variant="subtle" tone="danger">Danger</ui-badge></div>`
        }
      ];
    case "ui-button":
      return [{
        label: "Variant and size",
        description: "Solid, outline, ghost, and danger cover the common emphasis and intent levels; size controls density.",
        markup: `<div><ui-button variant="solid" size="sm">Solid</ui-button> <ui-button variant="outline">Outline</ui-button> <ui-button variant="ghost" size="lg">Ghost</ui-button> <ui-button variant="danger">Danger</ui-button></div>`
      }];
    case "ui-callout":
      return [{
        label: "Tone values",
        description: "Success, warning, and danger change the visual treatment while the message supplies meaning.",
        markup: `<div><ui-callout tone="success">Success message.</ui-callout><ui-callout tone="warning">Warning message.</ui-callout><ui-callout tone="danger">Danger message.</ui-callout></div>`
      }];
    case "ui-center":
      return [{
        label: "Measure and gutters",
        description: "Measure bounds the content width while gutters preserve space at narrow container sizes.",
        markup: `<ui-center measure="wide" gutters="l"><article><h4>Wide measure</h4><p>Content remains centered with large inline gutters.</p></article></ui-center>`
      }];
    case "ui-checkbox":
      return [
        {
          label: "Checked, indeterminate, and disabled",
          description: "These state properties cover initial selection, partial selection, and unavailable controls.",
          markup: `<div><ui-checkbox checked>Checked</ui-checkbox><ui-checkbox indeterminate>Indeterminate</ui-checkbox><ui-checkbox disabled>Disabled</ui-checkbox></div>`
        },
        {
          label: "Multi-line label",
          description: "The control stays aligned to the first line while long label text wraps at a constrained width.",
          markup: `<div style="max-inline-size: 18rem"><ui-checkbox>Send me product updates, release notes, and occasional research invitations.</ui-checkbox></div>`
        }
      ];
    case "ui-combobox":
      return [{
        label: "Disclosure, clearable, and size",
        description: "Disclosure adds the toggle, clearable adds value removal, and size controls field density.",
        markup: `<ui-combobox label="Destination" disclosure clearable allow-free-text allow-create size="sm" placeholder="Search…"><option value="north">North terminal</option><option value="west">West terminal</option></ui-combobox>`
      }];
    case "ui-context-menu":
      return [{
        label: "open",
        description: "Default-open exposes the initial menu state without controlling later interaction.",
        markup: `<ui-button id="${id}-open-target">Open menu</ui-button><ui-context-menu for="${id}-open-target" open><ui-menu-item value="enabled">Enabled item</ui-menu-item><ui-menu-item value="disabled" disabled>Disabled item</ui-menu-item></ui-context-menu>`
      }];
    case "ui-dialog":
      return [{
        label: "modal and dismissible",
        description: "Modal moves the dialog into the top layer; dismissible additionally enables Escape and light-dismiss closing.",
        markup: `<ui-button id="open-modal-dialog">Open dialog</ui-button><ui-dialog id="modal-dialog" for="open-modal-dialog" modal dismissible label="Modal dialog"><form method="dialog"><strong>Modal dialog</strong><p>The rest of the page is inert while this dialog is open.</p><ui-button type="submit">Close</ui-button></form></ui-dialog>`
      }];
    case "ui-disclosure":
      return [{
        label: "open and disabled",
        description: "Open starts the panel expanded; disabled prevents the generated trigger from toggling its content.",
        markup: `<div><ui-disclosure summary="Open disclosure" open>Visible content.</ui-disclosure><ui-disclosure summary="Disabled disclosure" disabled>Unavailable content.</ui-disclosure></div>`
      }];
    case "ui-editable":
      return [{
        label: "edit and disabled",
        description: "Edit starts with the owned editor visible; disabled prevents entering edit mode.",
        markup: `<div><ui-editable value="Editable text" label="Title" edit></ui-editable><ui-editable value="Disabled text" label="Disabled title" disabled></ui-editable></div>`
      }];
    case "ui-editor-insert-table-grid":
      return [{
        label: `max-rows="6", max-cols="6", and header-row`,
        description: "The maximum row and column properties bound the picker; header-row opts into a checked header-row choice.",
        markup: `<ui-editor-insert-table-grid open max-rows="6" max-cols="6" header-row></ui-editor-insert-table-grid>`
      }];
    case "ui-editor-mention-menu":
      return [{
        label: "loading and query",
        description: "Loading preserves the menu surface while query records the text being resolved.",
        markup: `<ui-editor-mention-menu id="loading-mention-menu" open loading query="ma"></ui-editor-mention-menu>`,
        propertyAssignments: [
          { elementId: "loading-mention-menu", property: "items", variable: "mentionItems", value: mentionItems },
          { elementId: "loading-mention-menu", property: "anchorRect", variable: "anchorRect", value: menuAnchor }
        ]
      }];
    case "ui-editor-table-context-menu":
      return [{
        label: "Actions",
        description: "The actions property contains the exact commands supported by the current selection; unsupported commands are absent.",
        markup: `<ui-editor-table-context-menu id="context-menu-actions" open cell-background="#fef3c7"></ui-editor-table-context-menu>`,
        propertyAssignments: [
          { elementId: "context-menu-actions", property: "actions", variable: "tableActions", value: tableActions }
        ]
      }];
    case "ui-editor-table-overlay":
      return [{
        label: "Hovered cell geometry",
        description: "Adding hoveredCell to the same geometry record exposes row and column selectors for that cell.",
        markup: `<div class="demo-editor-table-stage demo-editor-table-stage--three"><table aria-label="Example table"><tbody><tr><td>A1</td><td>B1</td><td>C1</td></tr><tr><td>A2</td><td>B2</td><td>C2</td></tr><tr><td>A3</td><td>B3</td><td>C3</td></tr></tbody></table><ui-editor-table-overlay id="three-table-overlay" open></ui-editor-table-overlay></div>`,
        propertyAssignments: [
          { elementId: "three-table-overlay", property: "geometry", variable: "tableGeometry", value: tableGeometryThree }
        ]
      }];
    case "ui-editor-table-toolbar":
      return [{
        label: "Actions",
        description: "Cell-alignment marks the active command while actions contains the exact commands supported by the selection.",
        markup: `<ui-editor-table-toolbar id="toolbar-actions" open cell-alignment="center" cell-background="#fef3c7"></ui-editor-table-toolbar>`,
        propertyAssignments: [
          { elementId: "toolbar-actions", property: "actions", variable: "tableActions", value: tableActions }
        ]
      }];
    case "ui-form-field":
      return [{
        label: "required and invalid",
        description: "Required and invalid attach state to the label, native control, and error message as one field.",
        markup: `<ui-form-field required invalid><label slot="label">Label</label><ui-input aria-label="Label"></ui-input><small slot="error">Error message</small></ui-form-field>`
      }];
    case "ui-grid":
      return [{
        label: "Gap and minimum column width",
        description: "Gap controls spacing while min controls the intrinsic wrap point for columns.",
        markup: `<ui-grid gap="xs" min="sm"><span>One</span><span>Two</span><span>Three</span><span>Four</span></ui-grid>`
      }];
    case "ui-icon-button":
      return [{
        label: "Size and variant",
        description: "Size controls density while variant controls visual emphasis.",
        markup: `<div><ui-icon-button label="Small ghost" size="sm" variant="ghost">${searchIcon}</ui-icon-button> <ui-icon-button label="Medium outline" size="md" variant="outline">${plusIcon}</ui-icon-button> <ui-icon-button label="Large solid" size="lg" variant="solid">${plusIcon}</ui-icon-button></div>`
      }];
    case "ui-inline":
      return [
        {
          label: `gap="l"`,
          description: "The large gap token adds consistent space between every child.",
          markup: `<ui-inline gap="l"><span>One</span><span>Two</span><span>Three</span></ui-inline>`
        },
        {
          label: `align="end" and justify="between"`,
          description: "End alignment makes differently sized children share a bottom edge while space-between exposes the available row width.",
          markup: `<ui-inline gap="m" align="end" justify="between"><span>Start</span><span><strong>Two lines</strong><br /><small>Taller</small></span><span>End</span></ui-inline>`
        },
        {
          label: "wrap",
          description: "The false-default wrap property lets children move onto additional rows when the available inline space runs out.",
          markup: `<div style="max-width:14rem"><ui-inline gap="s" wrap><span>One</span><span>Two</span><span>Three</span><span>Four</span></ui-inline></div>`
        }
      ];
    case "ui-input":
      return [{
        label: "invalid, readonly, and disabled",
        description: "These properties configure validation and availability on the native input Looma renders.",
        markup: `<ui-stack gap="s"><ui-input invalid value="Invalid" aria-label="Invalid"></ui-input><ui-input readonly value="Read only" aria-label="Read only"></ui-input><ui-input disabled value="Disabled" aria-label="Disabled"></ui-input></ui-stack>`
      }];
    case "ui-menu":
      return [{
        label: "for",
        description: "For associates the menu with the control that toggles and anchors it.",
        markup: `<ui-button id="menu-trigger">Open menu</ui-button><ui-menu for="menu-trigger" aria-label="Document actions"><ui-menu-item value="rename">Rename</ui-menu-item><ui-menu-item value="share">Share</ui-menu-item></ui-menu>`
      }, {
        label: "disabled items",
        description: "Disabled on a child item keeps it discoverable while removing it from selection.",
        markup: `<ui-menu role="menu" aria-label="Document actions" open><ui-menu-item value="rename">Rename</ui-menu-item><ui-menu-item value="share">Share</ui-menu-item><ui-menu-item value="delete" disabled>Delete</ui-menu-item></ui-menu>`
      }];
    case "ui-menu-item":
      return [{
        label: "disabled",
        description: "Disabled retains the row label while removing the item from selection.",
        markup: `<ui-menu role="menu" aria-label="Publishing actions" open><ui-menu-item value="publish">Publish now</ui-menu-item><ui-menu-item value="schedule" disabled>Schedule publishing</ui-menu-item></ui-menu>`
      }];
    case "ui-popover":
      return [{
        label: "placement and open",
        description: "Placement controls the preferred anchor edge while open sets the initial state.",
        markup: `<ui-button id="details-trigger">Open popover</ui-button><ui-popover id="details-popover" for="details-trigger" placement="bottom-end" open><strong>Popover heading</strong><p>Popover content.</p></ui-popover>`
      }];
    case "ui-radio":
      return [{
        label: "checked and disabled",
        description: "Default-checked supplies initial selection while disabled prevents later changes.",
        markup: `<div><ui-radio name="${id}-state" value="checked" checked>Checked</ui-radio><ui-radio name="${id}-state" value="disabled" disabled>Disabled</ui-radio></div>`
      }];
    case "ui-radio-group":
      return [{
        label: "Vertical, required, and value",
        description: "Orientation changes the axis; required and value define group validation and selection.",
        markup: `<ui-radio-group label="Priority" value="two" name="${id}-vertical" orientation="vertical" required><ui-radio value="one">One</ui-radio><ui-radio value="two">Two</ui-radio><ui-radio value="three">Three</ui-radio></ui-radio-group>`
      }];
    case "ui-reel":
      return [{
        label: "Gap, item width, and snap",
        description: "These three properties control spacing, each child's basis, and the scroll snap position.",
        markup: `<ui-reel gap="m" item-width="md" snap="center" aria-label="Items"><span>One</span><span>Two</span><span>Three</span><span>Four</span></ui-reel>`
      }];
    case "ui-search-result-row":
      return [{
        label: "selected and disabled",
        description: "Selected marks the active result; disabled keeps an unavailable result visible but inert.",
        markup: `<div><ui-search-result-row selected><span slot="title">Selected result</span><span slot="meta">Available</span></ui-search-result-row><ui-search-result-row disabled><span slot="title">Disabled result</span><span slot="meta">Unavailable</span></ui-search-result-row></div>`
      }];
    case "ui-select":
      return [{
        label: "value, required, and invalid",
        description: "Value selects an option; required and invalid expose its validation state.",
        markup: `<ui-select value="editor" required invalid aria-label="Workspace role"><option value="">Choose a role…</option><option value="viewer">Viewer</option><option value="editor">Editor</option></ui-select>`
      }];
    case "ui-separator":
      return [{
        label: `orientation="vertical"`,
        description: "Vertical orientation divides inline content; the parent supplies the row layout and height.",
        markup: `<div style="display:flex;align-items:center;height:3rem;gap:1rem"><span>Before</span><ui-separator orientation="vertical"></ui-separator><span>After</span></div>`
      }];
    case "ui-sidebar":
      return [{
        label: "End side and resizing",
        description: "Side and width set placement; resizable and its bounds configure pointer and keyboard resizing.",
        markup: `<ui-sidebar gap="m" side="end" width="narrow" resizable min-width="176" max-width="360" resize-label="Resize sidebar"><main><strong>Main content</strong><p>The primary region comes first when the sidebar is on the end side.</p></main><aside><strong>Sidebar</strong><p>Drag or use the resize handle with the keyboard.</p></aside></ui-sidebar>`
      }];
    case "ui-stack":
      return [{
        label: `gap="xl" and align="center"`,
        description: "The extra-large gap visibly increases vertical space; center alignment returns the bounded children to their intrinsic widths.",
        markup: `<ui-stack gap="xl" align="center"><span>One</span><span>Two</span><span>Three</span></ui-stack>`
      }];
    case "ui-switch":
      return [{
        label: "checked and disabled",
        description: "Default-checked supplies initial on state while disabled prevents interaction.",
        markup: `<div><ui-switch checked>Checked</ui-switch><ui-switch disabled>Disabled</ui-switch></div>`
      }];
    case "ui-switcher":
      return [{
        label: "Gap, threshold, and alignment",
        description: "Threshold sets the intrinsic switch point while gap and alignment control the resulting layout.",
        markup: `<ui-switcher gap="m" threshold="md" align="stretch"><span>One</span><span>Two</span><span>Three</span></ui-switcher>`
      }];
    case "ui-tabs":
      return [{
        label: `orientation="vertical"`,
        description: "Vertical orientation changes the tablist axis while preserving the same tab and panel relationships.",
        markup: `<ui-tabs label="Settings" orientation="vertical" value="profile"><section id="profile" aria-label="Profile">Profile settings</section><section id="security" aria-label="Security">Security settings</section></ui-tabs>`
      }];
    case "ui-textarea":
      return [{
        label: "rows, invalid, and readonly",
        description: "Rows sets the visible height while invalid and readonly express validation and availability.",
        markup: `<ui-stack gap="s"><ui-textarea rows="4" invalid value="Invalid" aria-label="Invalid"></ui-textarea><ui-textarea rows="3" readonly value="Read only" aria-label="Read only"></ui-textarea></ui-stack>`
      }];
    case "ui-tooltip":
      return [{
        label: "Placement and delays",
        description: "Placement chooses the preferred edge; show-delay and hide-delay tune hover timing.",
        markup: `<ui-button id="${id}-timed-trigger">Help</ui-button><ui-tooltip for="${id}-timed-trigger" placement="bottom-start" show-delay="0" hide-delay="200">Tooltip content.</ui-tooltip>`
      }];
    case "ui-tree-item":
      return [{
        label: "container, expanded, and sortable",
        description: "Container enables children, expanded reveals them, and sortable opts the row into reordering.",
        markup: `<ui-tree label="Items"><ui-tree-item item-id="parent" label="Parent" container expanded sortable><span>Parent</span><ui-tree-item slot="children" item-id="child" label="Child"><span>Child</span></ui-tree-item></ui-tree-item></ui-tree>`
      }];
    case "ui-editor-toolbar":
      return [{
        label: "Custom controls",
        description: "The light-DOM controls define the available commands while Editor Toolbar supplies toolbar semantics.",
        markup: `<ui-editor-toolbar aria-label="Block formatting"><ui-button type="button" variant="ghost" size="sm">Heading</ui-button><ui-button type="button" variant="ghost" size="sm">Quote</ui-button><ui-button type="button" variant="ghost" size="sm">Code</ui-button></ui-editor-toolbar>`
      }];
    case "ui-editor-slash-menu":
      return [{
        label: "query and selected-index",
        description: "Query records the active filter while selected-index identifies the keyboard-active result.",
        markup: `<ui-editor-slash-menu id="filtered-slash-menu" open query="table" selected-index="0"></ui-editor-slash-menu>`,
        propertyAssignments: [
          { elementId: "filtered-slash-menu", property: "items", variable: "slashItems", value: slashItems },
          { elementId: "filtered-slash-menu", property: "anchorRect", variable: "anchorRect", value: menuAnchor }
        ]
      }];
    case "ui-search-shell":
      return [{
        label: "label, dismissible, status, and footer",
        description: "Label names the dialog, dismissible enables Escape and backdrop dismissal, and the status, body, and footer slots host application-owned search state.",
        markup: searchShellMarkup,
        examples: searchShellExamples
      }];
    case "ui-top-bar":
      return [{
        label: "leading, search, and actions slots",
        description: "Each named slot adds its region around the default title without requiring internal wrapper markup.",
        markup: `<ui-top-bar><ui-button slot="leading" size="sm">Back</ui-button><strong>Title</strong><ui-button slot="search" size="sm">Search</ui-button><ui-button slot="actions" size="sm">Save</ui-button></ui-top-bar>`
      }];
    case "ui-toast-region":
      return [{
        label: "Multiple messages",
        description: "Open allows an announced region to display multiple messages; each message keeps its own Looma dismiss control.",
        markup: `<ui-toast-region id="multiple-notifications"></ui-toast-region><ui-inline gap="s"><ui-button commandfor="multiple-notifications" command="--show-toast" value="Page published.">Show published</ui-button><ui-button commandfor="multiple-notifications" command="--show-toast" value="Link copied.">Show copied</ui-button></ui-inline>`
      }];
    case "ui-tree":
      return [{
        label: "max-depth and hover-expand-delay",
        description: "Max-depth limits nesting while hover-expand-delay controls drag-hover expansion timing.",
        markup: `<ui-tree label="Items" max-depth="2" hover-expand-delay="300"><ui-tree-item item-id="parent" label="Parent" expanded sortable><ui-tree-item item-id="child" label="Child" sortable></ui-tree-item></ui-tree-item></ui-tree>`
      }];
    default:
      return [];
  }
}

function previewScenarios(component: string, id: string): PreviewScenario[] {
  const [label, description] = primaryScenarioCopy[component] ?? ["Default", "The component's most common configuration."];
  const scenarios: PreviewScenario[] = [{
    label,
    description,
    markup: previewMarkup(component, id),
    propertyAssignments: propertyAssignments(component, id)
  }];
  scenarios.push(...curatedScenarios(component, id));

  return scenarios.filter((scenario, index, all) =>
    all.findIndex((candidate) => candidate.markup === scenario.markup) === index
  );
}

function ComponentPreviewClient({ component, compact = false }: ComponentPreviewProps): JSX.Element {
  const ready = useLoomaRuntime();
  const rootRef = useRef<HTMLDivElement>(null);
  const [responsivePreviewWidth, setResponsivePreviewWidth] = useState(720);
  const scenarios = useMemo(
    () => ready ? previewScenarios(component, component.slice(3)) : [],
    [component, ready]
  );

  useEffect(() => {
    if (!ready || !rootRef.current) return;

    // Structured values are property-only inputs; assign the same values shown in every snippet.
    for (const scenario of scenarios) {
      for (const assignment of scenario.propertyAssignments ?? []) {
        const target = rootRef.current.querySelector<HTMLElement>(`#${assignment.elementId}`);
        if (target) (target as unknown as Record<string, unknown>)[assignment.property] = assignment.value;
      }
    }

  }, [component, ready, scenarios]);

  useEffect(() => {
    if (!ready || component !== "ui-search-shell" || !rootRef.current) return;
    const root = rootRef.current;
    const updateResults = () => {
      const input = root.querySelector<HTMLInputElement>("#docs-search-input");
      const status = root.querySelector<HTMLElement>("#docs-search-status");
      const empty = root.querySelector<HTMLElement>("#docs-search-empty");
      const results = [
        root.querySelector<HTMLElement>("#docs-result-design-tokens"),
        root.querySelector<HTMLElement>("#docs-result-token-overrides"),
        root.querySelector<HTMLElement>("#docs-result-button-variants")
      ].filter((result): result is HTMLElement => result !== null);
      if (!input || !status || !empty || results.length === 0) return;
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      for (const result of results) {
        result.hidden = !result.textContent?.toLowerCase().includes(query);
        if (!result.hidden) visible += 1;
      }
      status.textContent = `${visible} result${visible === 1 ? "" : "s"}`;
      empty.hidden = visible !== 0;
    };
    const onInput = (event: Event) => {
      if ((event.target as HTMLElement | null)?.id === "docs-search-input") updateResults();
    };
    root.addEventListener("input", onInput);
    const settledFrame = requestAnimationFrame(updateResults);
    return () => {
      cancelAnimationFrame(settledFrame);
      root.removeEventListener("input", onInput);
    };
  }, [component, ready, scenarios]);

  return (
    <div
      ref={rootRef}
      className={`looma-component-preview${compact ? " looma-component-preview--compact" : ""}`}
    >
      {ready && compact ? (
        <div dangerouslySetInnerHTML={{ __html: scenarios[0]?.markup ?? "" }} />
      ) : ready ? (
        <div className="looma-preview-scenarios">
          {scenarios.map((scenario) => (
            <section
              className="looma-preview-scenario"
              data-preview-scenario={scenario.label}
              key={`${scenario.label}-${scenario.markup}`}
            >
              <header>
                <h2>{scenario.label}</h2>
                <p>{scenario.description}</p>
              </header>
              {component === "ui-switcher" ? (
                <label className="looma-responsive-preview-control">
                  <span>Preview width</span>
                  <input
                    aria-label="Preview width"
                    max="720"
                    min="280"
                    onChange={(event) => setResponsivePreviewWidth(Number(event.currentTarget.value))}
                    type="range"
                    value={responsivePreviewWidth}
                  />
                  <output>{responsivePreviewWidth}px</output>
                </label>
              ) : null}
              {/* Only static, repository-authored scenario strings reach this sink. */}
              <div
                className="looma-preview-scenario__stage"
                data-component-preview={component}
                style={component === "ui-switcher" ? { "--looma-preview-width": `${responsivePreviewWidth}px` } as React.CSSProperties : undefined}
                dangerouslySetInnerHTML={{ __html: scenario.markup }}
              />
              <ScenarioModeExample
                examples={scenario.examples}
                markup={scenario.markup}
                propertyAssignments={scenario.propertyAssignments}
              />
            </section>
          ))}
        </div>
      ) : (
        <span className="looma-live-example-loading">Loading live component…</span>
      )}
    </div>
  );
}

export function ComponentPreview(props: ComponentPreviewProps): JSX.Element {
  const className = `looma-component-preview${props.compact ? " looma-component-preview--compact" : ""}`;

  return (
    <BrowserOnly
      fallback={(
        <div className={className}>
          <span className="looma-live-example-loading">Loading live component…</span>
        </div>
      )}
    >
      {() => <ComponentPreviewClient {...props} />}
    </BrowserOnly>
  );
}
