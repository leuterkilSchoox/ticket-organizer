# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal Kanban + todo desktop app (Electron, Linux/X11). The UI is Greek by default, with English selectable in Settings (`state.lang`). Every UI string goes through `t('ελληνικά', 'English')`; static HTML text uses `data-en` / `data-en-ph`. Switching language reloads the page.

## Commands

- `npm start`: runs the app (`electron .`).
- `npm run dist`: builds `.deb` + `.AppImage` into `dist/` (electron-builder). There is no lint or test setup.
- Releases: pushing a `v*` tag runs `.github/workflows/release.yml` (GitHub Release + signed APT repo on GitHub Pages, signing key in the `APT_GPG_PRIVATE_KEY` secret). The repo is public, so keep company URLs and emails out of code and commits. Setting defaults are placeholders.
- Desktop launcher: `~/.local/share/applications/ticket-organizer.desktop` runs `node_modules/electron/dist/electron <project dir>`.
- After `npm install`, Electron's `chrome-sandbox` loses its root:4755 ownership and mode. The app then aborts with "SUID sandbox helper binary ... not configured correctly". To fix it, the user must run with sudo: `chown root:root node_modules/electron/dist/chrome-sandbox && chmod 4755 node_modules/electron/dist/chrome-sandbox`. Don't work around it with `--no-sandbox`.

## Architecture

- `main.js` is the Electron main process. It opens `index.html` and sends `window.open` / `target="_blank"` links to the system browser through `shell.openExternal` (https only).
- `index.html` is the entire app: inline CSS plus one vanilla-JS `<script>`. It uses no framework and no dependencies.
  - The one global `state` object (`columns`, `cards`, `todos`, `colors`) is saved to `localStorage` by `save()`. In Electron this lives in `~/.config/Ticket Organizer/`.
  - Project spaces: `state.spaces` (`{ id, name, keys }`) with `state.space` as the active one. A column belongs to a space through `col.space`, and cards follow their column. `spaceCols(id)` lists a space's columns. `renderKanban()` also renders the `#spacebar` tabs. Todos, settings, theme and colors are shared. Older saves are migrated on load into one space.
  - Rendering is a full re-render (`renderKanban()` / `renderTodos()`) through the small `h(tag, props, ...children)` DOM helper.
  - Text fields save on `change` (blur), not on `input`, so re-renders don't steal focus while typing.
  - A text field whose `change` needs a re-render must call `rerender()`, not `renderKanban()`. Clicking a button while that field has unsaved edits fires `change` between mousedown and mouseup. An immediate re-render would replace the button and swallow the click, so `rerender()` waits for `pointerup`.
  - Cards are collapsed by default (`card.open` is falsy). Collapsed cards show a read-only PR/branch summary, and open cards show the editable priority, PR and branch fields. Notes are always shown.
  - When a card enters a column, `notify()` fires a desktop `Notification` using that column's `notify` template. In the template, `{ticket}` is replaced with the card title.
  - Themes: all CSS colors are `var(--bg|col|surface|text|muted|border|accent)`, set by `setThemeVars()` from `THEMES[state.theme]` or `state.customTheme`. Don't hard-code new colors, except priority colors. `color-scheme` is derived from the background's brightness so native widgets match the theme.
  - Each todo and each card can have a `remind` (`datetime-local` string). `checkReminders()` runs at startup and every 30s. It notifies once for each due, not-done todo and each due card (body = card title), then clears `remind`. Card reminders, like `syncJira()`, wait while `boardBusy()` (a board field is focused) so the re-render doesn't drop typed text. Reminders only fire while the app is running, and missed ones fire on the next start.
  - `jiraLink()` finds a Jira key (`/\b[A-Z][A-Z0-9]+-\d+\b/`) in a card title and links it to `state.settings.jiraUrl + KEY`.
  - `card.pr` is a `", "`-separated list (multiple PRs per card); each entry is `"2419"` (the default repo) or `"<repo>#<n>"`. `prUrl()` builds the link from `state.settings.prUrl` (`https://github.com/<org>/<repo>/pull/`). Because the default repo comes from that setting, changing it also re-points every bare-number PR.
  - `card.due` is a `YYYY-MM-DD` date. `card.sprint` is the `YYYY-MM-DD` start of a 2-week sprint, counted from `SPRINT_ANCHOR` (Mon 2 Nov 2026). The picker offers the current sprint and the next 5. `card.ukg` (boolean checkbox) marks tickets that need a UKG flag.
  - The card's Jenkins link is `state.settings.jenkinsUrl + encodeURIComponent(branch) + '/'`. It's derived from the branch and has no field of its own.
  - `syncJira()` runs at startup and every 5 min. It asks Jira for `state.settings.jiraJql` through `window.jira` (`preload.js` → `main.js`, which holds the API token encrypted with `safeStorage` in `userData/jira-token.bin` and calls `/rest/api/3/search/jql`, avoiding CORS). Issues whose key isn't in any card title (in any space) go into the space whose `keys` (e.g. `ISTA, V3`) include the key's prefix, or the first space, and there into the column named Backlog, or the first column. It skips a round while a board field is focused.
  - On load, `state.settings` is rebuilt as `{ ...defaults, ...state.settings }`, so a setting added later still reaches older saves. Add new settings to that defaults object, and give every setting a case in `normalizeSetting()`.

## Electron/X11 pitfalls (already hit, don't reintroduce)

- **No native HTML5 drag & drop.** It gets cancelled mid-drag under Electron on X11. Drag uses pointer events in `dragHandle()`, which finds the target with `elementFromPoint(...).closest('.col')` and the column's `data-id`.
- **No `confirm()` / `alert()`.** After a native dialog, inputs stop accepting keyboard input in Electron. Use `confirmBtn()` instead: an in-page second click on "Σίγουρα;".
- Flex-row inputs need `min-width: 0`. Without it, the card row overflows into the next column and covers buttons there.

## Verifying UI changes

Write a throwaway Electron script that calls `app.setPath('userData', <tmp dir>)` so the user's data stays untouched. Have it load `index.html` and drive the UI with `webContents.sendInputEvent` (`mouseDown`/`mouseMove`/`mouseUp`, keys) and `webContents.insertText`. Then assert on `state` through `executeJavaScript`. This runs real Blink event ordering (blur/`change` between mousedown and mouseup, pointer events for drag) and stays inside the test window. To submit a form with Enter, send `keyDown` Enter plus `{ type: 'char', keyCode: '\r' }`. To capture notifications, stub `window.Notification`. To capture link opens, use `setWindowOpenHandler`.

**Don't use `xdotool` while the user is at the desktop.** Its keystrokes go to whichever window has focus. GNOME's focus-stealing prevention often leaves that as the user's browser, so typed text and Enter land there. It's only worth it for X11-level bugs, such as the native drag & drop cancellation, and only after asking the user. Its gotchas that look like app bugs:
- Wait ~200ms after `key ctrl+a` before `type`. Otherwise Ctrl is still held and the first characters are swallowed.
- `type` treats every remaining argument as text, so `type foo key Tab` types "key Tab". Issue `key` as a separate command.
- With a very short `--delay` (≤5ms), Shift characters get dropped (`https://` comes out as `httpsQ//`). Use `--delay 10` or more.
