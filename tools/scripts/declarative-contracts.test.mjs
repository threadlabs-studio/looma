import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseDeclarativeContract,
  readDeclarativeContractGroups,
} from "./declarative-contracts.mjs";

test("derives the public contract from one maintained declarative definition", () => {
  const contract = parseDeclarativeContract(`
    <link rel="component" href="./ui-child.html">
    <template component="ui-example" summary="Direct native example.">
      <defs>
        <prop name="disabled" type="boolean" default="false">Whether editing is disabled.</prop>
        <prop name="items" type="list(object({ id: string }))">Structured items.</prop>
        <event name="change" type="object({ value: string })"></event>
        <method name="focus" returns="promise(undefined)"></method>
      </defs>
      <input :disabled="disabled">
      <style>:scope { color: var(--ui-text-primary); }</style>
    </template>
  `, "ui-example");

  assert.equal(contract.root, "input");
  assert.deepEqual(contract.props.disabled, { type: "boolean", default: false });
  assert.ok(!("channel" in contract.props.items));
  assert.deepEqual(contract.events, [{ name: "change", type: "object({ value: string })" }]);
  assert.deepEqual(contract.methods, [{ name: "focus", returns: "promise(undefined)" }]);
  assert.deepEqual(contract.dependencies, ["ui-child"]);
  assert.deepEqual(contract.slots, []);
});

test("loads every package contract from package-owned declarative source", async () => {
  const groups = await readDeclarativeContractGroups();
  assert.deepEqual(groups.map(({ name }) => name), ["core", "layout", "editor"]);
  assert.equal(Object.values(groups).flatMap(({ contracts }) => Object.keys(contracts)).length, 48);
  assert.equal(groups[0].contracts["ui-select"].root, "select");
});

