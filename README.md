# supermail

A command bar and hotkey layer for Gmail. Pure DOM overlay: no OAuth scopes, no server,
nothing leaves the browser. v0.1 = palette + keymap + de-clutter + account switching.

## Install

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick this folder.
2. In Gmail: Settings → See all settings → **Keyboard shortcuts on**. Everything here drives
   Gmail's own shortcuts, so without this almost nothing works.
3. Reload your Gmail tab.

`supermail-0.1.0.zip` is the same thing zipped, if you want to move it to another machine
(unzip it, then load unpacked — Chrome won't install a zip/crx directly).

## Use

`⌘K` opens the palette. Type to fuzzy-match; ↑/↓ or `⌃N`/`⌃P` to move; `↵` to run; `Esc` to close.
Commands are filtered by what's currently possible (list view / thread open / compose open), and
each one shows its Gmail hotkey on the right — the palette is there to teach you the keys and
then make itself redundant. Ranking is recency + frequency, so what you ran last is first.

Two sub-modes inside the bar:

- `go <label>` — jump to a label (also on `⇧G`)
- `/ <query>` — run a Gmail search

### Bindings this extension adds

| Key | Does |
|---|---|
| `⌘K` | command palette |
| `⇧E` | mark read **and** archive |
| `⇧O` | open thread in a new tab |
| `⌘⇧L` | copy link to thread |
| `⇧G` | jump to label |
| `⌘/` | keyboard shortcut cheat sheet |
| `⌘1`–`⌘5` | switch Google account (`/u/0`…`/u/4`), keeping the current view |

Everything else in the palette is a native Gmail shortcut being dispatched for you.

**Sectioned inboxes.** With Priority Inbox / multiple inboxes, Gmail refuses every thread action
aimed at the bare keyboard cursor — `e`, `#`, `l`, `⇧I` and friends just answer "No conversations
selected." (only `s` works). So thread actions, whether run from the palette or typed natively,
select the cursor row with `x` first. A selection made this way is cleared again once the action
lands (or, for the label/move pickers, at the start of the next action) — leaving it behind
would silently aim your next keystroke at the wrong thread.

`⌘K` stays out of the way when you have text selected in a compose window, so Gmail's
insert-link still works.

`⌘/` opens a cheat sheet of every binding, grouped by where it applies — the same registry the
palette reads, so it can't drift out of date. `Esc` or `⌘/` closes it.

### De-clutter toggles

In the palette: hide Chat/Meet/Spaces, hide Gemini + AI chips, hide the category tabs,
extra-dense rows. Toggles persist in `chrome.storage.local`.

## Remapping

No settings UI yet. From the Gmail tab's devtools console:

```js
chrome.storage.local.set({ keys: { 'mod+shift+k': 'palette', 'shift+e': 'read-archive' } })
```

Keys are specs like `mod+shift+l` (`mod` = ⌘ on Mac, Ctrl elsewhere); values are command ids
from `content/main.js`. Your map is merged over the defaults. Reload the tab.

## When it breaks

Gmail's DOM changes without warning. Everything that can rot is in two files:

- `content/gmail.js` — selectors, key dispatch, URL shapes
- `content/declutter.css` — the hide rules

Nothing else in the codebase knows Gmail exists.

## Tests

```sh
node test/fuzzy.test.js
```

Covers the matcher's ranking rules. The DOM adapter has no automated test — that needs
Playwright against a real account (v1.0 in the spec).

## Repack

```sh
zip -r supermail-0.1.0.zip manifest.json content README.md
```
