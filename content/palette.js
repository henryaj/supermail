// Command bar UI. Shadow DOM so Gmail's stylesheet (and other extensions) can't touch it.
const SMP = (self.SM = self.SM || {});

SMP.Palette = (() => {
  let host, root, input, list, provide = () => [], items = [], sel = 0, prevFocus = null;

  const CSS = `
    .bg{position:fixed;inset:0;background:rgba(32,33,36,.32)}
    .box{position:fixed;left:50%;top:16vh;transform:translateX(-50%);width:min(620px,92vw);
      background:#fff;color:#202124;border-radius:12px;overflow:hidden;
      box-shadow:0 24px 64px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2);
      font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
    input{all:unset;box-sizing:border-box;display:block;width:100%;padding:15px 18px;font-size:16px;color:inherit}
    input::placeholder{color:#9aa0a6}
    .list{max-height:46vh;overflow-y:auto;border-top:1px solid #e8eaed}
    .row{display:flex;align-items:center;gap:10px;padding:8px 18px;cursor:default}
    .row.sel{background:#e8f0fe}
    .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sec{color:#80868b;font-size:12px;flex:none}
    kbd{font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#5f6368;background:#f1f3f4;
      border:1px solid #dadce0;border-bottom-width:2px;border-radius:4px;padding:3px 5px;flex:none}
    mark{background:none;color:#1a73e8;font-weight:600}
    .empty{padding:14px 18px;color:#80868b}
    @media (prefers-color-scheme:dark){
      .box{background:#202124;color:#e8eaed}
      .list{border-color:#3c4043}
      .row.sel{background:#37393c}
      kbd{color:#bdc1c6;background:#2d2f31;border-color:#5f6368}
      mark{color:#8ab4f8}
    }`;

  function ensure() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'sm-palette-host';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:none';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><div class="bg"></div><div class="box">` +
      `<input spellcheck="false" autocomplete="off" placeholder="Command…  (go &lt;label&gt; to jump, / &lt;query&gt; to search)">` +
      `<div class="list"></div></div>`;
    input = root.querySelector('input');
    list = root.querySelector('.list');
    root.querySelector('.bg').addEventListener('mousedown', close);
    input.addEventListener('input', render);
    list.addEventListener('mousemove', (e) => {
      const row = e.target.closest('.row');
      if (row && +row.dataset.i !== sel) { sel = +row.dataset.i; paint(); }
    });
    list.addEventListener('mousedown', (e) => {
      const row = e.target.closest('.row');
      if (row) { sel = +row.dataset.i; run(); }
    });
    document.documentElement.appendChild(host);
  }

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const mark = (text, pos) => {
    if (!pos || !pos.length) return esc(text);
    const set = new Set(pos);
    return [...text].map((ch, i) => set.has(i) ? '<mark>' + esc(ch) + '</mark>' : esc(ch)).join('');
  };

  function render() {
    items = provide(input.value) || [];
    sel = 0;
    list.innerHTML = items.length
      ? items.map((it, i) => `<div class="row" data-i="${i}"><span class="t">${mark(it.title, it.pos)}</span>` +
          (it.section ? `<span class="sec">${esc(it.section)}</span>` : '') +
          (it.hint ? `<kbd>${esc(it.hint)}</kbd>` : '') + `</div>`).join('')
      : '<div class="empty">No matches</div>';
    paint();
  }

  function paint() {
    const rows = list.querySelectorAll('.row');
    rows.forEach((r, i) => r.classList.toggle('sel', i === sel));
    rows[sel] && rows[sel].scrollIntoView({ block: 'nearest' });
  }

  function move(d) {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    paint();
  }

  function run() {
    const it = items[sel];
    close();
    if (it) setTimeout(() => it.run(), 0); // after focus is restored, so Gmail gets the keys
  }

  function open(provider) {
    ensure();
    provide = provider;
    prevFocus = document.activeElement;
    host.style.display = 'block';
    input.value = '';
    render();
    input.focus();
  }

  function close() {
    if (!host || host.style.display === 'none') return;
    host.style.display = 'none';
    if (prevFocus && prevFocus.isConnected) prevFocus.focus();
    else document.body.focus();
  }

  return { open, close, move, run, isOpen: () => !!host && host.style.display === 'block' };
})();