test("raw HTML contracts use native state names and false-default booleans", async () => {
  const groups = await readDeclarativeContractGroups();
  const violations = [];

  for (const { contracts } of groups) {
    for (const [tag, contract] of Object.entries(contracts)) {
      for (const [name, declaration] of Object.entries(contract.props)) {
        if (/^default[A-Z]/.test(name)) {
          violations.push(`${tag}.${name}: framework-style default props do not belong in raw HTML`);
        }
        if (declaration.type === "boolean" && declaration.default !== false && !declaration.defaultTrueReason) {
          violations.push(`${tag}.${name}: booleans must default false unless a reason is declared`);
        }
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("the declarative authoring spec defines typed HTML attributes without framework state vocabulary", async () => {
  const conventions = await readFile(
    new URL("../../apps/docs/docs/conventions.md", import.meta.url),
    "utf8",
  );

  assert.match(conventions, /attribute strings\s+are coerced according to the declared property type/i);
  assert.match(conventions, /parity with native HTML controls/i);
  assert.match(conventions, /bare boolean attribute/i);
  assert.doesNotMatch(conventions, /default-open|default-value|default-checked|default-edit/i);
});

test("editor integration selectors target settled declarative roots", async () => {
  const styles = await readFile(
    new URL("../../packages/editor/src/declarative/styles.css", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(styles, /\[data-component-root="\[data-component-root/);
  assert.match(styles, /\.looma-editor__sticky-toolbar-shell \[data-component-root~="ui-editor-toolbar"\]/);
});

test("semantic controls lower directly to their native roots", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const expectedRoots = {
    "ui-button": "button",
    "ui-dialog": "dialog",
    "ui-floating-action-button": "button",
    "ui-input": "input",
    "ui-search-result-row": "button",
    "ui-select": "select",
    "ui-textarea": "textarea",
  };

  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedRoots).map((tag) => [tag, contracts[tag].root])),
    expectedRoots,
  );
});

test("public examples do not require implementation hooks", async () => {
  const source = await readFile(new URL("../../apps/docs/src/components/ComponentPreview.tsx", import.meta.url), "utf8");
  const hooks = [...source.matchAll(/\bdata-(?:ui|slot|dialog)-[a-z0-9-]+/g)].map((match) => match[0]);
  const scenarioMarkup = [...source.matchAll(/(?:return|markup:)\s*`([^`]*)`/g)]
    .map((match) => match[1]);
  assert.deepEqual([...new Set(hooks)].sort(), []);
  assert.deepEqual(
    scenarioMarkup.filter((markup) => /<(?:button|input|select|textarea)\b/.test(markup)),
    [],
    "component examples should compose Looma controls instead of browser-default controls",
  );
});

test("redundant layout aliases stay compatible without remaining public components", async () => {
  const groups = await readDeclarativeContractGroups();
  const layout = groups.find(({ name }) => name === "layout");
  const classifications = JSON.parse(await readFile(
    new URL("../data/component-release-classification.json", import.meta.url),
    "utf8",
  )).tags;
  const navigation = await readFile(
    new URL("../../apps/docs/src/componentNavigation.ts", import.meta.url),
    "utf8",
  );

  assert.deepEqual(Object.keys(layout.contracts["ui-cluster"].props).sort(), ["align", "gap"]);
  assert.equal(classifications["ui-chip"].status, "deferred");
  assert.doesNotMatch(navigation, /tag:\s*["']ui-chip["']/);
  assert.equal(classifications["ui-floating-action-button"].status, "deferred");
  assert.doesNotMatch(navigation, /tag:\s*["']ui-floating-action-button["']/);
  assert.equal(classifications["ui-search-result-row"].navigationParent, "ui-search-shell");
  assert.doesNotMatch(navigation, /tag:\s*["']ui-search-result-row["']/);
});

test("deferred compatibility definitions stay out of every framework adapter surface", async () => {
  const publicSources = await Promise.all([
    "../../packages/react/src/generated/index.ts",
    "../../packages/react/src/index.ts",
    "../../packages/vue/src/generated/index.ts",
    "../../packages/vue/src/index.ts",
    "../../packages/svelte/src/generated/vanilla/index.js",
    "../../packages/svelte/src/index.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

  for (const source of publicSources) {
    assert.doesNotMatch(source, /\b(?:Ui)?(?:Chip|FloatingActionButton)\b/);
    assert.doesNotMatch(source, /ui-(?:chip|floating-action-button)/);
  }
});

test("React adapter rewrites HTML attributes without corrupting TypeScript readonly types", async () => {
  const checkbox = await readFile(
    new URL("../../packages/react/src/generated/UiCheckbox.tsx", import.meta.url),
    "utf8",
  );
  const combobox = await readFile(
    new URL("../../packages/react/src/generated/UiCombobox.tsx", import.meta.url),
    "utf8",
  );

  assert.match(checkbox, /\{ readonly checked: boolean;/);
  assert.doesNotMatch(checkbox, /\{ readOnly checked:/);
  assert.match(combobox, /^  readOnly\?: boolean \| null;/m);
  assert.match(combobox, /readonly \(string\)\[\]/);
  assert.match(combobox, /readOnly=\{/);
  assert.doesNotMatch(combobox, /\sreadonly=\{/);
  assert.match(combobox, /<div className="authored-options" hidden/);
  assert.doesNotMatch(combobox, /hidden=""|\stabindex=/);
});

test("primitive contracts do not own application policy or a second interaction model", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const tooltipController = await readFile(
    new URL("../../packages/core/src/declarative/components/controllers/ui-tooltip.js", import.meta.url),
    "utf8",
  );
  const sidebarController = await readFile(
    new URL("../../packages/layout/src/declarative/components/controllers/ui-sidebar.js", import.meta.url),
    "utf8",
  );

  assert.equal(contracts["ui-tooltip"].props.toggleOnClick, undefined);
  assert.doesNotMatch(tooltipController, /\bpinned\b|toggleOnClick/);
  assert.equal(contracts["ui-sidebar"].props.storageKey, undefined);
  assert.doesNotMatch(sidebarController, /localStorage|storageKey|persist/i);
  assert.deepEqual(contracts["ui-editor-insert-table-grid"].props.headerRow, {
    type: "boolean",
    default: false,
  });
  assert.deepEqual(
    Object.keys(contracts["ui-editor-table-overlay"].props).sort(),
    ["geometry", "open"],
    "table-overlay geometry must have one authoritative channel",
  );
  for (const tag of ["ui-editor-table-context-menu", "ui-editor-table-toolbar"]) {
    const props = contracts[tag].props;
    assert.equal(
      Object.keys(props).some((name) => name.startsWith("can")),
      false,
      `${tag} should not expose one boolean per editor command`,
    );
    assert.match(props.actions.type, /^list\(.+\|.+\)$/);
  }
});

test("triggered overlays use one explicit for association contract", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const triggered = ["ui-menu", "ui-context-menu", "ui-popover", "ui-tooltip", "ui-dialog"];

  for (const tag of triggered) {
    assert.deepEqual(contracts[tag].props.for, { type: "string", default: "" });
    const definition = await readFile(
      new URL(`../../packages/core/src/declarative/components/${tag}.html`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(definition, /<slot\s+name=["']trigger["']/);
  }

  const controllers = await Promise.all(triggered.map((tag) => readFile(
    new URL(`../../packages/core/src/declarative/components/controllers/${tag}.js`, import.meta.url),
    "utf8",
  )));
  assert.equal(controllers.some((source) => /\[slot=["']trigger["']\]|previousElementSibling/.test(source)), false);
});

test("semantic tones use one public vocabulary", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const previewSource = await readFile(
    new URL("../../apps/docs/src/components/ComponentPreview.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(contracts["ui-button"].props.variant.type, "outline | solid | danger | ghost");
  assert.equal(contracts["ui-callout"].props.tone.type, "info | note | warning | success | danger");
  assert.equal(contracts["ui-badge"].props.tone.type, "neutral | accent | info | success | warning | danger");
  assert.doesNotMatch(previewSource, /variant=["']destructive["']|tone=["']error["']/);
});

test("events describe the interaction instead of repeating the package and component name", async () => {
  const groups = await readDeclarativeContractGroups();
  const editor = groups.find(({ name }) => name === "editor");
  const editorEventNames = Object.values(editor.contracts)
    .flatMap((contract) => contract.events.map(({ name }) => name));
  assert.deepEqual(
    [...new Set(editorEventNames)].sort(),
    ["action", "highlight", "insert", "select"],
  );
  assert.equal(editorEventNames.some((name) => name.startsWith("looma-editor-")), false);

  const adapterSources = await Promise.all([
    "../../packages/react/src/index.test.tsx",
    "../../packages/vue/src/editor/primitives.ts",
    "../../packages/vue/src/editor/LoomaEditor.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const source of adapterSources) {
    assert.doesNotMatch(source, /looma-editor-[a-z-]+-(?:action|highlight|insert|select)/);
    assert.doesNotMatch(
      source,
      /\bon(?:SlashMenu(?:Highlight|Select)|MentionMenu(?:Highlight|Select)|TableOverlayAction|TableAction|InsertTable)\b/,
    );
  }

  const conventions = await readFile(
    new URL("../../apps/docs/docs/conventions.md", import.meta.url),
    "utf8",
  );
  assert.match(conventions, /`input` for continuous value updates/i);
  assert.match(conventions, /`change` for committed form-control state/i);
  assert.match(conventions, /`select` for committing a choice/i);
  assert.match(conventions, /`action` for an application-owned command/i);
});
