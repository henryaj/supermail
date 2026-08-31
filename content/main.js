// Command registry, keymap and settings. UI is in palette.js, Gmail knowledge in gmail.js.
(() => {
  const P = SM.Palette;
  const MOD = navigator.platform.includes('Mac') ? 'mod' : 'ctrl';
  const MODSYM = MOD === 'mod' ? '⌘' : 'Ctrl+';

  let settings = { 'hide-chat': false, 'hide-gemini': false, 'hide-tabs': false, 'dense': false };
  let usage = {};
  let keys = {};

  // ---- keymap -------------------------------------------------------------
  // Only bindings Gmail itself lacks. Everything else stays native on purpose.
  const DEFAULT_KEYS = {
    [MOD + '+k']: 'palette',
    'shift+o': 'new-tab',
    [MOD + '+shift+l']: 'copy-link',
    'shift+e': 'read-archive',
    'shift+g': 'label-jump',
    [MOD + '+/']: 'shortcuts',
    [MOD + '+shift+u']: 'unsubscribe',
    ...Object.fromEntries([0, 1, 2, 3, 4].map((n) => [MOD + '+' + (n + 1), 'account-' + n]))
  };
  // Gmail's own thread shortcuts do nothing in a sectioned inbox (see gmail.js). Intercept
  // them in list view and re-issue them with the cursor row selected. Elsewhere Gmail is fine
  // on its own, so we stay out of the way.
  const NATIVE_FIX = { 'e': 'archive', '#': 'delete', 'shift+#': 'delete', 'shift+i': 'mark-read',
    'shift+u': 'mark-unread', 'l': 'label', 'v': 'move', 'm': 'mute', 'b': 'snooze', 'shift+!': 'spam' };

  const SYM = { mod: '⌘', ctrl: '⌃', shift: '⇧', alt: '⌥' };
  const pretty = (spec) => spec.split('+').map((p) => SYM[p] || p.toUpperCase()).join('');
  function shortcutFor(id) {
    const spec = Object.keys(keys).find((k) => keys[k] === id) || Object.keys(DEFAULT_KEYS).find((k) => DEFAULT_KEYS[k] === id);
    return spec ? pretty(spec) : '';
  }
  const specOf = (e) => [e.metaKey && 'mod', e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift']
    .filter(Boolean).concat((e.key || '').toLowerCase()).join('+');

  // ---- commands -----------------------------------------------------------
  // ctx: always | list-view | thread-open | compose-open (pipe-separated)
  const key = (spec) => () => SM.press(spec);
  const rowKey = (spec, keep) => () => SM.rowKey(spec, keep); // thread actions: select the cursor row first
  const cmd = (id, title, ctx, hint, run, keywords, section) =>
    ({ id, title, ctx, hint, run, keywords: keywords || [], section: section || '' });

  const toggle = (k, label) => cmd('toggle-' + k, () => `${label}: ${settings[k] ? 'on' : 'off'}`, 'always', '',
    () => setSetting(k, !settings[k]), ['toggle', 'settings', 'declutter', 'hide'], 'Setting');

  const COMMANDS = [
    cmd('compose', 'Compose', 'always', 'c', key('c'), ['new', 'write', 'mail']),
    cmd('search', 'Search mail', 'always', '/', key('/'), ['find']),
    cmd('inbox', 'Go to Inbox', 'always', 'g i', key('g i'), ['nav']),
    cmd('starred', 'Go to Starred', 'always', 'g s', key('g s'), ['nav']),
    cmd('snoozed', 'Go to Snoozed', 'always', '', () => SM.go('#snoozed'), ['nav']),
    cmd('sent', 'Go to Sent', 'always', 'g t', key('g t'), ['nav']),
    cmd('drafts', 'Go to Drafts', 'always', 'g d', key('g d'), ['nav']),
    cmd('allmail', 'Go to All Mail', 'always', 'g a', key('g a'), ['nav', 'archive']),
    cmd('label-jump', 'Jump to label…', 'always', shortcutFor('label-jump'), () => P.open(labelProvider), ['go', 'folder']),
    cmd('shortcuts', 'Keyboard shortcuts', 'always', shortcutFor('shortcuts'), () => P.openSheet(sheetSections(), FOOTER),
      ['help', 'cheat sheet', 'keys', 'bindings', 'reference']),

    cmd('archive', 'Archive', 'list-view|thread-open', 'e', rowKey('e'), ['done']),
    cmd('read-archive', 'Mark read and archive', 'list-view|thread-open', shortcutFor('read-archive'),
      () => { SM.rowKey('shift+i'); setTimeout(() => SM.rowKey('e'), 220); }, ['done', 'clear']),
    cmd('delete', 'Delete', 'list-view|thread-open', '#', rowKey('#'), ['trash', 'bin']),
    cmd('snooze', 'Snooze', 'list-view|thread-open', 'b', rowKey('b'), ['later', 'remind']),
    cmd('mark-read', 'Mark as read', 'list-view|thread-open', '⇧I', rowKey('shift+i')),
    cmd('mark-unread', 'Mark as unread', 'list-view|thread-open', '⇧U', rowKey('shift+u')),
    cmd('star', 'Star', 'list-view|thread-open', 's', key('s'), ['flag']),
    cmd('label', 'Apply label…', 'list-view|thread-open', 'l', rowKey('l', true), ['tag']),
    cmd('move', 'Move to…', 'list-view|thread-open', 'v', rowKey('v', true)),
    cmd('mute', 'Mute thread', 'list-view|thread-open', 'm', rowKey('m'), ['ignore']),
    cmd('spam', 'Report spam', 'list-view|thread-open', '!', rowKey('!'), ['junk']),
    cmd('important', 'Mark important', 'list-view|thread-open', '=', rowKey('=')),
    cmd('select-all', 'Select all in view', 'list-view', '* a', key('* a'), ['bulk']),
    cmd('refresh', 'Refresh inbox', 'list-view', '', () => SM.press('u'), ['reload']),

    cmd('reply', 'Reply', 'thread-open', 'r', key('r')),
    cmd('reply-all', 'Reply all', 'thread-open', 'a', key('a')),
    cmd('forward', 'Forward', 'thread-open', 'f', key('f')),
    cmd('back', 'Back to list', 'thread-open', 'u', key('u'), ['close']),
    cmd('print', 'Print thread', 'thread-open', 'p', key('p')),
    cmd('expand', 'Expand all messages', 'thread-open', ';', key(';')),

    cmd('unsubscribe', 'Unsubscribe…', 'list-view|thread-open', shortcutFor('unsubscribe'), unsubscribe,
      ['newsletter', 'mailing list', 'stop', 'remove me']),
    cmd('copy-link', 'Copy link to thread', 'list-view|thread-open', shortcutFor('copy-link'), copyLink, ['url', 'share']),
    cmd('new-tab', 'Open thread in new tab', 'list-view|thread-open', shortcutFor('new-tab'), openNewTab, ['window']),

    cmd('send', 'Send', 'compose-open', MODSYM + '↵', key('mod+enter')),
    cmd('cc', 'Add Cc', 'compose-open', '⌃⇧C', key('ctrl+shift+c')),
    cmd('bcc', 'Add Bcc', 'compose-open', '⌃⇧B', key('ctrl+shift+b')),

    toggle('hide-chat', 'Hide Chat / Meet / Spaces'),
    toggle('hide-gemini', 'Hide Gemini & AI chips'),
    toggle('hide-tabs', 'Hide category tabs'),
    toggle('dense', 'Extra-dense rows'),
    ...[0, 1, 2, 3, 4].map((n) => cmd('account-' + n, `Switch to account ${n + 1}`, 'always',
      MODSYM + (n + 1), () => SM.switchAccount(n), ['user', 'inbox', 'profile'], 'Account'))
  ];

  const byId = Object.fromEntries(COMMANDS.map((c) => [c.id, c]));
  const titleOf = (c) => typeof c.title === 'function' ? c.title() : c.title;

  // ---- cheat sheet --------------------------------------------------------
  const FOOTER = 'Keys with ⌘ or ⇧ are supermail\u2019s. Plain letters are Gmail\u2019s own, dispatched for you. ' +
    'Inside the palette: <code>go &lt;label&gt;</code> jumps to a label, <code>/ &lt;query&gt;</code> searches.';

  function sheetSections() {
    const rows = (ctx) => COMMANDS
      .filter((c) => c.ctx === ctx && c.hint && c.id !== 'shortcuts' && !c.id.startsWith('account-'))
      .map((c) => ({ title: titleOf(c), hint: c.hint }));
    return [
      { title: 'supermail', rows: [
        { title: 'Command palette', hint: shortcutFor('palette') },
        { title: 'This cheat sheet', hint: shortcutFor('shortcuts') },
        { title: 'Switch account 1–5', hint: MODSYM + '1–5' }
      ] },
      { title: 'Anywhere', rows: rows('always') },
      { title: 'List or thread', rows: rows('list-view|thread-open') },
      { title: 'List view', rows: rows('list-view') },
      { title: 'Thread open', rows: rows('thread-open') },
      { title: 'Compose', rows: rows('compose-open') }
    ].filter((s) => s.rows.length);
  }

  // ---- ranking ------------------------------------------------------------
  function boost(id) {
    const u = usage[id];
    if (!u) return 0;
    const days = (Date.now() - u.t) / 864e5;
    return 4 * Math.log2(1 + u.n) + (days < 7 ? 8 - days : 0);
  }
  function record(id) {
    const u = usage[id] || { n: 0, t: 0 };
    usage[id] = { n: u.n + 1, t: Date.now() };
    chrome.storage.local.set({ usage });
  }
  function invoke(id) {
    const c = byId[id];
    if (!c) return;
    record(id);
    c.run();
  }

  function provider(q) {
    q = q.trim();
    if (/^go\s/i.test(q)) return labelProvider(q.replace(/^go\s+/i, ''));
    if (/^\/\s?\S/.test(q)) {
      const term = q.replace(/^\/\s?/, '');
      return [{ title: `Search Gmail for “${term}”`, hint: '↵', section: 'Search', pos: [], run: () => SM.search(term) }];
    }
    const view = SM.view();
    const out = [];
    for (const c of COMMANDS) {
      if (c.ctx !== 'always' && !c.ctx.split('|').includes(view)) continue;
      const title = titleOf(c);
      let m = q ? fuzzyScore(q, title) : { score: 0, pos: [] };
      if (q && !m) {
        for (const k of c.keywords) {
          const s = fuzzyScore(q, k);
          if (s) { m = { score: s.score - 6, pos: [] }; break; }
        }
      }
      if (!m) continue;
      const contextual = c.ctx !== 'always' ? 0.5 : 0;
      out.push({ ...c, title, pos: m.pos, score: m.score + boost(c.id) + contextual, run: () => invoke(c.id) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 9);
  }

  function labelProvider(q) {
    const labels = SM.labels();
    if (!labels.length) return [{ title: 'No labels found in the sidebar', hint: '', pos: [], run: () => {} }];
    return labels
      .map((l) => ({ l, m: fuzzyScore((q || '').trim(), l.name) }))
      .filter((x) => x.m)
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 9)
      .map(({ l, m }) => ({ title: l.name, section: 'Label', hint: '', pos: m.pos, run: () => SM.go(l.hash) }));
  }

  // ---- commands that aren't just a keystroke -------------------------------
  // Gmail's dialog is async in both directions, so poll rather than guess at timings.
  function until(pred, done, tries = 25) {
    const timer = setInterval(() => {
      const v = pred();
      if (v) { clearInterval(timer); done(v); }
      else if (--tries <= 0) { clearInterval(timer); done(null); }
    }, 100);
  }

  function unsubscribe() {
    const el = SM.unsubscribeControl();
    if (!el) return toast('No unsubscribe link on this thread');
    const row = el.closest('tr');
    if (row) row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); // row actions render on hover
    SM.realClick(el);
    // Click through Gmail's confirmation too, by request: one keystroke, no modal, no undo.
    until(SM.unsubscribeConfirm, (confirm) => {
      if (!confirm) return toast('Unsubscribe dialog never appeared');
      SM.realClick(confirm);
      // Then archive it — but only once the dialog is gone, since it swallows keystrokes.
      until(() => !SM.unsubscribeConfirm(), (gone) => {
        if (!gone) return toast('Unsubscribed, but the dialog stayed open');
        SM.rowKey('e');
        toast('Unsubscribed and archived');
      });
    });
  }

  function copyLink() {
    const url = SM.threadLink();
    if (url) navigator.clipboard.writeText(url).then(() => toast('Thread link copied'), () => toast('Copy failed'));
    else toast('No thread selected');
  }
  function openNewTab() {
    const url = SM.threadLink();
    if (url) window.open(url, '_blank');
    else toast('No thread selected');
  }

  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'all:initial;position:fixed;bottom:24px;left:24px;z-index:2147483647;' +
        'background:#202124;color:#e8eaed;padding:10px 14px;border-radius:8px;opacity:0;transition:opacity .15s;' +
        'font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 1600);
  }

  // ---- settings -----------------------------------------------------------
  function applySettings() {
    for (const k of ['hide-chat', 'hide-gemini', 'hide-tabs', 'dense'])
      document.documentElement.classList.toggle('sm-' + k, !!settings[k]);
  }
  function setSetting(k, v) {
    settings[k] = v;
    chrome.storage.local.set({ settings });
    applySettings();
    toast(`${k}: ${v ? 'on' : 'off'}`);
  }

  // ---- key handling -------------------------------------------------------
  // Listen on window/capture so we run before Gmail's own document-level handlers.
  let prefixAt = 0; // last time a Gmail sequence prefix (`g`, `*`) was pressed
  window.addEventListener('keydown', (e) => {
    if (e.__sm) return; // keys we synthesised for Gmail
    if (P.isOpen()) {
      e.stopImmediatePropagation(); // Gmail must not see anything typed into the palette
      const k = e.key;
      if (P.isSheet()) {
        const bound = keys[specOf(e)];
        if (k === 'Escape' || bound === 'shortcuts') { e.preventDefault(); P.close(); }
        else if (bound === 'palette') { e.preventDefault(); P.open(provider); } // sheet → palette
        return; // everything else falls through to the sheet itself (arrows scroll it)
      }
      if (k === 'Escape' || keys[specOf(e)] === 'palette') { e.preventDefault(); P.close(); }
      else if (k === 'Enter') { e.preventDefault(); P.run(); }
      else if (k === 'ArrowDown' || (e.ctrlKey && k === 'n')) { e.preventDefault(); P.move(1); }
      else if (k === 'ArrowUp' || (e.ctrlKey && k === 'p')) { e.preventDefault(); P.move(-1); }
      return;
    }

    const spec = specOf(e);
    const id = keys[spec];
    const editable = SM.isEditable(e.target);
    // Gmail has two-key sequences (`g l`, `* a`). If the previous key was a prefix, the key we
    // see now belongs to Gmail's sequence, not to us.
    const inSequence = Date.now() - prefixAt < 1500;
    if (!editable && !e.metaKey && !e.ctrlKey && !e.altKey)
      prefixAt = /^[g*]$/i.test(e.key) ? Date.now() : 0;
    if (id === 'palette') {
      const sel = document.getSelection();
      if (editable && sel && !sel.isCollapsed) return; // leave Cmd+K = insert link in compose
      e.preventDefault(); e.stopImmediatePropagation();
      P.open(provider);
      return;
    }
    if (!id || editable) return;
    if (NATIVE_FIX[spec] === id && (inSequence || SM.view() !== 'list-view')) return; // Gmail handles these itself there
    e.preventDefault(); e.stopImmediatePropagation();
    invoke(id);
  }, true);

  for (const type of ['keypress', 'keyup']) {
    window.addEventListener(type, (e) => {
      if (P.isOpen() && !e.__sm) e.stopImmediatePropagation();
    }, true);
  }

  chrome.storage.local.get(['settings', 'usage', 'keys'], (d) => {
    settings = { ...settings, ...(d.settings || {}) };
    usage = d.usage || {};
    keys = { ...DEFAULT_KEYS, ...NATIVE_FIX, ...(d.keys || {}) }; // user overrides win; edit via storage for now
    applySettings();
  });
  keys = { ...DEFAULT_KEYS, ...NATIVE_FIX };
})();
