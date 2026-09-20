import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useEffect, useId, useRef } from "react";

import { useLoomaRuntime } from "./LiveExample";

interface ComponentPreviewProps {
  component: string;
  compact?: boolean;
}

const plusIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 5v14M5 12h14" />
  </svg>`;

const searchIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>`;

function previewMarkup(component: string, id: string): string {
  const cards = `<span class="demo-tile">One</span><span class="demo-tile">Two</span><span class="demo-tile">Three</span>`;
  const avatar = (name: string) => {
    const initials = name.split(" ").map((part) => part[0]).join("");
    return `<ui-avatar name="${name}" fallback="${initials}"><span data-ui-avatar-fallback>${initials}</span></ui-avatar>`;
  };

  switch (component) {
    case "ui-affordance-scope":
      return `<ui-affordance-scope near-radius="24"><ui-icon-button label="Add item" variant="ghost">${plusIcon}</ui-icon-button><span class="demo-muted">Move nearby</span></ui-affordance-scope>`;
    case "ui-avatar":
      return avatar("Maya Chen");
    case "ui-avatar-group":
      return `<ui-avatar-group max="3" label="Project team">${avatar("Maya Chen")}${avatar("Noah Williams")}${avatar("Ari Kim")}${avatar("Sam Rivera")}</ui-avatar-group>`;
    case "ui-badge":
      return `<ui-badge variant="subtle" tone="success">Shipped</ui-badge>`;
    case "ui-button":
      return `<ui-button variant="solid" size="sm"><button type="button">Save changes</button></ui-button>`;
    case "ui-callout":
      return `<ui-callout tone="success">Your changes are live.</ui-callout>`;
    case "ui-center":
      return `<ui-center measure="narrow" gutters="s"><div class="demo-copy"><strong>Readable by default</strong><span>Centered content with a useful measure.</span></div></ui-center>`;
    case "ui-checkbox":
      return `<ui-checkbox value="updates" default-checked><label><input type="checkbox" checked /><span>Product updates</span></label></ui-checkbox>`;
    case "ui-chip":
      return `<ui-cluster gap="s"><ui-chip appearance="tag">Research</ui-chip><ui-chip appearance="pill">Design</ui-chip></ui-cluster>`;
    case "ui-cluster":
      return `<ui-cluster gap="s" align="center">${cards}</ui-cluster>`;
    case "ui-combobox":
      return `<ui-combobox data-looma-config label="Destination" disclosure clearable size="sm" placeholder="Search places…"></ui-combobox>`;
    case "ui-context-menu":
      return `<div id="${id}-target" class="demo-context-target"><span>Right-click me</span><ui-context-menu for="${id}-target"><button slot="trigger" type="button">Actions</button><ui-menu-item value="edit">Edit</ui-menu-item><ui-menu-item value="duplicate">Duplicate</ui-menu-item></ui-context-menu></div>`;
    case "ui-dialog":
      return `<ui-dialog modal="false"><dialog><strong>Publish changes?</strong><p>Everyone will see the new version.</p><div class="demo-dialog-actions"><button type="button" data-dialog-close>Cancel</button><ui-button variant="solid" size="sm"><button type="button">Publish</button></ui-button></div></dialog></ui-dialog><button class="demo-native-button" type="button" data-dialog-demo>Open dialog</button>`;
    case "ui-disclosure":
      return `<ui-disclosure open><button type="button" aria-controls="${id}-panel">Why light DOM?</button><div id="${id}-panel">Inspectable, semantic markup.</div></ui-disclosure>`;
    case "ui-editable":
      return `<ui-editable value="Project Atlas"><span data-slot="display">Project Atlas</span><input data-slot="input" value="Project Atlas" aria-label="Project name" /></ui-editable>`;
    case "ui-editor-insert-table-grid":
      return `<ui-editor-insert-table-grid open max-rows="3" max-cols="4"><div class="ui-editor-insert-table-grid"><p class="ui-editor-insert-table-grid__hint">2 × 3 table</p><div class="ui-editor-insert-table-grid__grid" style="--ui-editor-table-grid-cols:4;--ui-editor-table-grid-rows:3">${Array.from({ length: 12 }, (_, index) => `<button type="button" aria-label="${Math.floor(index / 4) + 1} by ${(index % 4) + 1}" class="ui-editor-insert-table-grid__cell${index < 6 ? " ui-editor-insert-table-grid__cell--selected" : ""}"></button>`).join("")}</div><button type="button" data-insert-table>Insert table</button></div></ui-editor-insert-table-grid>`;
    case "ui-editor-mention-menu":
      return `<ui-editor-mention-menu open><button type="button"><span class="demo-avatar">MC</span>Maya Chen</button><button type="button"><span class="demo-avatar demo-avatar--teal">NW</span>Noah Williams</button></ui-editor-mention-menu>`;
    case "ui-editor-slash-menu":
      return `<ui-editor-slash-menu open><button type="button">Text</button><button type="button">Heading</button><button type="button">Table</button></ui-editor-slash-menu>`;
    case "ui-editor-table-context-menu":
      return `<ui-editor-table-context-menu open><button type="button">Insert row below</button><button type="button">Delete column</button></ui-editor-table-context-menu>`;
    case "ui-editor-table-overlay":
      return `<ui-editor-table-overlay><div class="demo-table"><span>A1</span><span>B1</span><span>A2</span><span>B2</span></div></ui-editor-table-overlay>`;
    case "ui-editor-table-toolbar":
      return `<ui-editor-table-toolbar><ui-icon-button label="Align left" size="sm" variant="ghost"><span aria-hidden="true">≡</span></ui-icon-button><ui-icon-button label="Add row" size="sm" variant="ghost">${plusIcon}</ui-icon-button><ui-icon-button label="Delete table" size="sm" variant="ghost"><span aria-hidden="true">×</span></ui-icon-button></ui-editor-table-toolbar>`;
    case "ui-editor-toolbar":
      return `<ui-editor-toolbar aria-label="Formatting"><ui-button variant="ghost" size="sm"><button type="button"><strong>B</strong></button></ui-button><ui-button variant="ghost" size="sm"><button type="button"><em>I</em></button></ui-button><ui-button variant="ghost" size="sm"><button type="button">Link</button></ui-button></ui-editor-toolbar>`;
    case "ui-floating-action-button":
      return `<ui-floating-action-button label="Create page" style="position:absolute;inset:auto 20px 18px auto">${plusIcon}</ui-floating-action-button>`;
    case "ui-form-field":
      return `<ui-form-field required><label for="${id}-email">Email</label><ui-input><input id="${id}-email" type="email" placeholder="you@example.com" /></ui-input><small data-slot="help">Used for account notices.</small></ui-form-field>`;
    case "ui-grid":
      return `<ui-grid gap="s" min="sm">${cards}</ui-grid>`;
    case "ui-icon-button":
      return `<ui-icon-button label="Search" variant="ghost" size="md">${searchIcon}</ui-icon-button>`;
    case "ui-inline":
      return `<ui-inline gap="s" wrap="wrap"><ui-button size="sm"><button type="button">Edit</button></ui-button><ui-button size="sm"><button type="button">Share</button></ui-button></ui-inline>`;
    case "ui-input":
      return `<ui-input value="Project Atlas"><input type="text" aria-label="Project name" /></ui-input>`;
    case "ui-menu":
      return `<ui-menu role="menu" aria-label="Page actions" open><ui-menu-item value="edit">Edit page</ui-menu-item><ui-menu-item value="duplicate">Duplicate</ui-menu-item><ui-menu-item value="archive">Archive</ui-menu-item></ui-menu>`;
    case "ui-menu-item":
      return `<ui-menu role="menu" aria-label="Quick actions" open><ui-menu-item value="rename">Rename</ui-menu-item><ui-menu-item value="move">Move to…</ui-menu-item></ui-menu>`;
    case "ui-popover":
      return `<ui-button size="sm"><button id="${id}-popover-trigger" type="button" popovertarget="${id}-popover">Open tips</button></ui-button><ui-popover id="${id}-popover" for="${id}-popover-trigger">Press ⌘K from anywhere.</ui-popover>`;
    case "ui-radio":
      return `<ui-radio value="pro" checked><input type="radio" name="${id}-plan" checked />Pro plan</ui-radio>`;
    case "ui-radio-group":
      return `<ui-radio-group value="pro" name="${id}-plans" orientation="horizontal"><ui-radio value="starter">Starter</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>`;
    case "ui-reel":
      return `<ui-reel gap="s" item-width="sm" snap="start" aria-label="Recent pages">${cards}<span class="demo-tile">Four</span></ui-reel>`;
    case "ui-search-result-row":
      return `<ui-search-result-row selected><span slot="leading">⌘</span><p slot="title">Project brief</p><p slot="meta">Page</p><p slot="excerpt">Shared notes and next steps.</p><span slot="trailing">↵</span></ui-search-result-row>`;
    case "ui-search-shell":
      return `<ui-search-shell style="position:relative;inset:auto;display:block;min-height:150px;--ui-search-shell-z-index:1"><div slot="backdrop"></div><div slot="search" class="demo-search">${searchIcon}<input type="search" placeholder="Search Looma…" /></div><div slot="body"><ui-search-result-row selected><span slot="leading">◈</span><p slot="title">Button</p><p slot="meta">Form</p></ui-search-result-row></div><div slot="footer" class="demo-muted">Enter to open</div></ui-search-shell>`;
    case "ui-select":
      return `<ui-select value="editor"><select aria-label="Role"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></ui-select>`;
    case "ui-separator":
      return `<div class="demo-separator"><span>Before</span><ui-separator orientation="vertical"></ui-separator><span>After</span></div>`;
    case "ui-sidebar":
      return `<ui-sidebar gap="s" side="start" width="narrow"><aside class="demo-panel">Filters</aside><main class="demo-panel">Results</main></ui-sidebar>`;
    case "ui-stack":
      return `<ui-stack gap="s"><span class="demo-tile">Header</span><span class="demo-tile">Body</span><span class="demo-tile">Footer</span></ui-stack>`;
    case "ui-switch":
      return `<ui-switch checked value="notifications"><input type="checkbox" checked />Notifications</ui-switch>`;
    case "ui-switcher":
      return `<ui-switcher gap="s" threshold="xs"><span class="demo-tile">Navigation</span><span class="demo-tile">Content</span></ui-switcher>`;
    case "ui-tabs":
      return `<ui-tabs><div role="tablist" aria-label="View"><button role="tab" id="${id}-tab-a" aria-controls="${id}-panel-a">Preview</button><button role="tab" id="${id}-tab-b" aria-controls="${id}-panel-b">Code</button></div><section role="tabpanel" id="${id}-panel-a" aria-labelledby="${id}-tab-a">A live component preview.</section><section role="tabpanel" id="${id}-panel-b" aria-labelledby="${id}-tab-b" hidden>Semantic HTML.</section></ui-tabs>`;
    case "ui-textarea":
      return `<ui-textarea value="A clear, useful note." rows="3"><textarea aria-label="Notes"></textarea></ui-textarea>`;
    case "ui-toast-region":
      return `<button class="demo-native-button" type="button" data-toast-demo>Show toast</button><ui-toast-region open></ui-toast-region>`;
    case "ui-tooltip":
      return `<ui-icon-button id="${id}-tooltip-trigger" label="More information" variant="ghost">?<span class="sr-only">More information</span></ui-icon-button><ui-tooltip for="${id}-tooltip-trigger">Helpful context, right where it is needed.</ui-tooltip>`;
    case "ui-top-bar":
      return `<ui-top-bar style="--ui-top-bar-z-index:1"><button slot="leading" type="button" aria-label="Open navigation">☰</button><strong>Project Atlas</strong><button slot="search" type="button" aria-label="Search">⌕</button><button slot="actions" type="button">Share</button></ui-top-bar>`;
    case "ui-tree":
      return `<ui-tree label="Project pages"><ui-tree-item item-id="brief" label="Project brief"><span>Project brief</span></ui-tree-item><ui-tree-item item-id="research" label="Research" container expanded><span>Research</span><ui-tree-item slot="children" item-id="notes" label="Interview notes"><span>Interview notes</span></ui-tree-item></ui-tree-item></ui-tree>`;
    case "ui-tree-item":
      return `<ui-tree label="Page"><ui-tree-item item-id="roadmap" label="Roadmap" selected><span>Roadmap</span><ui-icon-button slot="actions" label="Page options" size="sm" variant="ghost"><span aria-hidden="true">•••</span></ui-icon-button></ui-tree-item></ui-tree>`;
    default:
      return `<${component}>Live ${component} example</${component}>`;
  }
}

