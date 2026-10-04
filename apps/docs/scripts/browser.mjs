import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// Pinned to the installed Playwright release and the baseline's Linux font/rendering environment.
const image = "mcr.microsoft.com/playwright:v1.60.0-noble@sha256:beddddcf96f19abec078cd2f3da676f40abd460e0e734ad5eed73627ce161d33";
const mode = process.argv[2];
if (mode !== "visual" && mode !== "behavior") throw new Error("Choose visual or behavior documentation checks");
const projects = mode === "visual" ? ["visual"] : ["chromium", "firefox", "webkit"];
const args = ["test", "--workers=1", ...projects.map((project) => `--project=${project}`), ...process.argv.slice(3)];
const env = { ...process.env, LOOMA_DOCS_CANONICAL: "1", LOOMA_DOCS_REPORT: mode };
if (process.env.LOOMA_DOCS_CANONICAL === "1") {
  const result = spawnSync("corepack", ["pnpm", "exec", "playwright", ...args], { cwd: path.join(root, "apps/docs"), stdio: "inherit", env });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const workspaces = ["packages", "apps", "tools"].flatMap((group) => readdirSync(path.join(root, group), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => `${group}/${entry.name}`));
const checkout = createHash("sha256").update(`${root}:linux-arm64`).digest("hex").slice(0, 8);
const mounts = ["", ...workspaces].flatMap((dir) => ["--volume", `looma-docs-parity-${checkout}-${dir.replaceAll("/", "-") || "root"}-modules:/work/${dir ? `${dir}/` : ""}node_modules`]);
mounts.push("--volume", `looma-docs-parity-${checkout}-store:/pnpm/store`);
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const command = `corepack enable && corepack pnpm install --frozen-lockfile --store-dir /pnpm/store && corepack pnpm --filter @threadlabs/looma-docs exec playwright ${args.map(quote).join(" ")}`;
const result = spawnSync("docker", ["run", "--rm", "--init", "--ipc=host", "--platform", "linux/arm64", "--workdir", "/work", "--volume", `${root}:/work`, ...mounts,
  ...(process.env.LOOMA_DOCS_TEST_URL ? ["--env", "LOOMA_DOCS_TEST_URL"] : []),
  "--env", "LOOMA_DOCS_CANONICAL=1", "--env", `LOOMA_DOCS_REPORT=${mode}`, "--env", "CI=1", image, "bash", "-lc", command], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
