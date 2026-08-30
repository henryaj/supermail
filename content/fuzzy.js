// fzf-lite: greedy subsequence match with consecutive / word-boundary bonuses.
// Returns {score, pos:[indices]} or null when the query isn't a subsequence.
function fuzzyScore(query, text) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const t = text.toLowerCase();
  if (!q) return { score: 0, pos: [] };
  if (q.length > t.length) return null;
  let score = 0, from = 0, prev = -2;
  const pos = [];
  for (const c of q) {
    const at = t.indexOf(c, from);
    if (at < 0) return null;
    let s = 1;
    if (at === prev + 1) s += 5;                       // consecutive run
    if (at === 0) s += 8;                              // start of string
    else if (/[\s\-_/:.(]/.test(t[at - 1])) s += 6;    // word boundary
    score += s;
    pos.push(at);
    prev = at;
    from = at + 1;
  }
  score -= pos[0] * 0.2;                 // prefer matches near the front
  score -= (t.length - q.length) * 0.05; // prefer tight targets
  return { score, pos };
}

if (typeof module !== 'undefined') module.exports = { fuzzyScore };
