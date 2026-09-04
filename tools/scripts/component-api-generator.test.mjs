import assert from "node:assert/strict";
import test from "node:test";

import {
  readRepositoryProjectionTags,
  validateComponentProjections
} from "./component-api-generator.mjs";

const completeFixture = {
  sourceTags: ["ui-button"],
  classifications: { "ui-button": "published" },
  metadataTags: ["ui-button"],
  documentationTags: ["ui-button"],
  navigationTags: ["ui-button"],
  adapterTags: ["ui-button"],
  requiredContractReadmeTags: ["ui-button"],
  contractReadmeTags: ["ui-button"]
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

test("discovers editor adapters after their implementation is split into primitives", async () => {
  const projections = await readRepositoryProjectionTags();

  assert.ok(projections.adapterMapTags.includes("ui-editor-toolbar"));
  assert.ok(projections.adapterTags.includes("ui-editor-table-overlay"));
});
