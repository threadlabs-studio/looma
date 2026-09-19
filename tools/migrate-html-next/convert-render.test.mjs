import assert from "node:assert/strict";
import { test } from "node:test";

import { extractRenderJsx, reflectedPropAttributes, renderPort } from "./convert-render.mjs";

const BADGE = `
  render() {
    return (
      <Host data-variant={this.variant || undefined} data-tone={this.tone || undefined}>
        <span class="badge__surface"><slot /></span>
      </Host>
    );
  }`;

test("extractRenderJsx returns the returned JSX", () => {
  const jsx = extractRenderJsx(BADGE);
  assert.match(jsx, /^<Host/);
  assert.match(jsx, /badge__surface/);
});

test("extractRenderJsx accepts an unparenthesized JSX return", () => {
  const combobox = `
    render() {
      return <Host data-size={this.size}>
        <label>{this.label}</label>
        <input value={this.display} />
      </Host>;
    }`;
  const jsx = extractRenderJsx(combobox);
  assert.match(jsx, /^<Host/);
  assert.match(jsx, /<input value=\{this\.display\} \/>/);
  assert.match(jsx, /<\/Host>$/);
});

test("renderPort reproduces the internal class structure and binds props", () => {
  const port = renderPort("ui-badge", BADGE, "span");
  assert.match(port, /<prop name="variant"/);
  assert.match(port, /<prop name="tone"/);
  assert.match(port, /<span :data-variant="variant" :data-tone="tone"><span class="badge__surface"><slot><\/slot><\/span><\/span>/);
});

