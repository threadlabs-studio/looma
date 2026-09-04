import assert from "node:assert/strict";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const privatePublicSpecifier = /@threadlabs\/looma-(?:core|editor|layout|react|svelte|tokens|vue)/;
const runtimeExtensions = new Set([".cjs", ".css", ".cts", ".js", ".mjs", ".ts"]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function exportTargets(value, condition = null) {
  if (typeof value === "string") return [{ condition, target: value }];
  return Object.entries(value).flatMap(([nextCondition, nextValue]) =>
    exportTargets(nextValue, nextCondition));
}

async function runtimeFiles(root, entry) {
  const result = [];
  const entryPath = path.join(root, entry);
  const entryStat = await stat(entryPath);
  if (entryStat.isFile()) return [entryPath];

  async function visit(directory) {
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const childPath = path.join(directory, child.name);
      if (child.isDirectory()) {
        await visit(childPath);
      } else if (runtimeExtensions.has(path.extname(child.name))) {
        result.push(childPath);
      }
    }
  }
  await visit(entryPath);
  return result;
}

function moduleSpecifiers(source) {
  // Build output can retain JSDoc such as `import("./type-only-module")`.
  // Those references are not runtime graph edges and must not be resolved.
  const runtimeSource = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'`;]*?\sfrom\s*)?["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of runtimeSource.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function graphPathLabel(facadeRoot, filePath) {
  const relative = path.relative(facadeRoot, filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function graphFileCandidates(targetPath, importerPath) {
  const candidates = [];
  const declarationGraph = /\.d\.(?:c|m)?ts$/.test(importerPath);
  const extension = path.extname(targetPath);

  if (declarationGraph) {
    if (/\.(?:c|m)?js$/.test(targetPath)) {
      candidates.push(targetPath.replace(/\.(?:c|m)?js$/, ".d.ts"));
    } else if (!extension) {
      candidates.push(`${targetPath}.d.ts`, path.join(targetPath, "index.d.ts"));
    }
  }

  candidates.push(targetPath);
  if (!extension) {
    candidates.push(
      `${targetPath}.js`,
      `${targetPath}.cjs`,
      `${targetPath}.mjs`,
      path.join(targetPath, "index.js"),
      path.join(targetPath, "index.cjs"),
      path.join(targetPath, "index.mjs"),
    );
  }
  return [...new Set(candidates)];
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

async function resolveGraphFile({
  targetPath,
  importerPath,
  specifier,
  entryPath,
  facadeRoot,
  canonicalFacadeRoot,
}) {
  const entryLabel = graphPathLabel(facadeRoot, entryPath);
  const importerLabel = graphPathLabel(facadeRoot, importerPath);
  const candidates = graphFileCandidates(targetPath, importerPath);

  for (const candidate of candidates) {
    assert.ok(
      isPathInside(facadeRoot, candidate),
      `module graph ${entryLabel} escapes the facade root while resolving ${specifier} from ${importerLabel}`,
    );
    if (!(await isFile(candidate))) continue;

    const canonicalCandidate = await realpath(candidate);
    assert.ok(
      isPathInside(canonicalFacadeRoot, canonicalCandidate),
      `module graph ${entryLabel} escapes the facade root through ${specifier} from ${importerLabel}`,
    );
    return canonicalCandidate;
  }

  assert.fail(
    `module graph ${entryLabel} cannot resolve ${specifier} from ${importerLabel} inside the facade root`,
  );
}

function selfExportTarget(specifier, importerPath, manifest, entryPath, facadeRoot) {
  const exportName = specifier === manifest.name
    ? "."
    : `.${specifier.slice(manifest.name.length)}`;
  const definition = manifest.exports?.[exportName];
  assert.ok(
    definition,
    `module graph ${graphPathLabel(facadeRoot, entryPath)} reaches undeclared self export ${specifier} from ${graphPathLabel(facadeRoot, importerPath)}`,
  );

  const targets = exportTargets(definition);
  const conditions = /\.d\.(?:c|m)?ts$/.test(importerPath)
    ? ["types", "import", "default", "require", null]
    : path.extname(importerPath) === ".cjs"
      ? ["require", "default", "import", "types", null]
      : ["import", "default", "require", "types", null];
  for (const condition of conditions) {
    const match = targets.find((target) => target.condition === condition);
    if (match) return match.target;
  }

  assert.fail(
    `module graph ${graphPathLabel(facadeRoot, entryPath)} has no resolvable export target for ${specifier}`,
  );
}

export async function moduleGraph(entryPath, { facadeRoot, manifest }) {
  const resolvedFacadeRoot = path.resolve(facadeRoot);
  const canonicalFacadeRoot = await realpath(resolvedFacadeRoot);
  const canonicalEntryPath = await resolveGraphFile({
    targetPath: path.resolve(entryPath),
    importerPath: path.resolve(entryPath),
    specifier: "<entry>",
    entryPath: path.resolve(entryPath),
    facadeRoot: resolvedFacadeRoot,
    canonicalFacadeRoot,
  });
  const pending = [canonicalEntryPath];
  const visited = new Set();
  const specifiers = new Set();

  while (pending.length > 0) {
    const filePath = pending.pop();
    if (visited.has(filePath)) continue;
    visited.add(filePath);

    const source = await readFile(filePath, "utf8");
    for (const specifier of moduleSpecifiers(source)) {
      specifiers.add(specifier);
      if (/[*?{}[\]]/.test(specifier)) continue;

      let targetPath;
      if (specifier.startsWith(".")) {
        targetPath = path.resolve(path.dirname(filePath), specifier);
      } else if (
        specifier === manifest.name || specifier.startsWith(`${manifest.name}/`)
      ) {
        targetPath = path.resolve(
          canonicalFacadeRoot,
          selfExportTarget(
            specifier,
            filePath,
            manifest,
            canonicalEntryPath,
            canonicalFacadeRoot,
          ),
        );
      } else {
        continue;
      }

      pending.push(await resolveGraphFile({
        targetPath,
        importerPath: filePath,
        specifier,
        entryPath: canonicalEntryPath,
        facadeRoot: canonicalFacadeRoot,
        canonicalFacadeRoot,
      }));
    }
  }

  return { specifiers };
}

function assertGraphOmits(graph, forbidden, label) {
  for (const specifier of graph.specifiers) {
    assert.doesNotMatch(specifier, forbidden, `${label} reaches forbidden module ${specifier}`);
  }
}

export async function verifyFacade({ repoRoot, definitionOnly = false, typesOnly = false }) {
  const facadeRoot = path.join(repoRoot, "packages/looma");
  const [manifest, assembly] = await Promise.all([
    readJson(path.join(facadeRoot, "package.json")),
    readJson(path.join(facadeRoot, "facade-assembly.json")),
  ]);

  assert.equal(manifest.name, assembly.package);
  assert.deepEqual(Object.keys(manifest.exports), assembly.exports);

  if (definitionOnly) return;

  for (const [exportName, definition] of Object.entries(manifest.exports)) {
    for (const { condition, target } of exportTargets(definition)) {
      if (typesOnly && condition !== "types") continue;
      const targetPath = path.resolve(facadeRoot, target);
      assert.ok(targetPath.startsWith(`${facadeRoot}${path.sep}`), `${exportName} escapes the facade`);
      assert.equal((await stat(targetPath)).isFile(), true, `${exportName} target ${target} is missing`);
    }
  }

  if (typesOnly) return;

  const files = (await Promise.all(
    ["dist", "loader", "layout", "editor", "vue"].map((entry) => runtimeFiles(facadeRoot, entry)),
  )).flat();
  for (const css of [
    "tokens.css",
    "theme-light.css",
    "theme-dark.css",
    "theme-high-contrast.css",
    "layout.css",
    "styles.css",
    "editor.css",
  ]) {
    files.push(path.join(facadeRoot, css));
  }

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      privatePublicSpecifier,
      `${path.relative(facadeRoot, file)} retains a private Looma package specifier`,
    );
  }

  const [rootEsm, rootCjs, editor, editorUi, vue, vueTypes, vueEditor] = await Promise.all([
    moduleGraph(path.join(facadeRoot, "dist/index.js"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "dist/index.cjs"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "editor/index.js"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "editor/ui.js"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "vue/index.js"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "vue/index.d.ts"), { facadeRoot, manifest }),
    moduleGraph(path.join(facadeRoot, "vue/editor/index.js"), { facadeRoot, manifest }),
  ]);
  const rootForbidden = /(?:^|\/|@)vue(?:$|\/|-)|@tiptap\/|^prosemirror-/;
  const generalVueForbidden = /@threadlabs\/looma\/editor(?:$|\/)|@tiptap\/|^prosemirror-/;
  assertGraphOmits(rootEsm, rootForbidden, "root ESM graph");
  assertGraphOmits(rootCjs, rootForbidden, "root CommonJS graph");
  assert.ok(
    [...editor.specifiers].some((specifier) => specifier.startsWith("@tiptap/")),
    "editor graph does not reach a Tiptap module",
  );
  assertGraphOmits(editorUi, /@tiptap\/|^prosemirror-/, "editor UI graph");
  assertGraphOmits(vue, generalVueForbidden, "Vue graph");
  assertGraphOmits(vueTypes, generalVueForbidden, "Vue type graph");
  assert.ok(
    [...vueEditor.specifiers].some(
      (specifier) => specifier === "@threadlabs/looma/editor" ||
        specifier.startsWith("@threadlabs/looma/editor/"),
    ),
    "Vue editor graph does not reach the Looma editor entrypoint",
  );
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  await verifyFacade({
    repoRoot,
    definitionOnly: process.argv.includes("--definition-only"),
    typesOnly: process.argv.includes("--types-only"),
  });
  console.log("Looma facade verification passed");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