function ComponentPreviewClient({ component, compact = false }: ComponentPreviewProps): JSX.Element {
  const ready = useLoomaRuntime();
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !rootRef.current) return;

    const combobox = rootRef.current.querySelector<HTMLElement & { config?: unknown }>("[data-looma-config]");
    if (combobox) {
      combobox.config = {
        allowFreeText: true,
        allowCreate: true,
        options: [
          { id: "north", value: "north", label: "North terminal", description: "Harbor district" },
          { id: "west", value: "west", label: "West terminal", description: "Riverside" }
        ]
      };
    }

    const dialogTrigger = rootRef.current.querySelector<HTMLButtonElement>("[data-dialog-demo]");
    const dialogClose = rootRef.current.querySelector<HTMLButtonElement>("[data-dialog-close]");
    const dialog = rootRef.current.querySelector<HTMLDialogElement>("dialog");
    const toastTrigger = rootRef.current.querySelector<HTMLButtonElement>("[data-toast-demo]");
    const toastRegion = rootRef.current.querySelector<HTMLElement>(
      "ui-toast-region, [data-component-root~='ui-toast-region']"
    );
    const openDialog = () => dialog?.show();
    const closeDialog = () => dialog?.close();
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
    dialogTrigger?.addEventListener("click", openDialog);
    dialogClose?.addEventListener("click", closeDialog);
    toastTrigger?.addEventListener("click", showToast);
    return () => {
      dialogTrigger?.removeEventListener("click", openDialog);
      dialogClose?.removeEventListener("click", closeDialog);
      toastTrigger?.removeEventListener("click", showToast);
    };
  }, [component, ready]);

  return (
    <div
      ref={rootRef}
      className={`looma-component-preview${compact ? " looma-component-preview--compact" : ""}`}
    >
      {ready ? (
        <div dangerouslySetInnerHTML={{ __html: previewMarkup(component, `looma-${generatedId}`) }} />
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
