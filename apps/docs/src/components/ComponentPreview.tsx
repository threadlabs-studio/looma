import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useEffect, useMemo, useRef } from "react";

import {
  ScenarioModeExample,
  type ScenarioPropertyAssignment
} from "./ComponentModeExample";
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
  dialogId?: string;
}

const comboboxOptions = [
  { id: "north", value: "north", label: "North terminal", description: "Harbor district" },
  { id: "west", value: "west", label: "West terminal", description: "Riverside" }
];

const mentionItems = [
  { id: "maya", label: "Maya Chen", detail: "Design", initials: "MC" },
  { id: "noah", label: "Noah Williams", detail: "Engineering", initials: "NW" }
];

const slashItems = [
  { title: "Text", description: "Plain paragraph", icon: "T" },
  { title: "Table", description: "Rows and columns", icon: "▦" }
];

const menuAnchor = { left: 0, top: 0, right: 240, bottom: 40, x: 0, y: 0, width: 240, height: 40 };

const plusIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 5v14M5 12h14" />
  </svg>`;

const searchIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>`;

function avatarMarkup(name: string): string {
  const initials = name.split(" ").map((part) => part[0]).join("");
  return `<ui-avatar name="${name}" fallback="${initials}"><span data-ui-avatar-fallback>${initials}</span></ui-avatar>`;
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
  "ui-chip": ["Default", "With no properties supplied, Chip uses the tag appearance and extra-small size."],
  "ui-cluster": ["Default", "With no properties supplied, Cluster uses its default gap, alignment, and distribution."],
  "ui-combobox": ["Label and options", "The label is declarative markup; structured options are assigned through the config property."],
  "ui-context-menu": ["Target binding", "The for property binds the menu to a separate context-click target while the trigger slot remains available."],
  "ui-dialog": ["Default", "With no boolean properties supplied, Dialog is non-modal and only explicit controls close it."],
  "ui-disclosure": ["Default closed", "With open omitted, Disclosure initially shows only its trigger."],
  "ui-editable": ["Default display mode", "With edit omitted, Editable initially exposes its display slot."],
  "ui-editor-insert-table-grid": ["Open and grid limits", "Open makes the picker visible while max-rows and max-cols bound its dimensions."],
  "ui-editor-mention-menu": ["Open", "The open property exposes the supplied suggestion controls."],
  "ui-editor-slash-menu": ["Open", "The open property exposes the supplied command controls."],
  "ui-editor-table-context-menu": ["Open", "The open property exposes the supplied table commands."],
  "ui-editor-table-overlay": ["Open", "The open property exposes the overlay above its table content."],
  "ui-editor-table-toolbar": ["Open", "The open property exposes the supplied table controls."],
  "ui-editor-toolbar": ["Default", "Editor Toolbar has no scalar configuration; its supplied controls define the toolbar."],
  "ui-floating-action-button": ["Default", "Label provides the accessible name while the default state remains enabled on every viewport."],
  "ui-form-field": ["Label, control, and help", "The default field groups its light-DOM label, native control, and help text."],
  "ui-grid": ["Default", "With no properties supplied, Grid uses its default gap and minimum column size."],
  "ui-icon-button": ["Default", "Label provides the accessible name while the default appearance is a medium ghost button."],
  "ui-inline": ["Default", "With no properties supplied, Inline uses its default gap, alignment, distribution, and wrapping."],
  "ui-input": ["Default", "With no value or state properties supplied, Input exposes an empty, editable native control."],
  "ui-menu": ["Open", "The open property makes the supplied menu items visible."],
  "ui-menu-item": ["Default", "With disabled omitted, Menu Item is selectable inside its required menu context."],
  "ui-popover": ["Trigger binding", "The for property and native popovertarget connect Popover to its trigger."],
  "ui-radio": ["Default", "With checked omitted, Radio starts unselected and enabled."],
  "ui-radio-group": ["Default horizontal", "With orientation omitted, Radio Group lays out its options horizontally."],
  "ui-reel": ["Default", "With no layout properties supplied, Reel uses its base gap, item width, and snap behavior."],
  "ui-search-result-row": ["Default", "With selected and disabled omitted, Search Result Row renders its normal state."],
  "ui-search-shell": ["Region slots", "The search, body, and footer slots configure the shell's visible regions."],
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
  "ui-top-bar": ["Region slots", "Leading, default, search, and actions slots configure the bar."],
  "ui-tree": ["Default", "Label names the tree while the default depth remains unrestricted."],
  "ui-tree-item": ["Default", "With state properties omitted, Tree Item renders an enabled, unselected leaf row."]
};

