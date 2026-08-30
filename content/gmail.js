// EVERY piece of Gmail DOM/URL knowledge lives in this file. When Google ships a UI
// change and something breaks, this is the only file you have to fix.
const SM = (self.SM = self.SM || {});

// Keys that aren't a plain letter/digit. Gmail dispatches off keyCode, so we need real ones.
const KEYCODE = { '#': [51, true], '/': [191, false], '.': [190, false], ',': [188, false],
  '[': [219, false], ']': [221, false], ';': [186, false], '*': [56, true], '!': [49, true],
  '?': [191, true], '=': [187, false], '+': [187, true], 'enter': [13, false], 'escape': [27, false] };

function keyInit(spec) {
  const parts = spec.split('+');
  const base = parts.pop();
  const known = KEYCODE[base.toLowerCase()];
  const isUpper = base.length === 1 && base !== base.toLowerCase();
  const shiftKey = parts.includes('shift') || isUpper || (known ? known[1] : false);
  return {
    key: base.length === 1 ? (shiftKey ? base.toUpperCase() : base) : base[0].toUpperCase() + base.slice(1),
    keyCode: known ? known[0] : base.toUpperCase().charCodeAt(0),
    which: known ? known[0] : base.toUpperCase().charCodeAt(0),
    shiftKey,
    ctrlKey: parts.includes('ctrl'),
    metaKey: parts.includes('mod') || parts.includes('meta'),
    altKey: parts.includes('alt'),
    bubbles: true, cancelable: true, composed: true
  };
}

// Drive Gmail by synthesising its own keystrokes. Gmail doesn't check isTrusted.
// Requires "Keyboard shortcuts on" in Gmail settings.
// ponytail: synthetic keys instead of clicking obfuscated toolbar buttons. If Google ever
// starts gating on isTrusted, swap this one function for aria-label button clicks.
SM.press = (spec) => {
  const steps = spec.trim().split(/\s+/);
  steps.forEach((step, i) => setTimeout(() => {
    const init = keyInit(step);
    for (const type of ['keydown', 'keypress', 'keyup']) {
      if (type === 'keypress' && (init.metaKey || init.ctrlKey)) continue;
      const ev = new KeyboardEvent(type, init);
      ev.__sm = true; // so our own hotkey listener ignores it
      (document.activeElement || document.body).dispatchEvent(ev);
    }
  }, i * 40));
};

SM.isEditable = (el) => !!el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName || ''));

SM.composeOpen = () => !!document.querySelector('div[role="dialog"] [role="textbox"][aria-label], form [name="subjectbox"], [name="subjectbox"]');
SM.threadOpen = () => !!document.querySelector('[role="main"] [data-message-id], [role="main"] .adn')
  || /^#[^/]+\/[A-Za-z0-9]{10,}$/.test(location.hash);
SM.view = () => SM.composeOpen() ? 'compose-open' : SM.threadOpen() ? 'thread-open' : 'list-view';

// Row under the keyboard cursor in the thread list.
SM.focusedRow = () => document.querySelector('tr.zA.btb') || document.querySelector('[role="main"] tr.zA[aria-selected="true"]');

// Verified in a real inbox: with Priority Inbox / sections, Gmail refuses every thread action
// on the bare keyboard cursor ("No conversations selected.") — only star works. Selecting the
// cursor row first with `x` makes the action work, and is a no-op difference in a plain inbox.
SM.hasSelection = () => !!document.querySelector('[role="main"] [role="checkbox"][aria-checked="true"]');

// We must never leave a selection of our own lying around: Gmail acts on the selection rather
// than the cursor, so a stale auto-selection silently retargets the NEXT action at the wrong
// thread (mark A read, move the cursor to B, hit e — and A gets archived).
let mine = null; // the row we ticked on the user's behalf
const boxOf = (row) => row && row.querySelector('[role="checkbox"]');
const isChecked = (row) => { const b = boxOf(row); return !!b && b.getAttribute('aria-checked') === 'true'; };
const dropMine = () => {
  if (mine && mine.isConnected && isChecked(mine)) boxOf(mine).click();
  mine = null;
};

// `keep` is for actions that open a picker (label, move): clicking a checkbox while their menu
// is up would dismiss it, so that one is cleared at the start of the next action instead.
SM.rowKey = (spec, keep) => {
  if (SM.view() !== 'list-view') return SM.press(spec);
  const row = SM.focusedRow();
  if (mine && mine !== row) dropMine();
  if (SM.hasSelection()) return SM.press(spec); // a selection the user made: act on it, as Gmail would
  mine = row;
  SM.press('x ' + spec);
  if (!keep) setTimeout(dropMine, 800);
};

SM.go = (hash) => { location.hash = hash; };
SM.search = (q) => { location.hash = '#search/' + encodeURIComponent(q); };

// Left-nav labels, read off hrefs (not obfuscated classes) so this survives redesigns.
SM.labels = () => {
  const seen = new Map();
  for (const a of document.querySelectorAll('a[href*="#label/"]')) {
    const raw = a.href.split('#label/')[1];
    if (!raw) continue;
    const name = decodeURIComponent(raw).replace(/\+/g, ' ');
    if (!seen.has(name)) seen.set(name, '#label/' + raw);
  }
  return [...seen].map(([name, hash]) => ({ name, hash }));
};

SM.account = () => Number((location.pathname.match(/\/mail\/u\/(\d+)/) || [, 0])[1]);
SM.switchAccount = (n) => { location.href = location.href.replace(/\/mail\/u\/\d+/, '/mail/u/' + n); };

SM.threadId = () => {
  const m = location.hash.match(/^#[^/]+\/(?:[^/]+\/)?([A-Za-z0-9]{10,})$/);
  if (m) return m[1];
  // Row ids are junk (":2u"); the real id sits on a child node.
  const el = (SM.focusedRow() || document).querySelector('[data-legacy-thread-id]');
  return el ? el.getAttribute('data-legacy-thread-id') : null;
};
SM.threadLink = () => {
  const id = SM.threadId();
  return id ? location.origin + location.pathname + '#all/' + id : null;
};
