'use strict';
// Static checks that keep the no-build page wired up correctly.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('index.html loads logic.js before app.js', () => {
  const html = read('index.html');
  const logic = html.indexOf('<script src="logic.js">');
  const app = html.indexOf('<script src="app.js">');
  assert.ok(logic > 0 && app > logic);
});

test('logic.js works as a plain browser script (no module system)', () => {
  const sandbox = { URL };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('logic.js'), sandbox);
  const api = sandbox.ActiveProjectsLogic;
  assert.equal(typeof api.validate, 'function');
  assert.equal(api.isHttpUrl('javascript:x'), false);
});

test('every service worker precache asset exists', () => {
  const sw = read('sw.js');
  const assets = JSON.parse(sw.match(/const ASSETS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.ok(assets.includes('logic.js'));
  for (const a of assets) if (a !== './') assert.ok(fs.existsSync(path.join(root, a)), a);
});

test('manifest is valid JSON and its icons exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.name && m.start_url);
  for (const icon of m.icons) assert.ok(fs.existsSync(path.join(root, icon.src)), icon.src);
});