/** The first scenario isolates the component's simplest useful contract. */
function previewMarkup(component: string, id: string): string {
  const items = `<span>One</span><span>Two</span><span>Three</span>`;

  switch (component) {
    case "ui-affordance-scope":
      return `<ui-affordance-scope><button type="button">Add</button></ui-affordance-scope>`;
    case "ui-avatar":
      return `<ui-avatar name="Maya Chen"></ui-avatar>`;
    case "ui-avatar-group":
      return `<ui-avatar-group label="People">${avatarMarkup("Maya Chen")}${avatarMarkup("Noah Williams")}${avatarMarkup("Ari Kim")}</ui-avatar-group>`;
    case "ui-badge":
      return `<ui-badge>Default</ui-badge>`;
    case "ui-button":
      return `<ui-button><button type="button">Button</button></ui-button>`;
    case "ui-callout":
      return `<ui-callout>Information message.</ui-callout>`;
    case "ui-center":
      return `<ui-center><p>Centered content.</p></ui-center>`;
    case "ui-checkbox":
      return `<ui-checkbox><label><input type="checkbox" />Checkbox</label></ui-checkbox>`;
    case "ui-chip":
      return `<ui-chip>Tag</ui-chip>`;
    case "ui-cluster":
      return `<ui-cluster>${items}</ui-cluster>`;
    case "ui-combobox":
      return `<ui-combobox id="destination-picker" label="Destination"></ui-combobox>`;
    case "ui-context-menu":
      return `<div id="${id}-target">Right-click this area.<ui-context-menu for="${id}-target"><button slot="trigger" type="button">Open menu</button><ui-menu-item value="first">First item</ui-menu-item><ui-menu-item value="second">Second item</ui-menu-item></ui-context-menu></div>`;
    case "ui-dialog":
      return `<ui-dialog id="confirmation-dialog" label="Confirmation"><strong>Continue?</strong><p>Confirm or cancel this action.</p><button type="button" data-dialog-close>Cancel</button></ui-dialog><button type="button" data-dialog-demo>Open dialog</button>`;
    case "ui-disclosure":
      return `<ui-disclosure><button type="button" aria-controls="${id}-panel">Details</button><div id="${id}-panel">Disclosure content.</div></ui-disclosure>`;
    case "ui-editable":
      return `<ui-editable><button data-ui-editable-trigger type="button">Edit</button><span slot="preview">Editable text</span><input slot="edit" value="Editable text" aria-label="Editable text" /></ui-editable>`;
    case "ui-editor-insert-table-grid":
      return `<ui-editor-insert-table-grid open max-rows="3" max-cols="4"></ui-editor-insert-table-grid>`;
    case "ui-editor-mention-menu":
      return `<ui-editor-mention-menu id="mention-menu" open></ui-editor-mention-menu>`;
    case "ui-editor-slash-menu":
      return `<ui-editor-slash-menu id="slash-menu" open></ui-editor-slash-menu>`;
    case "ui-editor-table-context-menu":
      return `<ui-editor-table-context-menu open></ui-editor-table-context-menu>`;
    case "ui-editor-table-overlay":
      return `<ui-editor-table-overlay open><table><tbody><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></tbody></table></ui-editor-table-overlay>`;
    case "ui-editor-table-toolbar":
      return `<ui-editor-table-toolbar open><button type="button">Align left</button><button type="button">Add row</button></ui-editor-table-toolbar>`;
    case "ui-editor-toolbar":
      return `<ui-editor-toolbar aria-label="Formatting"><button type="button"><strong>B</strong></button><button type="button"><em>I</em></button><button type="button">Link</button></ui-editor-toolbar>`;
    case "ui-floating-action-button":
      return `<ui-floating-action-button label="Create">${plusIcon}</ui-floating-action-button>`;
    case "ui-form-field":
      return `<ui-form-field><label for="field-input">Label</label><input id="field-input" type="text" /><small data-slot="help">Help text</small></ui-form-field>`;
    case "ui-grid":
      return `<ui-grid>${items}</ui-grid>`;
    case "ui-icon-button":
      return `<ui-icon-button label="Search" variant="ghost" size="md">${searchIcon}</ui-icon-button>`;
    case "ui-inline":
      return `<ui-inline><span>Alpha</span><span>Beta</span><span>Gamma</span></ui-inline>`;
    case "ui-input":
      return `<ui-input><input type="text" aria-label="Text" /></ui-input>`;
    case "ui-menu":
      return `<ui-menu role="menu" aria-label="Actions" open><ui-menu-item value="first">First item</ui-menu-item><ui-menu-item value="second">Second item</ui-menu-item></ui-menu>`;
    case "ui-menu-item":
      return `<ui-menu role="menu" aria-label="Actions" open><ui-menu-item value="item">Menu item</ui-menu-item></ui-menu>`;
    case "ui-popover":
      return `<button id="popover-trigger" type="button" popovertarget="example-popover">Open popover</button><ui-popover id="example-popover" for="popover-trigger">Popover content.</ui-popover>`;
    case "ui-radio":
      return `<ui-radio value="option"><input type="radio" name="${id}-group" />Radio</ui-radio>`;
    case "ui-radio-group":
      return `<ui-radio-group name="${id}-group"><ui-radio value="one">One</ui-radio><ui-radio value="two">Two</ui-radio></ui-radio-group>`;
    case "ui-reel":
      return `<ui-reel aria-label="Items"><span>One</span><span>Two</span><span>Three</span><span>Four</span></ui-reel>`;
    case "ui-search-result-row":
      return `<ui-search-result-row><span slot="leading">○</span><span slot="title">Result title</span><span slot="meta">Metadata</span></ui-search-result-row>`;
    case "ui-search-shell":
      return `<ui-search-shell><div slot="backdrop"></div><div slot="search"><input type="search" aria-label="Search" /></div><div slot="body">Results</div><div slot="footer">Escape to close</div></ui-search-shell>`;
    case "ui-select":
      return `<ui-select><select aria-label="Option"><option>One</option><option>Two</option></select></ui-select>`;
    case "ui-separator":
      return `<div><span>Above</span><ui-separator></ui-separator><span>Below</span></div>`;
    case "ui-sidebar":
      return `<ui-sidebar><aside>Sidebar</aside><main>Main content</main></ui-sidebar>`;
    case "ui-stack":
      return `<ui-stack>${items}</ui-stack>`;
    case "ui-switch":
      return `<ui-switch><input type="checkbox" />Switch</ui-switch>`;
    case "ui-switcher":
      return `<ui-switcher>${items}</ui-switcher>`;
    case "ui-tabs":
      return `<ui-tabs><div role="tablist" aria-label="View"><button role="tab" id="${id}-tab-a" aria-controls="${id}-panel-a">Preview</button><button role="tab" id="${id}-tab-b" aria-controls="${id}-panel-b">Code</button></div><section role="tabpanel" id="${id}-panel-a" aria-labelledby="${id}-tab-a">A live component preview.</section><section role="tabpanel" id="${id}-panel-b" aria-labelledby="${id}-tab-b" hidden>Semantic HTML.</section></ui-tabs>`;
    case "ui-textarea":
      return `<ui-textarea><textarea aria-label="Text"></textarea></ui-textarea>`;
    case "ui-toast-region":
      return `<ui-toast-region><div data-ui-toast>Notification<button type="button" data-ui-toast-dismiss aria-label="Dismiss">×</button></div></ui-toast-region>`;
    case "ui-tooltip":
      return `<button id="${id}-trigger" type="button">Help</button><ui-tooltip for="${id}-trigger">Tooltip content.</ui-tooltip>`;
    case "ui-top-bar":
      return `<ui-top-bar><button slot="leading" type="button">Menu</button><strong>Title</strong><button slot="search" type="button">Search</button><button slot="actions" type="button">Action</button></ui-top-bar>`;
    case "ui-tree":
      return `<ui-tree label="Items"><ui-tree-item item-id="one" label="One"><span>One</span></ui-tree-item><ui-tree-item item-id="two" label="Two"><span>Two</span></ui-tree-item></ui-tree>`;
    case "ui-tree-item":
      return `<ui-tree label="Items"><ui-tree-item item-id="item" label="Item"><span>Item</span></ui-tree-item></ui-tree>`;
    default:
      return `<${component}>Live ${component} example</${component}>`;
  }
}

