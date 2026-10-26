'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { counter } = require('./helpers.js');

const ok = (data) => L.validate(data, counter());
const bad = (data, re) => assert.throws(() => ok(data), re);

test('accepts {projects: [...]} and a bare array', () => {
  const item = { id: 'a', name: 'alpha', url: 'https://example.com/a', note: 'n', active: true };
  assert.deepEqual(ok({ version: 1, projects: [item] }), [item]);
  assert.deepEqual(ok([item]), [item]);
});

test('rejects wrong top-level shapes', () => {
  for (const d of [null, undefined, 42, 'x', true, {}, { projects: 'nope' }, { projects: {} }]) {
    bad(d, /Expected/);
  }
});

test('rejects more than MAX_PROJECTS items', () => {
  const many = Array.from({ length: L.MAX_PROJECTS + 1 }, (_, i) => ({ name: 'p' + i }));
  bad(many, /Too many/);
  assert.equal(ok(many.slice(1)).length, L.MAX_PROJECTS);
});

test('rejects items that are not objects', () => {
  for (const item of [null, 1, 'name', true]) bad([item], /Item 1 is not an object/);
  bad([{ name: 'ok' }, null], /Item 2 is not an object/);
});

test('rejects empty, blank, non-string and too-long names', () => {
  for (const name of [undefined, '', '   ', 5, {}, ['a'], 'x'.repeat(101)]) {
    bad([{ name }], /Item 1 needs a name/);
  }
  assert.equal(ok([{ name: 'x'.repeat(100) }])[0].name.length, 100);
});

test('trims names', () => {
  assert.equal(ok([{ name: '  spaced  ' }])[0].name, 'spaced');
});

test('rejects javascript:, data: and other non-http URLs', () => {
  const urls = [
    'javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', 'data:text/html,hi',
    'file:///etc/passwd', 'ftp://example.com', 'vbscript:x', 'not a url', '//example.com', 'http://'
  ];
  for (const url of urls) bad([{ name: 'a', url }], /invalid URL/);
  bad([{ name: 'a', url: { href: 'https://x' } }], /invalid URL/);
});

test('accepts http and https URLs', () => {
  assert.equal(ok([{ name: 'a', url: 'http://example.com' }])[0].url, 'http://example.com');
  assert.equal(ok([{ name: 'a', url: 'HTTPS://Example.com/x' }])[0].url, 'HTTPS://Example.com/x');
});

test('missing or empty URL defaults to the GitHub repo, encoded', () => {
  assert.equal(ok([{ name: 'repo' }])[0].url, L.GH + 'repo');
  assert.equal(ok([{ name: 'a b/c', url: '' }])[0].url, L.GH + 'a%20b%2Fc');
  assert.equal(ok([{ name: 'r', url: null }])[0].url, L.GH + 'r');
});

test('notes default to empty, are stringified and capped at 200 chars', () => {
  assert.equal(ok([{ name: 'a' }])[0].note, '');
  assert.equal(ok([{ name: 'a', note: 7 }])[0].note, '7');
  assert.equal(ok([{ name: 'a', note: 'n'.repeat(300) }])[0].note.length, 200);
});

test('active is true only for boolean true', () => {
  const out = ok([true, 'true', 1, undefined, false].map((active, i) => ({ name: 'p' + i, active })));
  assert.deepEqual(out.map((p) => p.active), [true, false, false, false, false]);
});

test('duplicate ids are replaced so every id is unique', () => {
  const out = ok([{ id: 'x', name: 'a' }, { id: 'x', name: 'b' }, { id: 'y', name: 'c' }, { id: 'x', name: 'd' }]);
  const ids = out.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['x', 'id-1', 'y', 'id-2']);
});

test('ids truncated to 40 chars still stay unique', () => {
  const long = 'z'.repeat(40);
  const out = ok([{ id: long + 'A', name: 'a' }, { id: long + 'B', name: 'b' }]);
  assert.equal(out[0].id, long);
  assert.notEqual(out[1].id, long);
});

test('missing, empty and non-string ids get generated ids', () => {
  const out = ok([{ name: 'a' }, { id: '', name: 'b' }, { id: 5, name: 'c' }]);
  assert.deepEqual(out.map((p) => p.id), ['id-1', 'id-2', 'id-3']);
});

test('unknown fields are dropped', () => {
  const out = ok([{ id: 'a', name: 'a', evil: '<script>', __proto__x: 1 }]);
  assert.deepEqual(Object.keys(out[0]).sort(), ['active', 'id', 'name', 'note', 'url']);
});

test('isHttpUrl', () => {
  assert.equal(L.isHttpUrl('https://a.b'), true);
  assert.equal(L.isHttpUrl('http://a.b'), true);
  assert.equal(L.isHttpUrl('javascript:void(0)'), false);
  assert.equal(L.isHttpUrl(''), false);
  assert.equal(L.isHttpUrl(undefined), false);
});
