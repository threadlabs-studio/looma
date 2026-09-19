import assert from "node:assert/strict";
import { test } from "node:test";

import { extractRenderJsx, renderPort } from "./convert-render.mjs";

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
