'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LudoGame, GameError, sanitizeSettings, absOf, tableSizes, HOME, RAID } = require('../src/game');
const ai = require('../src/ai');

function rngFrom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A two-player game whose die comes from a script: game.rolls.push(6, 3, ...).
function scripted(ids = ['a', 'b'], settings = {}) {
  const rolls = [];
  const g = new LudoGame(ids, settings, { rng: rngFrom(5), now: () => 1000, die: () => rolls.shift() ?? 1 });
  g.rolls = rolls;
  const t = g.tables[0];
  t.turn = 0;
  t.players.sort();
  // a sits at red (seat 0), b at yellow (seat 2)
  t.seat = Object.fromEntries(t.players.map((id, i) => [id, [0, 2, 1, 3][i]]));
  return { g, t };
}

const throwsCode = (fn, code) => assert.throws(fn, err => err instanceof GameError && err.code === code);

test('settings are sanitized', () => {
  const s = sanitizeSettings({ target: 15, pieces: 7, quick: 0 });
  assert.equal(s.target, 15);
  assert.equal(s.pieces, 4);
  assert.equal(s.quick, false);
});

test('tables never seat more than 4 and stay even', () => {
  assert.deepEqual(tableSizes(2), [2]);
  assert.deepEqual(tableSizes(4), [4]);
  assert.deepEqual(tableSizes(5), [3, 2]);
  assert.deepEqual(tableSizes(8), [4, 4]);
  assert.deepEqual(tableSizes(9), [3, 3, 3]);
  assert.deepEqual(tableSizes(13), [4, 3, 3, 3]);
  const g = new LudoGame(Array.from({ length: 10 }, (_, i) => `p${i}`), {}, { rng: rngFrom(1) });
  assert.deepEqual(g.tables.map(t => t.players.length).sort(), [3, 3, 4]);
  assert.equal(new Set(g.tables.flatMap(t => t.players)).size, 10);
});

test('the shared track: each seat starts a quarter further on', () => {
  assert.equal(absOf(0, 0), 0);
  assert.equal(absOf(1, 0), 13);
  assert.equal(absOf(3, 20), 7);
  assert.equal(absOf(0, 51), null);
  assert.equal(absOf(0, -1), null);
});

test('a six brings a piece out and rolls again; no move passes the turn', () => {
  const { g, t } = scripted();
  g.rolls.push(3);
  g.roll('a');
  assert.equal(g.current(t), 'b'); // nothing out, no six
  g.rolls.push(6);
  g.roll('b'); // all pieces in the yard: one real choice, played by itself
  assert.equal(t.pieces.b[0], 0);
  assert.equal(g.current(t), 'b'); // six: again
  g.rolls.push(4);
  g.roll('b');
  assert.equal(t.pieces.b[0], 4);
  assert.equal(g.current(t), 'a');
});

test('choosing between pieces, and only legal ones', () => {
  const { g, t } = scripted();
  t.pieces.a = [5, -1, -1, -1];
  g.rolls.push(6);
  g.roll('a');
  assert.deepEqual(t.movable, [0, 1, 2, 3]);
  throwsCode(() => g.roll('a'), 'alreadyRolled');
  throwsCode(() => g.move('b', 0), 'notYourTurn');
  g.move('a', 0);
  assert.equal(t.pieces.a[0], 11);
  g.rolls.push(2);
  g.roll('a');
  assert.equal(t.pieces.a[0], 13); // the only piece out moved by itself
  throwsCode(() => g.move('a', 1), 'notYourTurn');
});

