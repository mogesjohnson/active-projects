'use strict';
// Minimal in-memory stand-in for window.localStorage.
class FakeStorage {
  constructor(init = {}) { this.data = new Map(Object.entries(init)); this.failWrites = false; }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }
  setItem(k, v) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.data.set(k, String(v));
  }
  removeItem(k) { this.data.delete(k); }
}

// Deterministic id generator: id-1, id-2, ...
function counter(prefix = 'id-') {
  let n = 0;
  return () => prefix + (++n);
}

const P = (id, active, extra = {}) =>
  Object.assign({ id, name: id, url: 'https://github.com/mogesjohnson/' + id, note: '', active }, extra);

module.exports = { FakeStorage, counter, P };
