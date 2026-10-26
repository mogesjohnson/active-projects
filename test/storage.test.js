'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { FakeStorage, counter, P } = require('./helpers.js');

const quiet = (t) => t.mock.method(console, 'warn', () => {});
const seedNames = () => L.seed(counter()).map((p) => p.name);

test('seed has the default projects with unique ids and GitHub URLs', () => {
  const s = L.seed();
  assert.equal(s.length, 18);
  assert.equal(new Set(s.map((p) => p.id)).size, s.length);
  assert.deepEqual(s.filter((p) => p.active).map((p) => p.name), ['active-projects', 'history-scrub', 'BEST-OF-AI-DEV']);
  for (const p of s) assert.equal(p.url, L.GH + p.name);
  assert.deepEqual(L.validate(s), s);
});

test('load with nothing stored returns the seed', () => {
  assert.deepEqual(L.load(new FakeStorage()).map((p) => p.name), seedNames());
});

test('load with no storage at all returns the seed', () => {
  assert.deepEqual(L.load(null).map((p) => p.name), seedNames());
});

test('save then load round-trips the list', () => {
  const store = new FakeStorage();
  const list = [P('a', true, { note: 'hi' }), P('b', false)];
  L.save(store, list);
  assert.deepEqual(JSON.parse(store.getItem(L.KEY)), { version: 1, projects: list });
  assert.deepEqual(L.load(store), list);
});

test('an empty saved list stays empty (not reseeded)', () => {
  const store = new FakeStorage();
  L.save(store, []);
  assert.deepEqual(L.load(store), []);
});

test('corrupt localStorage falls back to the seed', (t) => {
  const warn = quiet(t);
  const corrupt = ['{not json', 'null', '42', '"str"', '{}', '{"projects":"x"}',
    '[{"name":""}]', '[{"name":"a","url":"javascript:alert(1)"}]', '[null]'];
  for (const raw of corrupt) {
    const out = L.load(new FakeStorage({ [L.KEY]: raw }));
    assert.deepEqual(out.map((p) => p.name), seedNames(), raw);
  }
  assert.equal(warn.mock.callCount(), corrupt.length);
});

test('a storage whose getItem throws falls back to the seed', (t) => {
  quiet(t);
  const broken = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(L.load(broken).map((p) => p.name), seedNames());
});

test('load repairs duplicate ids from storage', () => {
  const store = new FakeStorage({ [L.KEY]: JSON.stringify([P('a', true), P('a', false)]) });
  const out = L.load(store);
  assert.equal(new Set(out.map((p) => p.id)).size, 2);
});

test('save throws when storage is missing or full, so the page can report it', () => {
  assert.throws(() => L.save(null, []), /not available/);
  const store = new FakeStorage();
  store.failWrites = true;
  assert.throws(() => L.save(store, [P('a', true)]), /Quota/);
});
