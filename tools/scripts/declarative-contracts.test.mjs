import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readRepositoryProjectionTags } from "./component-api-generator.mjs";

import {
  parseDeclarativeContract,
  readDeclarativeContractGroups,
} from "./declarative-contracts.mjs";

test("derives the public contract from one maintained declarative definition", () => {
  const contract = parseDeclarativeContract(`
    <link rel="component" href="../ui-child/ui-child.html">
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

test("loads every component contract from its folder", async () => {
  const groups = await readDeclarativeContractGroups();
  assert.deepEqual(groups.map(({ name }) => name), ["components"]);
  assert.equal(Object.values(groups).flatMap(({ contracts }) => Object.keys(contracts)).length, 51);
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

test("a button renders as a link through its polymorphic root, not a second component", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const source = await readFile(
    new URL("../../packages/looma/src/components/ui-button/ui-button.html", import.meta.url),
    "utf8",
  );

  assert.match(source, /<button\s+as="button\|a"/);
  for (const name of ["href", "target", "rel"]) {
    assert.equal(contracts["ui-button"].props[name]?.type, "string", `ui-button declares ${name}`);
  }
  // A link can never be :enabled, so no interactive state may depend on it.
  assert.doesNotMatch(contracts["ui-button"].style, /\S:enabled/);
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
  const [layout] = groups;
  const classifications = JSON.parse(await readFile(
    new URL("../data/component-release-classification.json", import.meta.url),
    "utf8",
  )).tags;
  const { navigationTags } = await readRepositoryProjectionTags();

  assert.deepEqual(Object.keys(layout.contracts["ui-cluster"].props).sort(), ["align", "gap"]);
  assert.equal(classifications["ui-floating-action-button"].status, "deferred");
  assert.ok(!navigationTags.includes("ui-floating-action-button"));
  assert.equal(classifications["ui-search-result-row"].navigationParent, "ui-search-shell");
  assert.ok(!navigationTags.includes("ui-search-result-row"));
});

test("primitive contracts do not own application policy or a second interaction model", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  const tooltipController = await readFile(
    new URL("../../packages/looma/src/components/ui-tooltip/ui-tooltip.js", import.meta.url),
    "utf8",
  );
  const sidebarController = await readFile(
    new URL("../../packages/looma/src/components/ui-sidebar/ui-sidebar.js", import.meta.url),
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
      new URL(`../../packages/looma/src/components/${tag}/${tag}.html`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(definition, /<slot\s+name=["']trigger["']/);
  }

  const controllers = await Promise.all(triggered.map((tag) => readFile(
    new URL(`../../packages/looma/src/components/${tag}/${tag}.js`, import.meta.url),
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

  assert.equal(contracts["ui-button"].props.variant.type, "outline | solid | danger | ghost | link");
  assert.equal(contracts["ui-callout"].props.tone.type, "info | note | warning | success | danger");
  assert.equal(contracts["ui-badge"].props.tone.type, "neutral | accent | info | success | warning | danger");
  assert.equal(contracts["ui-badge"].props.shape.type, "pill | tag");
  assert.equal(contracts["ui-badge"].props.shape.default, "pill");
  assert.doesNotMatch(previewSource, /variant=["']destructive["']|tone=["']error["']/);
});

test("events describe the interaction instead of repeating the package and component name", async () => {
  const groups = await readDeclarativeContractGroups();
  const editorEventNames = Object.entries(groups[0].contracts)
    .filter(([tag]) => tag.startsWith("ui-editor-"))
    .flatMap(([, contract]) => contract.events.map(({ name }) => name));
  assert.deepEqual(
    [...new Set(editorEventNames)].sort(),
    ["action", "highlight", "insert", "select"],
  );
  assert.equal(editorEventNames.some((name) => name.startsWith("looma-editor-")), false);

  const adapterSources = await Promise.all([
    "../../packages/looma/src/vue/editor/primitives.ts",
    "../../packages/looma/src/vue/editor/LoomaEditor.ts",
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
