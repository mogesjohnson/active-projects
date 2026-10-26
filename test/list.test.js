'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { P } = require('./helpers.js');

const list = () => [P('a1', true), P('a2', true), P('i1', false), P('i2', false)];
const view = (ps) => ps.map((p) => (p.active ? '+' : '-') + p.id).join(' ');

test('toggleActive moves active to the top of Not active', () => {
  assert.equal(view(L.toggleActive(list(), 'a1')), '+a2 -a1 -i1 -i2');
});

test('toggleActive moves inactive to the end of Active', () => {
  assert.equal(view(L.toggleActive(list(), 'i2')), '+a1 +a2 +i2 -i1');
});

test('toggleActive works when a section is empty', () => {
  assert.equal(view(L.toggleActive([P('a', true)], 'a')), '-a');
  assert.equal(view(L.toggleActive([P('i', false)], 'i')), '+i');
});

test('toggleActive does not mutate the input and ignores unknown ids', () => {
  const before = list();
  const snapshot = JSON.stringify(before);
  L.toggleActive(before, 'a1');
  assert.equal(JSON.stringify(before), snapshot);
  assert.equal(L.toggleActive(before, 'nope'), before);
});

test('addProject puts active at the end of Active and inactive at the end', () => {
  assert.equal(view(L.addProject(list(), P('n', true))), '+a1 +a2 +n -i1 -i2');
  assert.equal(view(L.addProject(list(), P('n', false))), '+a1 +a2 -i1 -i2 -n');
  assert.equal(view(L.addProject([], P('n', true))), '+n');
  assert.equal(view(L.addProject([P('i', false)], P('n', true))), '+n -i');
});

test('removeProject removes only the matching id', () => {
  assert.equal(view(L.removeProject(list(), 'a2')), '+a1 -i1 -i2');
  assert.equal(view(L.removeProject(list(), 'nope')), view(list()));
  assert.deepEqual(L.removeProject([P('x', true)], 'x'), []);
});

test('reorder within a section', () => {
  assert.equal(view(L.reorder(list(), ['a2', 'a1'], ['i2', 'i1'])), '+a2 +a1 -i2 -i1');
});

test('reorder across sections updates active flags', () => {
  assert.equal(view(L.reorder(list(), ['a1', 'i2'], ['a2', 'i1'])), '+a1 +i2 -a2 -i1');
});

test('reorder ignores unknown ids and does not mutate input', () => {
  const before = list();
  const out = L.reorder(before, ['a1', 'ghost'], ['i1', 'i2', 'a2']);
  assert.equal(view(out), '+a1 -i1 -i2 -a2');
  assert.equal(before[1].active, true);
});

test('validated lists keep working with add/toggle/remove', () => {
  let ps = L.validate([{ name: 'x', active: true }, { name: 'y' }]);
  ps = L.addProject(ps, P('z', true));
  ps = L.toggleActive(ps, ps.find((p) => p.name === 'y').id);
  ps = L.removeProject(ps, ps[0].id);
  assert.deepEqual(ps.map((p) => p.name + ':' + p.active), ['z:true', 'y:true']);
});

test('interleaved imported/stored order is normalized so moves land in the right place', () => {
  const ps = L.validate([
    { id: 'a1', name: 'a1', active: true }, { id: 'i1', name: 'i1' },
    { id: 'a2', name: 'a2', active: true }, { id: 'i2', name: 'i2' }
  ]);
  // Visible order inside each section is unchanged; active items come first.
  assert.equal(view(ps), '+a1 +a2 -i1 -i2');
  // Activate lands at the end of Active, Pause at the top of Not active.
  assert.equal(view(L.toggleActive(ps, 'i2')), '+a1 +a2 +i2 -i1');
  assert.equal(view(L.toggleActive(ps, 'a1')), '+a2 -a1 -i1 -i2');
  assert.equal(view(L.addProject(ps, P('n', true))), '+a1 +a2 +n -i1 -i2');
});
