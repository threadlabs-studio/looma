import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises';
import path from 'node:path';

export async function rejectSymlink(file) {
  try { if ((await lstat(file)).isSymbolicLink()) throw new Error(`Looma's generated path cannot be a symlink: ${file}.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

/** Generated sources and tooling wrappers stay in owned cache directories. */
export async function cacheDirectory(root, name = '') {
  root = await realpath(path.resolve(root));
  if (name && !/^[a-z][a-z-]*$/.test(name)) throw new Error('Invalid Looma cache directory.');
  const cache = path.join(root, '.looma');
  await rejectSymlink(cache); await mkdir(cache, { recursive: true });
  const directory = path.join(cache, name);
  await rejectSymlink(directory); await mkdir(directory, { recursive: true });
  return directory;
}

/** One complete preparation/build owns the generated tree, including across CLI processes. */
export async function withBuildLock(root, action) {
  const lockFile = path.join(await cacheDirectory(root), 'docs-build.lock');
  await rejectSymlink(lockFile);
  let lock;
  try { lock = await open(lockFile, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another documentation build holds .looma/docs-build.lock. Retry after it finishes. If the old process stopped, close it before removing that lock.');
    throw error;
  }
  try { await lock.writeFile(JSON.stringify({ pid: process.pid })); return await action(); }
  finally { try { await lock.close(); } finally { await unlink(lockFile); } }
}
