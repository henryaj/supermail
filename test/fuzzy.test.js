const assert = require('assert');
const { fuzzyScore } = require('../content/fuzzy.js');

const s = (q, t) => { const r = fuzzyScore(q, t); return r ? r.score : -Infinity; };
const best = (q, ...opts) => opts.slice().sort((a, b) => s(q, b) - s(q, a))[0];

assert.strictEqual(fuzzyScore('zzz', 'Archive'), null, 'non-subsequence must not match');
assert.deepStrictEqual(fuzzyScore('', 'Archive'), { score: 0, pos: [] }, 'empty query matches everything');
assert.deepStrictEqual(fuzzyScore('arc', 'Archive').pos, [0, 1, 2], 'reports match positions');
assert.ok(s('arc', 'Archive') > s('arc', 'Mark read and archive'), 'prefix beats mid-string');
assert.strictEqual(best('ml', 'Mail settings', 'Mute label', 'Mark all as read'), 'Mute label', 'word-boundary initials win');
assert.strictEqual(s('ml', 'Mark as unread'), -Infinity, 'missing letter is no match');
assert.strictEqual(best('snd', 'Send', 'Go to Sent and drafts'), 'Send', 'consecutive run beats scattered');
assert.strictEqual(best('inbox', 'Go to Inbox', 'Go to Inbox and mark everything read'), 'Go to Inbox', 'tighter target wins');
assert.strictEqual(fuzzyScore('go in', 'Go to Inbox').pos.length, 4, 'spaces in query are ignored');

console.log('fuzzy: ok');
