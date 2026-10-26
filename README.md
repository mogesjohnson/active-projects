# active-projects

A small, phone-first web app that shows which of my projects are **Active** (in use now)
and which are **Not active**. Each card links to the project's GitHub repo.

**Live:** https://mogesjohnson.github.io/active-projects/

Plain HTML, CSS and JavaScript. No build step, no backend, no login, no external CDN.
Your list is stored in your browser (`localStorage`) on your device only.

## Use it

- **Reorder or switch sections:** press and hold the `⋮⋮` handle on a card and drag it up or
  down. Drop it in the other section to change its status. Order is saved automatically.
- **Quick move:** tap **Pause** (Active → Not active) or **Activate** (Not active → Active).
- **Add:** fill in a name, plus an optional URL and note. With no URL the card links to
  `https://github.com/mogesjohnson/<name>`.
- **Remove:** tap `✕` on a card and confirm.
- **Storage status:** the line under the title says whether the browser granted persistent
  storage (`navigator.storage.persist()`). Installing the app makes that more likely.

## Add to your Android home screen

1. Open the live link in Chrome.
2. Tap the `⋮` menu, then **Add to Home screen** (or **Install app**).
3. Launch it from the home screen. It runs full screen and works offline.

## Back up and move your list

- **Export JSON** downloads `active-projects-YYYY-MM-DD.json`.
- **Import JSON** reads a file in the same format and replaces the list after you confirm.
  The file is validated: it must be `{"projects": [...]}` (or a bare array), each item needs a
  `name` (1-100 chars); `url` must be http(s); `note` and `active` are optional.

```json
{ "version": 1, "projects": [
  { "name": "history-scrub", "url": "https://github.com/mogesjohnson/history-scrub", "note": "", "active": true }
] }
```

- **Reset to defaults** restores the seeded list of public repos.

## Develop

```sh
python3 -m http.server 8000   # then open http://localhost:8000
npm run check   # node --check on the JS, manifest JSON check
npm test        # unit tests, Node 20+ built-in runner, nothing to install
```

The list logic lives in `logic.js` (a plain script the page loads before `app.js`, also
`require`-able from Node), and the tests in `test/` exercise it with a fake `localStorage`.
CI runs the same checks on every push and pull request.

When you change files, bump `CACHE` in `sw.js` so installed copies pick up the update.
Agent and contribution rules are in [AGENTS.md](AGENTS.md) and [RULES.md](RULES.md).
