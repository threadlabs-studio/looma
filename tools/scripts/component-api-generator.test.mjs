import assert from "node:assert/strict";
import test from "node:test";

import {
  declarativeTypeToTypeScript,
  extractDesignTokensFromCss,
  generateComponentApiMetadata,
  readRepositoryProjectionTags,
  validateBooleanDefaultPolicy,
  validateComponentProjections
} from "./component-api-generator.mjs";

const completeFixture = {
  sourceTags: ["ui-button"],
  classifications: { "ui-button": "published" },
  metadataTags: ["ui-button"],
  documentationTags: ["ui-button"],
  navigationTags: ["ui-button"],
  adapterTags: ["ui-button"]
};

test("rejects a source tag that has not been classified", () => {
  assert.throws(
    () =>
      validateComponentProjections({
        ...completeFixture,
        sourceTags: [...completeFixture.sourceTags, "ui-unclassified"]
      }),
    /unclassified source tags: ui-unclassified/
  );
});

test("names every missing projection for a newly published source tag", () => {
  assert.throws(
    () =>
      validateComponentProjections({
        ...completeFixture,
        sourceTags: [...completeFixture.sourceTags, "ui-new-primitive"],
        classifications: {
          ...completeFixture.classifications,
          "ui-new-primitive": "published"
        }
      }),
    (error) => {
      assert.match(error.message, /metadata missing published tags: ui-new-primitive/);
      assert.match(error.message, /documentation missing published tags: ui-new-primitive/);
      assert.match(error.message, /navigation missing published tags: ui-new-primitive/);
      assert.match(error.message, /adapter missing published tags: ui-new-primitive/);
      return true;
    }
  );
});

test("rejects duplicate projections instead of silently de-duplicating them", () => {
  assert.throws(
    () =>
      validateComponentProjections({
        ...completeFixture,
        metadataTags: ["ui-button", "ui-button"]
      }),
    /metadata duplicate tags: ui-button/
  );
});

test("accepts a complete classified projection", () => {
  assert.doesNotThrow(() => validateComponentProjections(completeFixture));
});

test("accepts a published compound part through its explicit navigated parent", () => {
  assert.doesNotThrow(() => validateComponentProjections({
    sourceTags: ["ui-menu", "ui-menu-item"],
    classifications: {
      "ui-menu": "published",
      "ui-menu-item": { status: "published", navigationParent: "ui-menu" }
    },
    metadataTags: ["ui-menu", "ui-menu-item"],
    documentationTags: ["ui-menu", "ui-menu-item"],
    navigationTags: ["ui-menu"],
    adapterTags: ["ui-menu", "ui-menu-item"]
  }));
});

test("requires a UX justification for every default-true boolean", () => {
  const component = (declaration) => ({
    props: { enabled: declaration }
  });
  assert.throws(
    () => validateBooleanDefaultPolicy([{ contracts: {
      "ui-example": component({ type: "boolean", default: true })
    } }]),
    /ui-example\.enabled/
  );
  assert.doesNotThrow(() => validateBooleanDefaultPolicy([{ contracts: {
    "ui-example": component({
      type: "boolean",
      default: true,
      defaultTrueReason: "The component's primary editing surface must be interactive by default."
    })
  } }]));
});

test("discovers projections from their authoritative shared sources", async () => {
  const projections = await readRepositoryProjectionTags();

  assert.ok(projections.navigationTags.includes("ui-button"));
  assert.ok(projections.navigationTags.includes("ui-editor-table-overlay"));
  assert.ok(projections.adapterMapTags.includes("ui-editor-toolbar"));
  assert.ok(projections.adapterTags.includes("ui-editor-table-overlay"));
});

test("translates framework-neutral declarative types without legacy class names", () => {
  assert.equal(declarativeTypeToTypeScript("integer"), "number");
  assert.equal(
    declarativeTypeToTypeScript("string | null | list(unknown)"),
    "string | null | ReadonlyArray<unknown>"
  );
  assert.equal(
    declarativeTypeToTypeScript("object({ value: string, trigger: keyboard | pointer })"),
    '{ value: string; trigger: "keyboard" | "pointer" }'
  );
});