test("drops conditionals, event handlers and refs; keeps only clean prop bindings", () => {
  const button = `
    render() {
      return (
        <Host data-variant={this.variant} data-disabled={this.disabled ? 'true' : undefined} onKeyDown={this.onKeydown}>
          <slot ref={(el) => (this.slotRef = el)} />
        </Host>
      );
    }`;
  const port = renderPort("ui-button", button, "span");
  assert.match(port, /<span :data-variant="variant"><slot><\/slot><\/span>/);
  assert.doesNotMatch(port, /onKeyDown|onKeydown|ref=|data-disabled|\{/);
  // disabled/onKeydown/slotRef are NOT props (they came from dropped bindings)
  assert.doesNotMatch(port, /name="(disabled|onKeydown|slotRef)"/);
});

test("preserves mixed text bindings and converts simple conditional subtrees", () => {
  const field = `
    @Prop() label = '';
    @Prop() clearable = false;
    @Prop() required = false;
    render() {
      return (
        <Host>
          <label>{this.label}{this.required ? ' *' : ''}</label>
          {this.clearable && <button onClick={() => this.clear()}>×</button>}
        </Host>
      );
    }`;
  const port = renderPort("ui-field", field, "span");
  assert.match(port, /<prop name="clearable" type="boolean" default="false">/);
  assert.match(port, /<label><template \$value="label"><\/template><\/label>/);
  assert.match(port, /<button \$if="clearable">×<\/button>/);
  assert.doesNotMatch(port, /onClick|this\.clear|this\.required|\$if="required"/);
});

test("converts prop ternaries to match branches", () => {
  const item = `
    @Prop() container = false;
    render() {
      return (
        <Host>
          {this.container ? (
            <button class="disclosure">Open</button>
          ) : <span class="disclosure-spacer" aria-hidden="true" />}
        </Host>
      );
    }`;
  const port = renderPort("ui-tree-item", item, "span");
  assert.match(port, /<template \$match><button \$when="container" class="disclosure">Open<\/button><span \$else class="disclosure-spacer" aria-hidden="true"><\/span><\/template>/);
});

test("converts compound boolean ternaries to if directives", () => {
  const item = `
    @Prop() sortable = false;
    @Prop() disabled = false;
    render() {
      return (<Host>{this.sortable && !this.disabled ? <button>Drag</button> : null}</Host>);
    }`;
  const port = renderPort("ui-tree-item", item, "span");
  assert.match(port, /<button \$if="sortable and not disabled">Drag<\/button>/);
});

test("declares Stencil state and preserves safe state-driven attributes", () => {
  const popup = `
    @State() expanded = false;
    @State() validation = { issues: [] };
    render() {
      return (<Host data-open={this.expanded ? '' : undefined}>
        <div class="popup" hidden={!this.expanded}></div>
        <div class="validation" hidden={!this.validation.issues.length}></div>
      </Host>);
    }`;
  const port = renderPort("ui-popup", popup, "span");
  assert.match(port, /<state name="expanded" :value="false"><\/state>/);
  assert.match(port, /<state name="validation" :value="\{ issues: \[\] \}"><\/state>/);
  assert.match(port, /<span :data-open="expanded">/);
  assert.match(port, /<div class="popup" :hidden="not expanded"><\/div>/);
  assert.match(port, /<div class="validation" :hidden="not validation\.issues\.length"><\/div>/);
  assert.doesNotMatch(port, /<prop name="expanded"/);
});

test("uses a framework-neutral public contract for structured properties and methods", () => {
  const tsx = `
    @Prop() config: ComboboxConfig = {};
    @Prop() tokenSeparators: readonly string[] = [];
    @Prop() value?: string | null | readonly Item[];
    @Method() async validate(): Promise<ValidationState> { return state; }
    @Method() async focusInput() { input.focus(); }
    render() { return (<Host><slot /></Host>); }
  `;
  const port = renderPort("ui-combobox", tsx, "span", { contract: {
    props: {
      config: { type: "unknown" },
      tokenSeparators: { type: "list(string)", attribute: "token-separators" },
      value: { type: "string | null | list(unknown)" },
    },
    methods: [
      { name: "validate", returns: "promise(unknown)" },
      { name: "focusInput", returns: "promise(undefined)" },
    ],
  } });
  assert.match(port, /<prop name="config" type="unknown">/);
  assert.match(port, /<prop name="tokenSeparators" type="list\(string\)">/);
  assert.match(port, /<prop name="value" type="string \| null \| list\(unknown\)">/);
  assert.match(port, /\.config="config"/);
  assert.match(port, /\.value="value"/);
  assert.doesNotMatch(port, /\.tokenSeparators="tokenSeparators"/);
  assert.match(port, /<method name="validate" export="validate" returns="promise\(unknown\)">/);
  assert.match(port, /<method name="focusInput" export="focusInput" returns="promise\(undefined\)">/);
});

test("innerHTML (icons) is dropped, leaving an empty element", () => {
  const callout = `
    render() {
      return (
        <Host role="note" data-tone={this.tone}>
          <div class="callout__surface"><span class="icon" innerHTML={loomaIconMarkup(icon)} /><div class="content"><slot /></div></div>
        </Host>
      );
    }`;
  const port = renderPort("ui-callout", callout, "div");
  assert.match(port, /<div role="note" :data-tone="tone">/);
  assert.match(port, /<span class="icon"><\/span>/);
  assert.doesNotMatch(port, /innerHTML/);
});

test("wraps render trees that omit Host in a distinct lowered host", () => {
  const shell = `
    render() {
      return (
        <div class="search-shell"><div class="search-shell__panel"><slot name="body" /></div></div>
      );
    }`;
  const port = renderPort("ui-search-shell", shell, "div");
  assert.match(port, /<div><div class="search-shell"><div class="search-shell__panel"><slot name="body"><\/slot><\/div><\/div><\/div>/);
});

test("maps Stencil attribute aliases to HTML Next reflected prop attributes", () => {
  const attributes = reflectedPropAttributes(`
    @Prop({ attribute: 'mobile-only', reflect: true }) mobileOnly = false;
    @Prop({ reflect: true }) size: 'sm' | 'md' = 'md';
  `);
  assert.equal(attributes.get("mobile-only"), "data-mobile-only");
  assert.equal(attributes.get("size"), "data-size");
});