test('landing on an opponent sends them home and earns a roll; safe squares protect', () => {
  const { g, t } = scripted();
  // b (yellow, seat 2) at progress 4 = shared square 30; a (red) at progress 27 = square 27
  t.pieces.b = [4, -1, -1, -1];
  t.pieces.a = [27, -1, -1, -1];
  g.rolls.push(3);
  g.roll('a');
  assert.equal(t.pieces.b[0], -1);
  assert.equal(g.current(t), 'a');

  const s = scripted();
  // b on its own start (square 26, safe)
  s.t.pieces.b = [0, -1, -1, -1];
  s.t.pieces.a = [23, -1, -1, -1];
  s.g.rolls.push(3);
  s.g.roll('a');
  assert.equal(s.t.pieces.b[0], 0);
  assert.equal(s.g.current(s.t), 'b');
});

test('home needs an exact roll and earns another roll', () => {
  const { g, t } = scripted();
  t.pieces.a = [53, -1, -1, -1];
  g.rolls.push(5);
  g.roll('a');
  assert.equal(t.pieces.a[0], 53); // 58 overshoots
  assert.equal(g.current(t), 'b');
  g.rolls.push(1);
  g.roll('b');
  g.rolls.push(3);
  g.roll('a');
  assert.equal(t.pieces.a[0], HOME);
  assert.equal(g.current(t), 'a');
});

test('three sixes in a row lose the turn', () => {
  const { g, t } = scripted();
  t.pieces.a = [10, 20, -1, -1];
  g.rolls.push(6);
  g.roll('a');
  g.move('a', 0);
  g.rolls.push(6);
  g.roll('a');
  g.move('a', 0);
  g.rolls.push(6);
  g.roll('a');
  assert.equal(g.current(t), 'b');
  assert.equal(t.pieces.a[0], 22);
});

test('a quick round ends when someone gets every piece home; points go by place', () => {
  const { g, t } = scripted(['a', 'b'], { pieces: 2, target: 10 });
  t.pieces.a = [HOME, 54];
  t.pieces.b = [3, -1];
  g.rolls.push(2);
  g.roll('a');
  assert.equal(t.done, true);
  assert.deepEqual(t.places.map(p => [p.id, p.points]), [['a', 3], ['b', 0]]);
  assert.equal(g.phase, 'roundOver');
  assert.equal(g.scores.a, 3);
  throwsCode(() => g.roll('b'), 'roundIsOver');
  g.addPlayer('c');
  g.nextRound();
  assert.equal(g.phase, 'play');
  assert.equal(g.round, 2);
  assert.equal(g.tables[0].players.length, 3);
});

test('the first to the target when a round ends wins', () => {
  const { g, t } = scripted(['a', 'b'], { pieces: 2, target: 5 });
  g.scores.a = 4;
  t.pieces.a = [HOME, 55];
  g.rolls.push(1);
  g.roll('a');
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.winner, 'a');
});

test('re-seating mixes people up', () => {
  const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);
  const g = new LudoGame(ids, {}, { rng: rngFrom(9) });
  const first = g.tables.map(t => new Set(t.players));
  for (const t of g.tables) g.endTable(t);
  g.nextRound();
  // with 8 people at two tables of 4, nobody should face the exact same three again
  for (const t of g.tables) assert.ok(!first.some(s => t.players.every(p => s.has(p))));
});

test('someone leaving mid-round: the table carries on or ends', () => {
  const { g, t } = scripted(['a', 'b', 'c']);
  t.turn = t.players.indexOf('b');
  g.removePlayer('b');
  assert.equal(t.players.length, 2);
  assert.equal(g.current(t), 'c');
  g.removePlayer('c');
  assert.equal(t.done, true);
  assert.equal(g.phase, 'gameOver'); // one player left in the tournament
});

