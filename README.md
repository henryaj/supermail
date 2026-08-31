# supermail

A command bar and hotkey layer for Gmail, in ~600 lines of dependency-free JavaScript.
Pure DOM overlay — no OAuth scopes, no server, no build step, no analytics. Nothing leaves
your browser.

## Install

Not on the Chrome Web Store. Clone this repo, then `chrome://extensions` → **Developer
mode** → **Load unpacked** → pick the folder.

Then turn **Keyboard shortcuts on** in Gmail's settings. Everything here drives Gmail's own
shortcuts, so without that almost nothing works.

## Keys

`⌘K` opens a fuzzy command palette, filtered to what's possible right now (list view /
thread open / compose) and ranked by what you actually use. Every command shows its Gmail
hotkey on the right, so the palette teaches you the keys and then gets out of the way.

| | |
|---|---|
| `⌘K` | command palette |
| `⌘/` | cheat sheet of every binding |
| `⇧E` | mark read **and** archive |
| `⇧O` | open thread in a new tab |
| `⌘⇧L` | copy link to thread |
| `⇧G` | jump to a label |
| `⌘⇧U` | unsubscribe from this sender |
| `⌘1`–`⌘5` | switch Google account |

Inside the palette, `go <label>` jumps to a label and `/ <query>` runs a Gmail search.
Everything else it runs is a native Gmail shortcut dispatched for you.

The four de-clutter toggles live in the palette too: hide Chat/Meet/Spaces, hide Gemini and
the AI chips, hide the category tabs, extra-dense rows.

## How it works

Content scripts drive Gmail by synthesising Gmail's own keystrokes. No API, no OAuth, no
network calls — which is also why there's no CASA security assessment to pay for, and why a
snooze can't fire while your laptop is shut.

All Gmail DOM knowledge is confined to `content/gmail.js` and `content/declutter.css`. When
Google rotates a class name and something breaks, those are the only two files to look at.

Two behaviours worth knowing about:

- **Sectioned inboxes.** With Priority Inbox or multiple inboxes, Gmail refuses every thread
  action aimed at the bare keyboard cursor — `e`, `#`, `l`, `⇧I` all answer "No conversations
  selected". Thread actions therefore tick the cursor row first and untick it once the action
  lands, because a selection left behind would aim your next keystroke at the wrong thread.
- **English only.** Gmail gives the unsubscribe controls no `aria-label`, so they're matched
  on visible text.

## Remapping

No settings UI yet. From the Gmail tab's devtools console:

```js
chrome.storage.local.set({ keys: { 'mod+shift+k': 'palette' } })
```

Keys are specs like `mod+shift+l` (`mod` is ⌘ on macOS, Ctrl elsewhere); values are command
ids from `content/main.js`. Your map is merged over the defaults. Reload the tab.

## Tests

```sh
node test/fuzzy.test.js
```

Covers the fuzzy matcher's ranking rules. The DOM adapter has no automated test — that needs
Playwright against a real account, and until it exists every Gmail change is found by hand.

## Licence

MIT — see [LICENSE](LICENSE).