test("extracts component tokens, shared dependencies, and literal fallback relationships", () => {
  const tokens = extractDesignTokensFromCss({
    tag: "ui-example",
    source: `
      :host {
        --ui-example-gap: var(--ui-space-2, 0.5rem);
        gap: var(--ui-example-gap);
        color: var(--ui-example-color, var(--ui-text-primary));
      }
    `,
  });

  assert.deepEqual(tokens.component, [
    {
      name: "--ui-example-color",
      fallbacks: ["var(--ui-text-primary)"],
    },
    {
      name: "--ui-example-gap",
      declarations: ["var(--ui-space-2, 0.5rem)"],
    },
  ]);
  assert.deepEqual(tokens.shared, [
    { name: "--ui-space-2", fallbacks: ["0.5rem"] },
    { name: "--ui-text-primary" },
  ]);
});

test("reports a relayed hook's fallback, and the fallback behind a parent's default, as the hook's", () => {
  const tokens = extractDesignTokensFromCss({
    tag: "ui-example",
    source: `
      :host {
        --_ui-example-icon: var(--ui-example-icon);
        border-width: var(--ui-example-border-width, var(--_ui-default-example-border-width, 1px));
      }
      .icon { color: var(--_ui-example-icon, var(--ui-text-primary)); }
    `,
  });

  assert.deepEqual(tokens.component, [
    { name: "--ui-example-border-width", fallbacks: ["1px"] },
    { name: "--ui-example-icon", fallbacks: ["var(--ui-text-primary)"] },
  ]);
  assert.deepEqual(tokens.shared, [{ name: "--ui-text-primary" }]);
});

test("generates public API metadata from declarative contracts", async () => {
  const metadata = await generateComponentApiMetadata();
  const combobox = metadata.components.find(({ tag }) => tag === "ui-combobox");
  const mentionMenu = metadata.components.find(({ tag }) => tag === "ui-editor-mention-menu");
  const button = metadata.components.find(({ tag }) => tag === "ui-button");
  const stack = metadata.components.find(({ tag }) => tag === "ui-stack");
  const tableOverlay = metadata.components.find(({ tag }) => tag === "ui-editor-table-overlay");
  const input = metadata.components.find(({ tag }) => tag === "ui-input");
  const menuItem = metadata.components.find(({ tag }) => tag === "ui-menu-item");

  assert.equal(metadata.schemaVersion, 3);
  assert.equal(
    metadata.components.some(({ tag }) => tag === "ui-chip"),
    false,
    "redundant compatibility components must not re-enter public metadata",
  );
  assert.equal(
    metadata.components.some(({ tag }) => tag === "ui-floating-action-button"),
    false,
    "button-plus-positioning compatibility aliases must not re-enter public metadata",
  );
  assert.match(combobox.description, /suggestions/);
  assert.equal(combobox.root, "div");
  assert.equal(input.root, "input");
  assert.equal(menuItem.navigationParent, "ui-menu");
  assert.ok(!input.slots.some(({ name }) => name === "default"));
  assert.deepEqual(combobox.methods.map(({ name }) => name), ["validate", "focusInput"]);
  // Props are attributes: structured props appear as attributes too, and nothing is property-only.
  assert.ok(!combobox.properties.some(({ name }) => name === "config"));
  assert.ok(mentionMenu.attributes.some(({ property }) => property === "items"));
  assert.ok(combobox.properties.every((property) => !("channel" in property)));
  assert.ok(!("className" in combobox));
  assert.deepEqual(button.designTokens.sources, [
    "packages/looma/src/components/ui-button/ui-button.html",
  ]);
  assert.deepEqual(
    button.designTokens.component.find(({ name }) => name === "--ui-button-radius"),
    { name: "--ui-button-radius", fallbacks: ["var(--ui-radius-md)"] },
  );
  assert.ok(button.designTokens.shared.some(({ name }) => name === "--ui-font-medium"));
  assert.ok(stack.designTokens.component.some(({ name }) => name === "--ui-stack-gap"));
  assert.ok(!stack.designTokens.component.some(({ name }) => name === "--ui-grid-gap"));
  assert.ok(tableOverlay.designTokens.shared.some(
    ({ name }) => name === "--ui-affordance-near-color",
  ));
});

test("design tokens hide private defaults and report them as the public token's default", () => {
  const tokens = extractDesignTokensFromCss({
    tag: "ui-callout",
    source: `:scope { --_callout-surface: var(--ui-info-soft); background: var(--ui-callout-surface, var(--_callout-surface)); }
:scope[data-tone='danger'] { --_callout-surface: var(--ui-danger-soft); }`,
  });

  assert.deepEqual(tokens.component, [{
    name: "--ui-callout-surface",
    declarations: ["var(--ui-info-soft)", "var(--ui-danger-soft)"],
  }]);
  assert.deepEqual(tokens.shared.map((token) => token.name), ["--ui-danger-soft", "--ui-info-soft"]);
});
