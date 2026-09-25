import assert from "node:assert/strict";
import test from "node:test";

import { readDeclarativeContractGroups } from "./declarative-contracts.mjs";

// Every option a component offers is documented where authors read it: the description inside its
// <prop> element, which the docs' API table shows. A name restated as "<name> token." says nothing.
test("every component option has a real description", async () => {
  const groups = await readDeclarativeContractGroups();
  const undocumented = [];
  for (const contracts of groups.map((group) => group.contracts)) {
    for (const [tag, contract] of Object.entries(contracts)) {
      for (const name of Object.keys(contract.props ?? {})) {
        const description = contract.propDescriptions?.[name] ?? "";
        const placeholder = /^[\w-]+ token\.?$/i.test(description);
        if (placeholder || description.split(/\s+/).filter(Boolean).length < 4) {
          undocumented.push(`${tag}.${name}: "${description}"`);
        }
      }
    }
  }
  assert.deepEqual(undocumented, []);
});

test("a polymorphic root's as option lists the elements it can render", async () => {
  const groups = await readDeclarativeContractGroups();
  const contracts = Object.assign({}, ...groups.map((group) => group.contracts));
  for (const [tag, type] of [["ui-button", "button | a"], ["ui-nav-item", "button | a"], ["ui-card", "div | section | article | aside"], ["ui-text", "p | span | div | small | strong | label"]]) {
    assert.equal(contracts[tag].props.as?.type, type, tag);
    assert.ok(contracts[tag].propDescriptions.as, `${tag} describes as`);
  }
});
