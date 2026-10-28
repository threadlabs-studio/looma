import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// Pinned to the installed Playwright release and the baseline's Linux font/rendering environment.
const image = "mcr.microsoft.com/playwright:v1.60.0-noble@sha256:beddddcf96f19abec078cd2f3da676f40abd460e0e734ad5eed73627ce161d33";
const mode = process.argv[2];
if (!["visual", "behavior", "capture"].includes(mode)) throw new Error("Choose visual, behavior, or capture documentation checks");
const projects = mode === "visual" || mode === "capture" ? ["visual"] : ["chromium", "firefox", "webkit"];
const args = ["test", "--workers=1", ...projects.map((project) => `--project=${project}`), ...process.argv.slice(3)];
const env = { ...process.env, LOOMA_DOCS_CANONICAL: "1", LOOMA_DOCS_REPORT: mode };
if (process.env.LOOMA_DOCS_CANONICAL === "1") {
  if (mode === "capture") {
    const install = spawnSync("corepack", ["pnpm", "install", "--frozen-lockfile"], { cwd: root, stdio: "inherit", env });
    if (install.error) throw install.error;
    if (install.status !== 0) process.exit(install.status ?? 1);
  }
  const result = mode === "capture"
    ? spawnSync(process.execPath, [path.join(root, "tools/scripts/visual-review.mjs"), "capture", ...process.argv.slice(3)], { cwd: root, stdio: "inherit", env })
    : spawnSync("corepack", ["pnpm", "exec", "playwright", ...args], { cwd: path.join(root, "apps/docs"), stdio: "inherit", env });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const workspaces = ["packages", "apps", "tools"].flatMap((group) => readdirSync(path.join(root, group), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => `${group}/${entry.name}`));
// Anonymous node_modules volumes hide the host's macOS installs and are deleted by --rm; only the
// content-addressed pnpm store persists, shared by every checkout, so runs leave nothing behind.
// Everything carries the Looma label, so `pnpm docker:clean` can remove what an interrupted run left.
const label = "com.threadlabs.tool=looma";
const mounts = ["", ...workspaces].flatMap((dir) => ["--mount", `type=volume,dst=/work/${dir ? `${dir}/` : ""}node_modules,volume-label=${label}`]);
mounts.push("--mount", `type=volume,src=looma-docs-parity-pnpm-store,dst=/pnpm/store,volume-label=${label}`);
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const command = `corepack enable && corepack pnpm install --frozen-lockfile --store-dir /pnpm/store && ${mode === "capture"
  ? `node tools/scripts/visual-review.mjs capture ${process.argv.slice(3).map(quote).join(" ")}`
  : `corepack pnpm --filter @threadlabs/looma-docs exec playwright ${args.map(quote).join(" ")}`}`;
const result = spawnSync("docker", ["run", "--rm", "--label", label, "--init", "--ipc=host", "--platform", "linux/arm64", "--workdir", "/work", "--volume", `${root}:/work`, ...mounts,
  ...(process.env.LOOMA_DOCS_TEST_URL ? ["--env", "LOOMA_DOCS_TEST_URL"] : []),
  "--env", "LOOMA_DOCS_CANONICAL=1", "--env", `LOOMA_DOCS_REPORT=${mode}`, "--env", "CI=1", image, "bash", "-lc", command], { cwd: root, stdio: "inherit" });
const hostUid = process.getuid?.(), hostGid = process.getgid?.();
if (typeof hostUid === "number" && typeof hostGid === "number") {
  const generatedPaths = ["/work/packages", "/work/apps", "/work/generated", "/work/.context"];
  const ownershipCommand = `for path in ${generatedPaths.map(quote).join(" ")}; do [ ! -e "$path" ] || chown -R ${hostUid}:${hostGid} "$path"; done`;
  const ownership = spawnSync("docker", ["run", "--rm", "--label", label, "--platform", "linux/arm64", "--workdir", "/work", "--volume", `${root}:/work`, image, "sh", "-c", ownershipCommand], { cwd: root, stdio: "inherit" });
  if (ownership.error) console.warn(`Could not restore documentation artifact ownership: ${ownership.error.message}`);
  else if (ownership.status !== 0) console.warn(`Could not restore documentation artifact ownership; chown exited ${ownership.status}.`);
}
if (result.error) throw result.error;
process.exit(result.status ?? 1);