function propertyAssignments(component: string): readonly ScenarioPropertyAssignment[] {
  switch (component) {
    case "ui-combobox":
      return [{
        elementId: "destination-picker",
        property: "config",
        variable: "comboboxConfig",
        value: { allowFreeText: true, allowCreate: true, options: comboboxOptions }
      }];
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
        markup: `<ui-affordance-scope near-radius="8"><button type="button">Add</button><button type="button">Search</button></ui-affordance-scope>`
      }];
    case "ui-avatar":
      return [{
        label: "Custom fallback",
        description: "Fallback controls the visible initials independently of the accessible name.",
        markup: `<ui-avatar name="Maya Chen" fallback="MC"><span data-ui-avatar-fallback>MC</span></ui-avatar>`
      }];
    case "ui-avatar-group":
      return [{
        label: `max="2"`,
        description: "Max limits the visible avatars and replaces the remainder with an overflow count.",
        markup: `<ui-avatar-group max="2" label="Reviewers">${avatarMarkup("Maya Chen")}${avatarMarkup("Noah Williams")}${avatarMarkup("Ari Kim")}${avatarMarkup("Sam Rivera")}</ui-avatar-group>`
      }];
    case "ui-badge":
      return [{
        label: "Tone and variant",
        description: "Representative tone values combine with the subtle variant; text still carries the meaning.",
        markup: `<div><ui-badge variant="subtle" tone="info">Info</ui-badge> <ui-badge variant="subtle" tone="success">Success</ui-badge> <ui-badge variant="subtle" tone="warning">Warning</ui-badge> <ui-badge variant="subtle" tone="error">Error</ui-badge></div>`
      }];
    case "ui-button":
      return [{
        label: "Variant and size",
        description: "Solid, outline, and ghost are the common emphasis levels; size controls density.",
        markup: `<div><ui-button variant="solid" size="sm"><button type="button">Solid</button></ui-button> <ui-button variant="outline"><button type="button">Outline</button></ui-button> <ui-button variant="ghost" size="lg"><button type="button">Ghost</button></ui-button></div>`
      }];
    case "ui-callout":
      return [{
        label: "Tone values",
        description: "Success, warning, and error change the visual treatment while the message supplies meaning.",
        markup: `<div><ui-callout tone="success">Success message.</ui-callout><ui-callout tone="warning">Warning message.</ui-callout><ui-callout tone="error">Error message.</ui-callout></div>`
      }];
    case "ui-center":
      return [{
        label: "Measure and gutters",
        description: "Measure bounds the content width while gutters preserve space at narrow container sizes.",
        markup: `<ui-center measure="wide" gutters="l"><article><h4>Wide measure</h4><p>Content remains centered with large inline gutters.</p></article></ui-center>`
      }];
    case "ui-checkbox":
      return [{
        label: "Checked, indeterminate, and disabled",
        description: "These state properties cover initial selection, partial selection, and unavailable controls.",
        markup: `<div><ui-checkbox default-checked><label><input type="checkbox" checked />Checked</label></ui-checkbox><ui-checkbox indeterminate><label><input type="checkbox" />Indeterminate</label></ui-checkbox><ui-checkbox disabled><label><input type="checkbox" disabled />Disabled</label></ui-checkbox></div>`
      }];
    case "ui-chip":
      return [{
        label: "Appearance and size",
        description: "Tag and pill are the two appearances; extra-small and small are the common compact sizes.",
        markup: `<div><ui-chip appearance="tag" size="xs">Tag</ui-chip> <ui-chip appearance="pill" size="sm">Pill</ui-chip></div>`
      }];
    case "ui-cluster":
      return [
        {
          label: `gap="l"`,
          description: "The large gap token adds consistent space between every child.",
          markup: `<ui-cluster gap="l"><span>One</span><span>Two</span><span>Three</span></ui-cluster>`
        },
        {
          label: `align="end"`,
          description: "End alignment makes differently sized children share the same cross-axis edge.",
          markup: `<ui-cluster align="end"><span>Short</span><span><strong>Two lines</strong><br /><small>Taller</small></span><span>Short</span></ui-cluster>`
        },
        {
          label: `justify="between"`,
          description: "Space-between distributes the first and last children across the available row.",
          markup: `<ui-cluster justify="between"><span>Start</span><span>Middle</span><span>End</span></ui-cluster>`
        }
      ];
    case "ui-combobox":
      return [{
        label: "Disclosure, clearable, and size",
        description: "Disclosure adds the toggle, clearable adds value removal, and size controls field density.",
        markup: `<ui-combobox id="compact-destination-picker" label="Destination" disclosure clearable size="sm" placeholder="Search…"></ui-combobox>`,
        propertyAssignments: [{
          elementId: "compact-destination-picker",
          property: "config",
          variable: "comboboxConfig",
          value: { allowFreeText: true, allowCreate: true, options: comboboxOptions }
        }]
      }];
    case "ui-context-menu":
      return [{
        label: "default-open",
        description: "Default-open exposes the initial menu state without controlling later interaction.",
        markup: `<div id="${id}-open-target">Right-click this area.<ui-context-menu for="${id}-open-target" default-open><button slot="trigger" type="button">Open menu</button><ui-menu-item value="enabled">Enabled item</ui-menu-item><ui-menu-item value="disabled" disabled>Disabled item</ui-menu-item></ui-context-menu></div>`
      }];
    case "ui-dialog":
      return [{
        label: "modal and dismissible",
        description: "Modal moves the dialog into the top layer; dismissible additionally enables Escape and light-dismiss closing.",
        markup: `<ui-dialog id="modal-dialog" modal dismissible label="Modal dialog"><strong>Modal dialog</strong><p>The rest of the page is inert while this dialog is open.</p><button type="button" data-dialog-close>Close</button></ui-dialog><button type="button" data-dialog-demo>Open dialog</button>`,
        dialogId: "modal-dialog"
      }];
    case "ui-disclosure":
      return [{
        label: "open and disabled",
        description: "Open controls initial visibility; disabled keeps the trigger and content unavailable.",
        markup: `<div><ui-disclosure open><button type="button" aria-controls="${id}-open-panel">Open disclosure</button><div id="${id}-open-panel">Visible content.</div></ui-disclosure><ui-disclosure disabled><button type="button" aria-controls="${id}-disabled-panel">Disabled disclosure</button><div id="${id}-disabled-panel">Unavailable content.</div></ui-disclosure></div>`
      }];
    case "ui-editable":
      return [{
        label: "default-edit and disabled",
        description: "Default-edit starts in edit mode; disabled prevents the display value from entering edit mode.",
        markup: `<div><ui-editable default-edit><button data-ui-editable-trigger type="button">Edit</button><span slot="preview">Editable text</span><input slot="edit" value="Editable text" aria-label="Text" /></ui-editable><ui-editable disabled><button data-ui-editable-trigger type="button">Edit</button><span slot="preview">Disabled text</span><input slot="edit" value="Disabled text" aria-label="Disabled text" disabled /></ui-editable></div>`
      }];
    case "ui-editor-insert-table-grid":
      return [{
        label: `max-rows="6" and max-cols="6"`,
        description: "The maximum row and column properties bound the picker dimensions.",
        markup: `<ui-editor-insert-table-grid open max-rows="6" max-cols="6"></ui-editor-insert-table-grid>`
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
        label: "Capability flags",
        description: "Capability booleans expose only the table commands supported by the current selection.",
        markup: `<ui-editor-table-context-menu open can-add-row-after can-add-column-after can-delete-table></ui-editor-table-context-menu>`
      }];
    case "ui-editor-table-overlay":
      return [{
        label: "Rows, columns, and active cell",
        description: "Row and column boundaries define the overlay geometry while active-cell identifies the selection.",
        markup: `<ui-editor-table-overlay open rows="3" cols="3" active-cell="1,1" row-boundaries="0,40,80,120" column-boundaries="0,80,160,240"><table><tbody><tr><td>A1</td><td>B1</td><td>C1</td></tr><tr><td>A2</td><td>B2</td><td>C2</td></tr></tbody></table></ui-editor-table-overlay>`
      }];
    case "ui-editor-table-toolbar":
      return [{
        label: "Alignment and capability flags",
        description: "Cell-alignment records the active alignment and capability booleans expose supported commands.",
        markup: `<ui-editor-table-toolbar open cell-alignment="center" can-add-row-after can-add-column-after can-merge-cells></ui-editor-table-toolbar>`
      }];
    case "ui-floating-action-button":
      return [{
        label: "disabled",
        description: "Disabled preserves the accessible label and position while preventing activation.",
        markup: `<ui-floating-action-button label="Create" disabled>${plusIcon}</ui-floating-action-button>`
      }];
    case "ui-form-field":
      return [{
        label: "required and invalid",
        description: "Required and invalid attach state to the label, native control, and error message as one field.",
        markup: `<ui-form-field required invalid><label for="required-field">Label</label><input id="required-field" type="text" aria-invalid="true" aria-describedby="field-error" /><small id="field-error" data-slot="error">Error message</small></ui-form-field>`
      }];
    case "ui-grid":
      return [{
        label: "Gap and minimum column width",
        description: "Gap controls spacing while min controls the intrinsic wrap point for columns.",
        markup: `<ui-grid gap="xs" min="sm"><button type="button">One</button><button type="button">Two</button><button type="button">Three</button><button type="button">Four</button></ui-grid>`
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
          markup: `<ui-inline gap="l"><span>Alpha</span><span>Beta</span><span>Gamma</span></ui-inline>`
        },
        {
          label: `align="center" and justify="between"`,
          description: "Center aligns children of different heights while space-between distributes them across the row.",
          markup: `<ui-inline gap="m" align="center" justify="between"><span>Start</span><span><strong>Two lines</strong><br /><small>Centered</small></span><span>End</span></ui-inline>`
        },
        {
          label: `wrap="wrap"`,
          description: "A constrained row wraps a common set of actions instead of squeezing or overflowing them.",
          markup: `<div style="max-width: 14rem"><ui-inline gap="s" wrap="wrap"><button type="button">Edit</button><button type="button">Duplicate</button><button type="button">Move</button><button type="button">Archive</button></ui-inline></div>`
        }
      ];
    case "ui-input":
      return [{
        label: "invalid, read-only, and disabled",
        description: "These state properties keep validation and availability synchronized with the native input.",
        markup: `<div><ui-input invalid value="invalid"><input type="text" aria-label="Invalid" aria-invalid="true" /></ui-input><ui-input read-only value="read only"><input type="text" aria-label="Read only" readonly /></ui-input><ui-input disabled value="disabled"><input type="text" aria-label="Disabled" disabled /></ui-input></div>`
      }];
    case "ui-menu":
      return [{
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
        label: "placement and default-open",
        description: "Placement controls the preferred anchor edge while default-open sets only the initial state.",
        markup: `<button id="details-trigger" type="button" popovertarget="details-popover">Open popover</button><ui-popover id="details-popover" for="details-trigger" placement="bottom-end" default-open><strong>Popover heading</strong><p>Popover content.</p></ui-popover>`
      }];
    case "ui-radio":
      return [{
        label: "default-checked and disabled",
        description: "Default-checked supplies initial selection while disabled prevents later changes.",
        markup: `<div><ui-radio name="${id}-state" value="checked" default-checked><input type="radio" name="${id}-state" checked />Checked</ui-radio><ui-radio name="${id}-state" value="disabled" disabled><input type="radio" name="${id}-state" disabled />Disabled</ui-radio></div>`
      }];
    case "ui-radio-group":
      return [{
        label: "Vertical, required, and value",
        description: "Orientation changes the axis; required and value define group validation and selection.",
        markup: `<ui-radio-group value="two" name="${id}-vertical" orientation="vertical" required><ui-radio value="one">One</ui-radio><ui-radio value="two">Two</ui-radio><ui-radio value="three">Three</ui-radio></ui-radio-group>`
      }];
    case "ui-reel":
      return [{
        label: "Gap, item width, and snap",
        description: "These three properties control spacing, each child's basis, and the scroll snap position.",
        markup: `<ui-reel gap="m" item-width="md" snap="center" aria-label="Items"><button type="button">One</button><button type="button">Two</button><button type="button">Three</button><button type="button">Four</button></ui-reel>`
      }];
    case "ui-search-result-row":
      return [{
        label: "selected and disabled",
        description: "Selected marks the active result; disabled keeps an unavailable result visible but inert.",
        markup: `<div><ui-search-result-row selected><span slot="title">Selected result</span><span slot="meta">Available</span></ui-search-result-row><ui-search-result-row disabled><span slot="title">Disabled result</span><span slot="meta">Unavailable</span></ui-search-result-row></div>`
      }];
    case "ui-select":
      return [{
        label: "required and invalid",
        description: "Required and invalid synchronize validation state with the native select.",
        markup: `<ui-select required invalid><select aria-label="Workspace role" aria-invalid="true"><option value="">Choose a role…</option><option value="viewer">Viewer</option><option value="editor">Editor</option></select></ui-select>`
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
        markup: `<ui-sidebar gap="m" side="end" width="narrow" resizable min-width="176" max-width="360" resize-label="Resize sidebar"><main>Main content</main><aside>Sidebar</aside></ui-sidebar>`
      }];
    case "ui-stack":
      return [{
        label: "Gap and alignment",
        description: "Gap controls vertical rhythm while stretch makes children fill the stack's inline axis.",
        markup: `<ui-stack gap="m" align="stretch"><button type="button">One</button><button type="button">Two</button><button type="button">Three</button></ui-stack>`
      }];
    case "ui-switch":
      return [{
        label: "default-checked and disabled",
        description: "Default-checked supplies initial on state while disabled prevents interaction.",
        markup: `<div><ui-switch default-checked><input type="checkbox" checked />Checked</ui-switch><ui-switch disabled><input type="checkbox" disabled />Disabled</ui-switch></div>`
      }];
    case "ui-switcher":
      return [{
        label: "Gap, threshold, and alignment",
        description: "Threshold sets the intrinsic switch point while gap and alignment control the resulting layout.",
        markup: `<ui-switcher gap="m" threshold="md" align="stretch"><article><strong>One</strong><p>First region</p></article><article><strong>Two</strong><p>Second region</p></article><article><strong>Three</strong><p>Third region</p></article></ui-switcher>`
      }];
    case "ui-tabs":
      return [{
        label: `orientation="vertical"`,
        description: "Vertical orientation changes the tablist axis while preserving the same tab and panel relationships.",
        markup: `<ui-tabs orientation="vertical" default-value="profile"><div role="tablist" aria-label="Settings"><button role="tab" id="${id}-profile-tab" aria-controls="${id}-profile-panel" data-value="profile">Profile</button><button role="tab" id="${id}-security-tab" aria-controls="${id}-security-panel" data-value="security">Security</button></div><section role="tabpanel" id="${id}-profile-panel" aria-labelledby="${id}-profile-tab">Profile settings</section><section role="tabpanel" id="${id}-security-panel" aria-labelledby="${id}-security-tab" hidden>Security settings</section></ui-tabs>`
      }];
    case "ui-textarea":
      return [{
        label: "rows, invalid, and read-only",
        description: "Rows sets the visible height while invalid and read-only express validation and availability.",
        markup: `<div><ui-textarea rows="4" invalid value="Invalid"><textarea aria-label="Invalid" aria-invalid="true"></textarea></ui-textarea><ui-textarea rows="3" read-only value="Read only"><textarea aria-label="Read only" readonly></textarea></ui-textarea></div>`
      }];
    case "ui-tooltip":
      return [
        {
          label: "Placement and delays",
          description: "Placement chooses the preferred edge; show-delay and hide-delay tune hover timing.",
          markup: `<button id="${id}-timed-trigger" type="button">Help</button><ui-tooltip for="${id}-timed-trigger" placement="bottom-start" show-delay="0" hide-delay="200">Tooltip content.</ui-tooltip>`
        },
        {
          label: "toggle-on-click",
          description: "Toggle-on-click lets pointer and touch users pin the tooltip until dismissal.",
          markup: `<button id="${id}-click-trigger" type="button">Help</button><ui-tooltip for="${id}-click-trigger" toggle-on-click show-delay="0">Tooltip content.</ui-tooltip>`
        }
      ];
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
        markup: `<ui-editor-toolbar aria-label="Block formatting"><button type="button">Heading</button><button type="button">Quote</button><button type="button">Code</button></ui-editor-toolbar>`
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
        label: "Status and footer slots",
        description: "The status and footer slots add result feedback and keyboard guidance around the required search and body regions.",
        markup: `<ui-search-shell><div slot="backdrop"></div><div slot="search"><input type="search" aria-label="Search" /></div><div slot="body">Results</div><div slot="status">2 results</div><div slot="footer">Escape to close</div></ui-search-shell>`
      }];
    case "ui-top-bar":
      return [{
        label: "Leading and actions slots",
        description: "Leading and actions place native controls on either side of the default title slot.",
        markup: `<ui-top-bar><button slot="leading" type="button">Back</button><strong>Title</strong><button slot="actions" type="button">Action</button></ui-top-bar>`
      }];
    case "ui-toast-region":
      return [{
        label: "Multiple messages",
        description: "Multiple supplied toast elements share one open announced region and keep independent dismiss controls.",
        markup: `<ui-toast-region open><div data-ui-toast>Page published.<button type="button" data-ui-toast-dismiss aria-label="Dismiss published notification">×</button></div><div data-ui-toast>Link copied.<button type="button" data-ui-toast-dismiss aria-label="Dismiss copied notification">×</button></div></ui-toast-region>`
      }];
    case "ui-tree":
      return [{
        label: "max-depth and hover-expand-delay",
        description: "Max-depth limits nesting while hover-expand-delay controls drag-hover expansion timing.",
        markup: `<ui-tree label="Items" max-depth="2" hover-expand-delay="300"><ui-tree-item item-id="parent" label="Parent" container expanded><span>Parent</span><ui-tree-item slot="children" item-id="child" label="Child"><span>Child</span></ui-tree-item></ui-tree-item></ui-tree>`
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
    propertyAssignments: propertyAssignments(component),
    dialogId: component === "ui-dialog" ? "confirmation-dialog" : undefined
  }];
  scenarios.push(...curatedScenarios(component, id));

  return scenarios.filter((scenario, index, all) =>
    all.findIndex((candidate) => candidate.markup === scenario.markup) === index
  );
}

