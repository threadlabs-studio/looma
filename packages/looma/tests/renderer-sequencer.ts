import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";
import { BaseSequencer, type TestSpecification } from "vitest/node";

// Maximum passing file duration across the six renderers in CI run 41591995331.
// Refresh from passing results when new workloads make the shards uneven.
const durations = JSON.parse(readFileSync(new URL("./renderer-durations.json", import.meta.url), "utf8")) as Record<string, number>;

export class RendererSequencer extends BaseSequencer {
  override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
    const { index, count } = this.ctx.config.shard!;
    const seconds = (file: TestSpecification): number =>
      durations[relative(this.ctx.config.root, file.moduleId).split(sep).join("/")] ?? 5;
    const shards = Array.from({ length: count }, () => ({ seconds: 0, files: [] as TestSpecification[] }));
    for (const file of [...files].sort((a, b) => seconds(b) - seconds(a) || a.moduleId.localeCompare(b.moduleId))) {
      const lightest = shards.reduce((least, shard) => shard.seconds < least.seconds ? shard : least);
      lightest.files.push(file);
      lightest.seconds += seconds(file);
    }
    return shards[index - 1]!.files;
  }
}
