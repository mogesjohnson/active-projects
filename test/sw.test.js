'use strict';
// Runs sw.js in a sandbox with fake caches/fetch to check its fetch handler.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const ORIGIN = 'https://example.test';

class FakeResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status || 200; this.ok = this.status < 300; }
  clone() { return this; }
}

function loadSw({ cached = {}, online = false } = {}) {
  const handlers = {};
  const store = new Map(Object.entries(cached));
  const cache = {
    match: async (req) => store.get(typeof req === 'string' ? req : new URL(req.url).pathname.slice(1)),
    put: async () => {}
  };
  const sandbox = {
    URL, Response: FakeResponse, location: { origin: ORIGIN },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async () => { if (!online) throw new TypeError('Failed to fetch'); return new FakeResponse('net'); },
    self: { addEventListener: (type, fn) => { handlers[type] = fn; } }
  };
  vm.runInNewContext(src, sandbox);
  return (file, mode = 'no-cors') => {
    let p;
    handlers.fetch({ request: { method: 'GET', url: ORIGIN + '/' + file, mode }, respondWith: (x) => { p = x; } });
    return Promise.resolve(p);
  };
}

test('offline and cached: serves the cached copy', async () => {
  const shell = new FakeResponse('shell');
  const fetchVia = loadSw({ cached: { 'app.js': shell } });
  assert.equal(await fetchVia('app.js'), shell);
});

test('offline navigation with no cached match: serves cached index.html', async () => {
  const shell = new FakeResponse('shell');
  const fetchVia = loadSw({ cached: { 'index.html': shell } });
  assert.equal(await fetchVia('some/deep/link', 'navigate'), shell);
});

test('offline uncached non-navigation: returns a 503 Response, not undefined', async () => {
  const fetchVia = loadSw({ cached: { 'index.html': new FakeResponse('shell') } });
  const res = await fetchVia('missing.png');
  assert.ok(res instanceof FakeResponse);
  assert.equal(res.status, 503);
});

test('offline navigation with an empty cache: returns a 503 Response', async () => {
  const res = await loadSw()('index.html', 'navigate');
  assert.equal(res.status, 503);
});

test('online and uncached: serves the network response', async () => {
  const res = await loadSw({ online: true })('new.js');
  assert.equal(res.body, 'net');
});