test('raid: roll exactly onto a piece in its home column to catch it', () => {
  const { g, t } = scripted();
  // a (red) at 22: yellow's lane starts after a's progress 24; b sits on its 2nd lane square
  t.pieces.a = [22, 10, -1, -1];
  t.pieces.b = [52, -1, -1, -1];
  g.rolls.push(4);
  g.roll('a');
  assert.deepEqual(t.movable, [0, 1]);
  assert.deepEqual(t.raids, [{ piece: 0, victim: 'b', victimPiece: 0 }]);
  throwsCode(() => g.move('a', 1, true), 'cantMove');
  g.move('a', 0, true);
  assert.equal(t.pieces.b[0], -1);
  assert.equal(t.pieces.a[0], RAID + 2 * 10 + 2);
  assert.equal(g.current(t), 'a'); // a capture: again
  const ev = g.events.find(e => e.type === 'move' && e.raid);
  assert.deepEqual(ev.path, [23, 24, RAID + 21, RAID + 22]);
});

test('raid is a choice: the piece can still just move on', () => {
  const { g, t } = scripted();
  t.pieces.a = [22, -1, -1, -1];
  t.pieces.b = [52, -1, -1, -1];
  g.rolls.push(4);
  g.roll('a');
  assert.equal(t.pieces.a[0], 22); // not played by itself
  g.move('a', 0);
  assert.equal(t.pieces.a[0], 26);
  assert.equal(t.pieces.b[0], 52);
  // already past the lane: no raid
  g.rolls.push(1);
  g.roll('b');
  g.rolls.push(2);
  g.roll('a');
  assert.deepEqual(t.raids, []);
});

test('a raider backs out one square per 6 or 1, then rejoins the track', () => {
  const { g, t } = scripted();
  t.pieces.a = [RAID + 22, -1, -1, -1];
  t.pieces.b = [10, -1, -1, -1];
  g.rolls.push(3);
  g.roll('a');
  assert.equal(t.pieces.a[0], RAID + 22); // stuck
  assert.equal(g.current(t), 'b');
  g.rolls.push(2);
  g.roll('b');
  g.rolls.push(1);
  g.roll('a');
  assert.equal(t.pieces.a[0], RAID + 21);
  g.rolls.push(2);
  g.roll('b');
  g.rolls.push(6);
  g.roll('a');
  g.move('a', 0); // a six could also bring a piece out
  assert.equal(t.pieces.a[0], 24); // out, on the square before yellow's lane
  assert.equal(g.current(t), 'a'); // six: again
  g.rolls.push(3);
  g.roll('a');
  assert.equal(t.pieces.a[0], 27);
});

test('the lane owner can catch a raider', () => {
  const { g, t } = scripted();
  t.turn = t.players.indexOf('b');
  t.pieces.a = [RAID + 23, -1, -1, -1];
  t.pieces.b = [51, -1, -1, -1];
  g.rolls.push(2);
  g.roll('b');
  assert.equal(t.pieces.b[0], 53);
  assert.equal(t.pieces.a[0], -1);
  assert.equal(g.current(t), 'b');
});

// Bots play whole tournaments: nothing may get stuck.
test('200 simulated tournaments finish', { timeout: 120000 }, () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = rngFrom(seed);
    const n = 2 + (seed % 11);
    const g = new LudoGame(Array.from({ length: n }, (_, i) => `p${i}`), { target: 5 + (seed % 3) * 5, pieces: 2 + (seed % 3), quick: seed % 4 !== 0 }, { rng });
    const orig = Math.random;
    Math.random = rng;
    try {
      for (let step = 0; step < 200000 && g.phase !== 'gameOver'; step++) {
        if (g.phase === 'roundOver') { g.nextRound(); continue; }
        const t = g.tables.find(x => !x.done);
        assert.ok(t, 'a round with every table done should be over');
        const pid = g.current(t);
        assert.ok(ai.act(g, pid), `stuck at table ${t.id}`);
        for (const x of g.tables) for (const id of x.players) for (const p of x.pieces[id]) assert.ok((p >= -1 && p <= HOME) || (p > RAID && p < RAID + 40));
      }
    } finally { Math.random = orig; }
    assert.equal(g.phase, 'gameOver', `seed ${seed} never ended`);
    assert.ok(g.scores[g.winner] >= g.settings.target);
  }
});