function ComponentPreviewClient({ component, compact = false }: ComponentPreviewProps): JSX.Element {
  const ready = useLoomaRuntime();
  const rootRef = useRef<HTMLDivElement>(null);
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

    const dialogCleanups = Array.from(
      rootRef.current.querySelectorAll<HTMLButtonElement>("[data-dialog-demo]")
    ).map((dialogTrigger) => {
      const scope = dialogTrigger.closest(".looma-preview-scenario") ?? rootRef.current!;
      const dialogClose = scope.querySelector<HTMLButtonElement>("[data-dialog-close]");
      // Observation may already have lowered the authored host, so support both lifecycle states.
      const dialogRoot = scope.querySelector<HTMLElement & { open?: boolean }>(
        "ui-dialog, [data-component-root~='ui-dialog']"
      );
      const openDialog = () => {
        if (dialogRoot) dialogRoot.open = true;
      };
      const closeDialog = () => {
        if (dialogRoot) dialogRoot.open = false;
      };
      dialogTrigger.addEventListener("click", openDialog);
      dialogClose?.addEventListener("click", closeDialog);
      return () => {
        dialogTrigger.removeEventListener("click", openDialog);
        dialogClose?.removeEventListener("click", closeDialog);
      };
    });
    const toastTrigger = rootRef.current.querySelector<HTMLButtonElement>("[data-toast-demo]");
    const toastRegion = rootRef.current.querySelector<HTMLElement>(
      "ui-toast-region, [data-component-root~='ui-toast-region']"
    );
    const showToast = () => {
      if (!toastRegion || toastRegion.querySelector("[data-ui-toast]")) return;
      const toast = document.createElement("div");
      const dismiss = document.createElement("button");
      toast.dataset.uiToast = "";
      toast.append("Page saved.");
      dismiss.type = "button";
      dismiss.dataset.uiToastDismiss = "";
      dismiss.ariaLabel = "Dismiss";
      dismiss.textContent = "×";
      toast.append(dismiss);
      toastRegion.append(toast);
    };
    toastTrigger?.addEventListener("click", showToast);
    return () => {
      for (const cleanup of dialogCleanups) cleanup();
      toastTrigger?.removeEventListener("click", showToast);
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
              {/* Only static, repository-authored scenario strings reach this sink. */}
              <div
                className="looma-preview-scenario__stage"
                dangerouslySetInnerHTML={{ __html: scenario.markup }}
              />
              <ScenarioModeExample
                markup={scenario.markup}
                propertyAssignments={scenario.propertyAssignments}
                dialogId={scenario.dialogId}
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
