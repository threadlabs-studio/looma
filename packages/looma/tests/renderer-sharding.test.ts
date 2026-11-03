import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { it } from "vitest";

it("balances the resolved renderer project without omitting or repeating files", () => {
  // Vitest's list command ignores sharding. Load the resolved root configuration and use the
  // sequencer exactly as its test pool does, without launching tests or preparing a library.
  const result: { sequencer: string; all: string[]; shards: string[][] } = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", `
    import { createVitest } from "vitest/node";
    import { relative } from "node:path";
    const runner = await createVitest("test", { config: "vitest.config.ts", project: ["converted-source"], watch: false, sequence: { concurrent: true }, maxConcurrency: 4 });
    try {
      const files = await runner.globTestSpecifications();
      const Sequencer = runner.config.sequence.sequencer;
      const paths = files => files.map(file => relative(process.cwd(), file.moduleId));
      const shards = [];
      for (let index = 1; index <= 6; index++) {
        runner.config.shard = { index, count: 6 };
        shards.push(paths(await new Sequencer(runner).shard([...files])));
      }
      console.log(JSON.stringify({ sequencer: Sequencer.name, all: paths(files), shards }));
    } finally { await runner.close(); }
  `], { encoding: "utf8", timeout: 10_000 }));
  assert.equal(result.sequencer, "RendererSequencer", "the pool reads its sequencer from the root configuration");
  assert.ok(result.shards[0]!.includes("tests/editor-table.test.ts"), "the longest file belongs to the first balanced shard");
  assert.deepEqual(result.shards.flat().sort(), result.all.sort(), "every configured renderer file runs exactly once");
});
