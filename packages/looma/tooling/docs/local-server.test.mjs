import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createThemeStore } from './store.mjs';
import { serveLocalDocumentation } from './local-server.mjs';
import { startingPoints } from './theme.mjs';

test('loopback editor protects the writer from cross-origin requests, stale sessions and host rebinding', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-local-'));
  const upstream = createServer((request, response) => { response.setHeader('Content-Security-Policy', "script-src 'self'"); response.end('<html>HTMLKit documentation</html>'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  let rebuilt = 0;
  const server = await serveLocalDocumentation({ upstream: `http://127.0.0.1:${upstream.address().port}/`, base: '/system/', store: await createThemeStore({ root }), onSaved: async () => { rebuilt++; } });
  try {
    assert.match(await (await fetch(server.url)).text(), /HTMLKit/);
    const preview = await fetch(server.url + '_looma/preview/example/');
    assert.match(preview.headers.get('content-security-policy'), /sandbox allow-scripts/);
    assert.match(preview.headers.get('content-security-policy'), /script-src 'self'/);
    assert.doesNotMatch((await fetch(server.url)).headers.get('content-security-policy'), /sandbox/);
    const sessionURL = server.url + '_looma/session';
    assert.equal((await fetch(sessionURL)).status, 403);
    assert.equal((await fetch(sessionURL, { headers: { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' } })).status, 403);
    assert.equal((await fetch(sessionURL, { headers: { Origin: 'https://evil.example' } })).status, 403);
    const session = await (await fetch(sessionURL, { headers: { Origin: new URL(server.url).origin } })).json();
    assert.ok(session.capability);
    const save = (capability, revision) => fetch(server.url + '_looma/theme', { method: 'POST', headers: { Origin: new URL(server.url).origin, 'Content-Type': 'application/json', 'X-Looma-Capability': capability }, body: JSON.stringify({ recipe: startingPoints.night, revision }) });
    assert.equal((await save('invalid', session.revision)).status, 403);
    const result = await save(session.capability, session.revision);
    assert.equal(result.status, 200);
    assert.equal(rebuilt, 1);
    assert.equal((await save(session.capability, session.revision)).status, 409);
    const rebinding = await new Promise((resolve, reject) => { const request = httpRequest(sessionURL, { headers: { Host: 'evil.example', Origin: 'http://evil.example' } }, response => { response.resume(); resolve(response.statusCode); }); request.on('error', reject); request.end(); });
    assert.equal(rebinding, 403);
  } finally { await server.close(); await new Promise(resolve => upstream.close(resolve)); await rm(root, { recursive: true, force: true }); }
});
