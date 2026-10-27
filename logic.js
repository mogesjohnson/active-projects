'use strict';
// Pure project-list logic shared by the page (app.js) and the unit tests (test/).
// Loaded as a plain <script>; exposes globalThis.ActiveProjectsLogic and, under Node, module.exports.
(function (root) {
  const KEY = 'active-projects:v1';
  const BACKUP_KEY = KEY + ':corrupt-backup';
  const GH = 'https://github.com/mogesjohnson/';
  const MAX_PROJECTS = 1000;
  const SEED_ACTIVE = ['active-projects', 'history-scrub', 'BEST-OF-AI-DEV'];
  const SEED_INACTIVE = [
    'shadow-army', 'care-reminder', 'spec-to-tests', 'codebase-map', 'release-notes',
    'agent-deck', 'rules-sync', 'repo-health', 'demo-reel', 'app-update-checker',
    'post-it-board', 'how-to-post-it', 'shadow-docs', 'trace-workbench', 'Personal-Portfolio'
  ];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function seed(makeId = uid) {
    return SEED_ACTIVE.map((n) => ({ name: n, active: true }))
      .concat(SEED_INACTIVE.map((n) => ({ name: n, active: false })))
      .map((p) => ({ id: makeId(), name: p.name, url: GH + p.name, note: '', active: p.active }));
  }

  function isHttpUrl(u) {
    try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; }
    catch (e) { return false; }
  }

  // Validate untrusted data (localStorage or an imported file). Throws on bad input.
  function validate(data, makeId = uid) {
    const arr = Array.isArray(data) ? data : data && Array.isArray(data.projects) ? data.projects : null;
    if (!arr) throw new Error('Expected {"projects": [...]} or an array.');
    if (arr.length > MAX_PROJECTS) throw new Error('Too many projects (max ' + MAX_PROJECTS + ').');
    const seen = new Set();
    const out = arr.map((p, i) => {
      if (!p || typeof p !== 'object') throw new Error('Item ' + (i + 1) + ' is not an object.');
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!name || name.length > 100) throw new Error('Item ' + (i + 1) + ' needs a name (1-100 chars).');
      const url = p.url == null || p.url === '' ? GH + encodeURIComponent(name) : String(p.url);
      if (!isHttpUrl(url)) throw new Error('Item ' + (i + 1) + ' has an invalid URL.');
      const note = p.note == null ? '' : String(p.note).slice(0, 200);
      let id = typeof p.id === 'string' && p.id ? p.id.slice(0, 40) : makeId();
      if (seen.has(id)) id = makeId();
      seen.add(id);
      return { id, name, url, note, active: p.active === true };
    });
    // Keep Active items first (order within each section unchanged): add and move rely on it.
    return out.filter((p) => p.active).concat(out.filter((p) => !p.active));
  }

  // Read the saved list. Missing, unreadable or invalid data falls back to the seed list.
  // Invalid data is first copied to BACKUP_KEY so the next save cannot destroy it.
  function load(storage, makeId = uid) {
    let raw;
    try {
      raw = storage && storage.getItem(KEY);
      if (raw) return validate(JSON.parse(raw), makeId);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Stored data invalid, using defaults', e);
      if (raw) backupCorrupt(storage, raw);
    }
    return seed(makeId);
  }

  function backupCorrupt(storage, raw) {
    try {
      storage.setItem(BACKUP_KEY, raw);
      if (typeof console !== 'undefined') console.warn('Invalid stored data was backed up to ' + BACKUP_KEY);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Could not back up invalid stored data', e);
    }
  }

  // Write the list. Throws if storage is unavailable or full; the caller reports it.
  function save(storage, projects) {
    if (!storage) throw new Error('Storage is not available.');
    storage.setItem(KEY, JSON.stringify({ version: 1, projects }));
  }

  // Index where a new active item goes: the end of the active section.
  function activeEnd(list) {
    const i = list.findIndex((x) => !x.active);
    return i < 0 ? list.length : i;
  }

  // Add a project: active ones go to the end of Active, inactive ones to the end of Not active.
  function addProject(projects, p) {
    const next = projects.slice();
    if (p.active) next.splice(activeEnd(next), 0, p);
    else next.push(p);
    return next;
  }

  // Flip a project's section: it lands at the end of Active or the top of Not active.
  function toggleActive(projects, id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return projects;
    const next = projects.filter((x) => x !== p);
    const moved = Object.assign({}, p, { active: !p.active });
    next.splice(activeEnd(next), 0, moved);
    return next;
  }

  function removeProject(projects, id) {
    return projects.filter((x) => x.id !== id);
  }

  // Rebuild order and status from the ids shown in each section (after a drag).
  function reorder(projects, activeIds, inactiveIds) {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const next = [];
    for (const [ids, active] of [[activeIds, true], [inactiveIds, false]]) {
      for (const id of ids) {
        const p = byId.get(id);
        if (p) next.push(Object.assign({}, p, { active }));
      }
    }
    return next;
  }

  const api = {
    KEY, BACKUP_KEY, GH, MAX_PROJECTS, uid, seed, isHttpUrl, validate, load, save,
    addProject, toggleActive, removeProject, reorder
  };
  root.ActiveProjectsLogic = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
