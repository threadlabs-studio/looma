import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultRecipe, themeCSS, validateRecipe } from './theme.mjs';

const missing = error => error.code === 'ENOENT';
const failure = (message, status = 409) => Object.assign(new Error(message), { status });
const digest = values => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const contained = (root, file) => file.startsWith(root + path.sep);

/** A local writer owns only two explicitly configured theme files. */
export async function createThemeStore({ root, recipe = 'looma.theme.json', css = 'looma.theme.css' }) {
  root = await realpath(path.resolve(root));
  const destination = value => {
    if (typeof value !== 'string' || !value || path.isAbsolute(value)) throw failure('Theme paths must be relative paths inside the repository.', 400);
    const file = path.resolve(root, value);
    if (!contained(root, file)) throw failure('Theme paths must stay inside the repository.', 400);
    return file;
  };
  for (const value of [recipe, css]) {
    if (typeof value === 'string' && value.split(/[\\/]/).some(part => ['.looma', '.git', 'node_modules'].includes(part))) throw failure('Theme outputs must stay outside generated files, Git metadata and node_modules.', 400);
  }
  const recipeFile = destination(recipe), cssFile = destination(css);
  if (recipeFile === cssFile || !recipeFile.endsWith('.json') || !cssFile.endsWith('.css')) throw failure('Choose separate .json recipe and .css theme files.', 400);
  const lockFile = destination('.looma/theme-write.lock');
  const safe = async file => {
    const pieces = path.relative(root, file).split(path.sep);
    let cursor = root;
    for (const piece of pieces) {
      cursor = path.join(cursor, piece);
      try { if ((await lstat(cursor)).isSymbolicLink()) throw failure(`Theme paths cannot traverse a symlink: ${path.relative(root, cursor)}.`, 400); }
      catch (error) { if (!missing(error)) throw error; }
    }
  };
  for (const file of [recipeFile, cssFile, lockFile]) await safe(file);
  const bytes = async file => { await safe(file); try { return await readFile(file, 'utf8'); } catch (error) { if (missing(error)) return null; throw error; } };
  const snapshot = async () => {
    const [json, css] = await Promise.all([bytes(recipeFile), bytes(cssFile)]);
    if (css !== null && !css.startsWith('/* Looma shared semantic theme. */')) throw failure('The theme CSS is not a generated Looma file. Choose a new output path and keep manual CSS in an overrides file.');
    return { json, css, recipe: json === null ? defaultRecipe() : validateRecipe(JSON.parse(json)), revision: digest([json, css]) };
  };
  const read = async ({ includeCSS = false } = {}) => {
    await safe(lockFile); await mkdir(path.dirname(lockFile), { recursive: true }); await safe(lockFile);
    let lock;
    try { lock = await open(lockFile, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw failure('A theme editor holds .looma/theme-write.lock. Retry after its save. If the old editor stopped, close it before removing that lock and restarting.'); throw error; }
    try { const { recipe, revision, css } = await snapshot(); return { recipe, revision, ...(includeCSS ? { css } : {}) }; }
    finally { try { await lock.close(); } finally { await unlink(lockFile); } }
  };
  const stage = async (file, data) => {
    await safe(file); await mkdir(path.dirname(file), { recursive: true }); await safe(file);
    const temp = file + '.' + randomUUID() + '.tmp';
    const handle = await open(temp, 'wx', 0o644);
    try { await handle.writeFile(data); await handle.sync(); } catch (error) { await unlink(temp); throw error; } finally { await handle.close(); }
    return temp;
  };
  const save = async input => {
    const next = validateRecipe(input?.recipe);
    if (typeof input?.revision !== 'string') throw failure('A theme revision is required. Reload before saving.', 400);
    await safe(lockFile); await mkdir(path.dirname(lockFile), { recursive: true }); await safe(lockFile);
    let lock;
    try { lock = await open(lockFile, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw failure('Another theme save is in progress. Reload before saving again.'); throw error; }
    const temporary = new Set(); let original; let committedRecipe = false;
    try {
      original = await snapshot();
      if (original.revision !== input.revision) throw failure('Theme files changed outside this editor. Reload before saving; your unsaved preview is still here.');
      const systemCSS = await readFile(fileURLToPath(import.meta.resolve('@threadlabs/looma/theme-system.css')), 'utf8');
      const nextJson = JSON.stringify(next, null, 2) + '\n';
      const nextCSS = themeCSS(next, systemCSS);
      const stagedRecipe = await stage(recipeFile, nextJson); temporary.add(stagedRecipe);
      const stagedCSS = await stage(cssFile, nextCSS); temporary.add(stagedCSS);
      if ((await snapshot()).revision !== original.revision) throw failure('Theme files changed while saving. Reload before saving again.');
      await safe(recipeFile); await safe(cssFile);
      await rename(stagedRecipe, recipeFile); temporary.delete(stagedRecipe); committedRecipe = true;
      // CSS is the visible commit point: applications consume this complete file.
      await rename(stagedCSS, cssFile); temporary.delete(stagedCSS);
      return { recipe: next, revision: digest([nextJson, nextCSS]) };
    } catch (error) {
      if (committedRecipe) {
        if (original.json === null) await unlink(recipeFile);
        else { const restore = await stage(recipeFile, original.json); temporary.add(restore); await rename(restore, recipeFile); temporary.delete(restore); }
      }
      throw error;
    } finally {
      try { await Promise.all([...temporary].map(file => unlink(file).catch(error => { if (!missing(error)) throw error; }))); }
      finally { try { await lock.close(); } finally { await unlink(lockFile); } }
    }
  };
  return { root, recipeFile, cssFile, read, save };
}
