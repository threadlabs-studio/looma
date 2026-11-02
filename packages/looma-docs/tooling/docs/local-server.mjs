import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, request as proxyRequest } from 'node:http';

const rejected = (message, status = 403) => Object.assign(new Error(message), { status });
const secretMatches = (value, secret) => typeof value === 'string' && Buffer.byteLength(value) === secret.length && timingSafeEqual(Buffer.from(value), Buffer.from(secret));
async function body(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw rejected('Theme request is too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw rejected('Expected a JSON theme recipe and revision.', 400); }
}

/** Serve trusted project documentation with a constrained, same-origin theme writer. */
export async function serveLocalDocumentation({ upstream, store, base = '/', port = 0, onSaved = async () => {} }) {
  const target = new URL(upstream);
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1') throw new Error('The documentation upstream must be a loopback MarkupKit server.');
  const capability = randomBytes(32).toString('hex');
  let origin;
  const json = (response, status, data) => {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    response.end(JSON.stringify(data));
  };
  const sameOrigin = request => {
    if (request.headers.origin) return request.headers.origin === origin;
    return request.headers['sec-fetch-site'] === 'same-origin';
  };
  const server = createServer((request, response) => {
    void (async () => {
      if (request.headers.host !== new URL(origin).host) throw rejected('Unexpected local documentation host.');
      const url = new URL(request.url, origin);
      const api = base + '_looma/';
      if (url.pathname === api + 'session' || url.pathname === api + 'theme') {
        if (!sameOrigin(request)) throw rejected('Open this editor from its local documentation address.');
        if (url.pathname.endsWith('/session')) {
          if (request.method !== 'GET') throw rejected('Use GET for the local session.', 405);
          json(response, 200, { ...await store.read(), capability }); return;
        }
        if (request.method !== 'POST') throw rejected('Use POST to save a theme.', 405);
        if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw rejected('Use application/json to save a theme.', 415);
        if (!secretMatches(request.headers['x-looma-capability'], capability)) throw rejected('The local editing session expired. Reload before saving.');
        const result = await store.save(await body(request));
        try { await onSaved(result); }
        catch (error) { throw rejected(`Theme files were saved, but the documentation could not rebuild: ${error.message}`, 500); }
        json(response, 200, result); return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) throw rejected('Documentation supports GET and HEAD.', 405);
      const headers = { ...request.headers, host: target.host };
      delete headers['x-looma-capability'];
      const proxy = proxyRequest(target.origin + request.url, { method: request.method, headers }, remote => {
        const responseHeaders = { ...remote.headers };

        response.writeHead(remote.statusCode, responseHeaders); remote.pipe(response);
      });
      proxy.on('error', () => { if (!response.headersSent) json(response, 502, { error: 'The documentation renderer is unavailable.' }); else response.destroy(); });
      request.on('aborted', () => proxy.destroy()); proxy.end();
    })().catch(error => { if (!response.headersSent) json(response, error.status ?? 500, { error: error.status ? error.message : 'Could not process this local documentation request.' }); else response.destroy(); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { url: origin + base, close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}
