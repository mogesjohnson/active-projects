'use strict';
(function () {
  const KEY = 'active-projects:v1';
  const GH = 'https://github.com/mogesjohnson/';
  const SEED_ACTIVE = ['active-projects', 'history-scrub', 'BEST-OF-AI-DEV'];
  const SEED_INACTIVE = [
    'shadow-army', 'care-reminder', 'spec-to-tests', 'codebase-map', 'release-notes',
    'agent-deck', 'rules-sync', 'repo-health', 'demo-reel', 'app-update-checker',
    'post-it-board', 'how-to-post-it', 'shadow-docs', 'trace-workbench', 'Personal-Portfolio'
  ];

  const $ = (s) => document.querySelector(s);
  const lists = { true: $('#list-active'), false: $('#list-inactive') };
  let projects = [];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const seed = () => SEED_ACTIVE.map((n) => ({ name: n, active: true }))
    .concat(SEED_INACTIVE.map((n) => ({ name: n, active: false })))
    .map((p) => ({ id: uid(), name: p.name, url: GH + p.name, note: '', active: p.active }));

  function isHttpUrl(u) {
    try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; }
    catch (e) { return false; }
  }

  // Validate untrusted data (localStorage or an imported file). Throws on bad input.
  function validate(data) {
    const arr = Array.isArray(data) ? data : data && Array.isArray(data.projects) ? data.projects : null;
    if (!arr) throw new Error('Expected {"projects": [...]} or an array.');
    if (arr.length > 1000) throw new Error('Too many projects (max 1000).');
    const seen = new Set();
    return arr.map((p, i) => {
      if (!p || typeof p !== 'object') throw new Error('Item ' + (i + 1) + ' is not an object.');
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!name || name.length > 100) throw new Error('Item ' + (i + 1) + ' needs a name (1-100 chars).');
      const url = p.url == null || p.url === '' ? GH + encodeURIComponent(name) : String(p.url);
      if (!isHttpUrl(url)) throw new Error('Item ' + (i + 1) + ' has an invalid URL.');
      const note = p.note == null ? '' : String(p.note).slice(0, 200);
      let id = typeof p.id === 'string' && p.id ? p.id.slice(0, 40) : uid();
      if (seen.has(id)) id = uid();
      seen.add(id);
      return { id, name, url, note, active: p.active === true };
    });
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return validate(JSON.parse(raw));
    } catch (e) { console.warn('Stored data invalid, using defaults', e); }
    return seed();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, projects })); }
    catch (e) { msg('Could not save: ' + e.message, true); }
  }

  function msg(text, isError) {
    const m = $('#message');
    m.textContent = text;
    m.classList.toggle('error', !!isError);
  }

  function render() {
    const tpl = $('#card-tpl');
    lists.true.textContent = '';
    lists.false.textContent = '';
    for (const p of projects) {
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.id = p.id;
      const a = li.querySelector('.name');
      a.textContent = p.name;
      a.href = p.url;
      li.querySelector('.note').textContent = p.note;
      li.querySelector('.move').textContent = p.active ? 'Pause' : 'Activate';
      li.querySelector('.handle').setAttribute('aria-label', 'Drag ' + p.name);
      lists[p.active].appendChild(li);
    }
    $('#count-active').textContent = lists.true.children.length;
    $('#count-inactive').textContent = lists.false.children.length;
  }

  // Rebuild state order from the DOM after a drag.
  function syncFromDom() {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const next = [];
    for (const key of ['true', 'false']) {
      for (const li of lists[key].children) {
        const p = byId.get(li.dataset.id);
        if (p) { p.active = key === 'true'; next.push(p); }
      }
    }
    projects = next;
    save();
    render();
  }

  // ---- Pointer-based drag (works for touch, pen and mouse) ----
  let drag = null;

  function onPointerDown(e) {
    const handle = e.target.closest('.handle');
    if (!handle || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const card = handle.closest('.card');
    handle.setPointerCapture(e.pointerId);
    drag = { card, handle, id: e.pointerId, y: e.clientY, raf: 0 };
    card.classList.add('dragging');
    document.body.classList.add('drag-active');
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function targetList(y) {
    for (const key of ['true', 'false']) {
      const r = lists[key].getBoundingClientRect();
      if (y >= r.top - 20 && y <= r.bottom + 20) return lists[key];
    }
    const a = lists.true.getBoundingClientRect();
    return y < a.bottom ? lists.true : lists.false;
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    drag.y = e.clientY;
    const list = targetList(drag.y);
    for (const l of Object.values(lists)) l.classList.toggle('over', l === list);
    const others = [...list.children].filter((c) => c !== drag.card);
    const before = others.find((c) => {
      const r = c.getBoundingClientRect();
      return drag.y < r.top + r.height / 2;
    });
    if (before) { if (drag.card.nextElementSibling !== before) list.insertBefore(drag.card, before); }
    else if (list.lastElementChild !== drag.card) list.appendChild(drag.card);
    if (!drag.raf) drag.raf = requestAnimationFrame(autoScroll);
  }

  function autoScroll() {
    if (!drag) return;
    drag.raf = 0;
    const edge = 70, h = window.innerHeight;
    let dy = 0;
    if (drag.y < edge) dy = -Math.ceil((edge - drag.y) / 5);
    else if (drag.y > h - edge) dy = Math.ceil((drag.y - (h - edge)) / 5);
    if (dy) { window.scrollBy(0, dy); drag.raf = requestAnimationFrame(autoScroll); }
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.raf) cancelAnimationFrame(drag.raf);
    try { drag.handle.releasePointerCapture(drag.id); } catch (err) { /* already released */ }
    drag.card.classList.remove('dragging');
    for (const l of Object.values(lists)) l.classList.remove('over');
    document.body.classList.remove('drag-active');
    drag = null;
    syncFromDom();
  }

  function onClick(e) {
    const card = e.target.closest('.card');
    if (!card) return;
    const p = projects.find((x) => x.id === card.dataset.id);
    if (!p) return;
    if (e.target.closest('.move')) {
      // Move to the end of active list or top of the inactive list.
      projects = projects.filter((x) => x !== p);
      p.active = !p.active;
      const firstInactive = projects.findIndex((x) => !x.active);
      projects.splice(firstInactive < 0 ? projects.length : firstInactive, 0, p);
      save(); render();
    } else if (e.target.closest('.remove')) {
      if (confirm('Remove "' + p.name + '"?')) {
        projects = projects.filter((x) => x !== p);
        save(); render(); msg('Removed ' + p.name + '.');
      }
    }
  }

  function onAdd(e) {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const url = f.url.value.trim() || GH + encodeURIComponent(name);
    if (!name) return msg('Name is required.', true);
    if (!isHttpUrl(url)) return msg('URL must start with http:// or https://', true);
    const p = { id: uid(), name, url, note: f.note.value.trim(), active: f.active.checked };
    if (p.active) {
      const i = projects.findIndex((x) => !x.active);
      projects.splice(i < 0 ? projects.length : i, 0, p);
    } else projects.push(p);
    save(); render(); f.reset(); f.active.checked = true;
    msg('Added ' + name + '.');
  }

  function onExport() {
    const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), projects }, null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'active-projects-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('Exported ' + projects.length + ' projects.');
  }

  function onImport(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1e6) return msg('File too large (max 1 MB).', true);
    file.text().then((text) => {
      const next = validate(JSON.parse(text));
      if (!confirm('Replace your list with ' + next.length + ' imported projects?')) return;
      projects = next; save(); render();
      msg('Imported ' + next.length + ' projects.');
    }).catch((err) => msg('Import failed: ' + err.message, true));
  }

  async function storageStatus() {
    const el = $('#storage-status');
    if (!navigator.storage || !navigator.storage.persist) {
      el.textContent = 'Saved on this device (persistent storage not supported).';
      return;
    }
    let persisted = await navigator.storage.persisted();
    if (!persisted) persisted = await navigator.storage.persist();
    el.textContent = persisted
      ? 'Saved on this device · storage is persistent'
      : 'Saved on this device · browser may clear it (install to home screen to keep it)';
  }

  projects = load();
  render();
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('click', onClick);
  $('#add-form').addEventListener('submit', onAdd);
  $('#export-btn').addEventListener('click', onExport);
  $('#import-file').addEventListener('change', onImport);
  $('#reset-btn').addEventListener('click', () => {
    if (confirm('Reset the list to the default projects?')) { projects = seed(); save(); render(); msg('Reset.'); }
  });
  storageStatus().catch(() => { $('#storage-status').textContent = 'Saved on this device.'; });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW failed', err));
  }
  window.__activeProjects = { validate, get: () => projects };
})();
