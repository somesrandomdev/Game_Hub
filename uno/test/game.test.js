'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { UnoGame, GameError, buildDeck, cardPoints, sanitizeSettings, COLORS } = require('../src/game');
const { chooseMove, applyMove } = require('../src/ai');

function seeded(seed) {
  // mulberry32
  return function rng() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 1000;
const card = (color, value) => ({ id: nextId++, color, value });

// Build a game, then rig hands/top card for a deterministic scenario.
function rig({ players = ['a', 'b', 'c'], settings = {}, hands, top, color, turn = 0, direction = 1 }) {
  const g = new UnoGame(players, { targetScore: 0, ...settings }, { rng: seeded(1) });
  g.hands = {};
  for (const id of players) g.hands[id] = (hands[id] || []).slice();
  g.discard = [top];
  g.color = color || top.color;
  g.turn = turn;
  g.direction = direction;
  g.pending = { count: 0, type: null };
  g.challenge = null;
  g.drawn = null;
  g.unoSafe.clear();
  g.vulnerable.clear();
  g.phase = 'play';
  return g;
}

function totalCards(g) {
  return g.drawPile.length + g.discard.length + Object.values(g.hands).reduce((s, h) => s + h.length, 0);
}

test('deck has the standard 108 cards', () => {
  const deck = buildDeck();
  assert.equal(deck.length, 108);
  assert.equal(new Set(deck.map(c => c.id)).size, 108);
  assert.equal(deck.filter(c => c.value === 'wild4').length, 4);
  assert.equal(deck.filter(c => c.value === 'wild').length, 4);
  for (const col of COLORS) {
    const colored = deck.filter(c => c.color === col);
    assert.equal(colored.length, 25);
    assert.equal(colored.filter(c => c.value === '0').length, 1);
    assert.equal(colored.filter(c => c.value === 'skip').length, 2);
  }
});

test('card points', () => {
  assert.equal(cardPoints({ color: 'red', value: '7' }), 7);
  assert.equal(cardPoints({ color: 'red', value: 'skip' }), 20);
  assert.equal(cardPoints({ color: 'wild', value: 'wild4' }), 50);
});

test('settings are clamped and typed', () => {
  const s = sanitizeSettings({ startCards: 99, stacking: 'yes', turnTimer: -5, bogus: 1, targetScore: 'abc' });
  assert.equal(s.startCards, 15);
  assert.equal(s.stacking, true);
  assert.equal(s.turnTimer, 0);
  assert.equal(s.targetScore, 500);
  assert.equal('bogus' in s, false);
});

test('dealing gives everyone the starting hand and a non-wild top card', () => {
  for (let seed = 1; seed < 200; seed++) {
    const g = new UnoGame(['a', 'b', 'c', 'd'], { startCards: 7 }, { rng: seeded(seed) });
    assert.notEqual(g.top.color, 'wild');
    assert.equal(totalCards(g), 108);
    const counts = g.players.map(id => g.hands[id].length);
    // first card may have forced a draw2 onto the first player
    assert.ok(counts.every(c => c === 7 || c === 9));
  }
});

test('matching by color, by value, and wilds', () => {
  const g = rig({
    hands: { a: [card('red', '3'), card('blue', '5'), card('green', '9'), card('wild', 'wild')] },
    top: card('blue', '9'),
  });
  const playable = g.view('a').playable;
  const byId = Object.fromEntries(g.hands.a.map(c => [c.id, c]));
  const names = playable.map(id => `${byId[id].color} ${byId[id].value}`).sort();
  assert.deepEqual(names, ['blue 5', 'green 9', 'wild wild']);
  assert.throws(() => g.play('a', g.hands.a[0].id), GameError);
});

test('wild requires a color and sets it', () => {
  const w = card('wild', 'wild');
  const g = rig({ hands: { a: [w, card('red', '1')] }, top: card('blue', '2') });
  assert.throws(() => g.play('a', w.id), /color/);
  g.play('a', w.id, { color: 'green' });
  assert.equal(g.color, 'green');
  assert.equal(g.current, 'b');
});

test('skip skips the next player', () => {
  const s = card('red', 'skip');
  const g = rig({ hands: { a: [s, card('red', '1')], b: [card('red', '2')], c: [card('red', '3')] }, top: card('red', '5') });
  g.play('a', s.id);
  assert.equal(g.current, 'c');
});

test('reverse flips direction; acts like skip with two players', () => {
  const r = card('red', 'reverse');
  const g = rig({ hands: { a: [r, card('red', '1')], b: [card('red', '2')], c: [card('red', '3')] }, top: card('red', '5') });
  g.play('a', r.id);
  assert.equal(g.direction, -1);
  assert.equal(g.current, 'c');

  const r2 = card('red', 'reverse');
  const g2 = rig({ players: ['a', 'b'], hands: { a: [r2, card('red', '1')], b: [card('red', '2')] }, top: card('red', '5') });
  g2.play('a', r2.id);
  assert.equal(g2.current, 'a');
});

test('draw two makes the next player draw and lose their turn', () => {
  const d = card('red', 'draw2');
  const g = rig({ hands: { a: [d, card('red', '1')], b: [card('red', '2')], c: [card('red', '3')] }, top: card('red', '5') });
  g.play('a', d.id);
  assert.equal(g.hands.b.length, 3);
  assert.equal(g.current, 'c');
});

test('stacking passes the growing penalty along', () => {
  const d1 = card('red', 'draw2');
  const d2 = card('blue', 'draw2');
  const w4 = card('wild', 'wild4');
  const g = rig({
    settings: { stacking: true },
    hands: { a: [d1, card('red', '1')], b: [d2, card('green', '1')], c: [w4, card('green', '2')] },
    top: card('red', '5'),
  });
  g.play('a', d1.id);
  assert.deepEqual(g.pending, { count: 2, type: 'draw2' });
  assert.deepEqual(g.view('b').playable, [d2.id]);
  g.play('b', d2.id);
  g.play('c', w4.id, { color: 'yellow' });
  assert.deepEqual(g.pending, { count: 8, type: 'wild4' });
  assert.equal(g.current, 'a');
  assert.deepEqual(g.view('a').playable, []); // a +2 cannot go on a +4
  g.draw('a');
  assert.equal(g.hands.a.length, 9);
  assert.equal(g.current, 'b');
  assert.equal(g.pending.count, 0);
});

test('wild draw four challenge: guilty bluffer draws 4, challenger keeps the turn', () => {
  const w4 = card('wild', 'wild4');
  const g = rig({
    hands: { a: [w4, card('red', '1'), card('blue', '3')], b: [card('green', '2')], c: [card('green', '3')] },
    top: card('red', '5'),
  });
  g.play('a', w4.id, { color: 'blue' });
  assert.equal(g.current, 'b');
  assert.ok(g.view('b').canChallenge);
  g.challengeDraw4('b');
  assert.equal(g.hands.a.length, 6);
  assert.equal(g.hands.b.length, 1);
  assert.equal(g.current, 'b');
  assert.equal(g.color, 'blue');
});

test('wild draw four challenge: innocent player makes challenger draw 6', () => {
  const w4 = card('wild', 'wild4');
  const g = rig({
    hands: { a: [w4, card('blue', '1')], b: [card('green', '2')], c: [card('green', '3')] },
    top: card('red', '5'),
  });
  g.play('a', w4.id, { color: 'blue' });
  g.challengeDraw4('b');
  assert.equal(g.hands.b.length, 7);
  assert.equal(g.current, 'c');
});

test('accepting a wild draw four', () => {
  const w4 = card('wild', 'wild4');
  const g = rig({ hands: { a: [w4, card('blue', '1')], b: [card('green', '2')], c: [] }, top: card('red', '5') });
  g.play('a', w4.id, { color: 'blue' });
  g.draw('b');
  assert.equal(g.hands.b.length, 5);
  assert.equal(g.current, 'c');
});

test('forgetting UNO can be caught; calling it protects you', () => {
  const x = card('red', '1');
  const g = rig({ hands: { a: [x, card('red', '2')], b: [card('blue', '2')], c: [card('blue', '3')] }, top: card('red', '5') });
  g.play('a', x.id);
  assert.ok(g.view('b').players.find(p => p.id === 'a').vulnerable);
  g.catchUno('c', 'a');
  assert.equal(g.hands.a.length, 3);
  assert.throws(() => g.catchUno('c', 'a'), /Too late/);

  const y = card('red', '1');
  const g2 = rig({ hands: { a: [y, card('red', '2')], b: [card('blue', '2')], c: [] }, top: card('red', '5') });
  g2.callUno('a');
  g2.play('a', y.id);
  assert.equal(g2.vulnerable.size, 0);
  assert.throws(() => g2.catchUno('b', 'a'), /Too late/);
});

test('calling UNO after the fact still saves you if nobody caught you yet', () => {
  const x = card('red', '1');
  const g = rig({ hands: { a: [x, card('red', '2')], b: [card('blue', '2')], c: [] }, top: card('red', '5') });
  g.play('a', x.id);
  g.callUno('a');
  assert.throws(() => g.catchUno('b', 'a'), /Too late/);
});

test('the window to catch closes once the next player acts', () => {
  const x = card('red', '1');
  const g = rig({ hands: { a: [x, card('red', '2')], b: [card('red', '3'), card('red', '4')], c: [card('blue', '3')] }, top: card('red', '5') });
  g.play('a', x.id);
  g.play('b', g.hands.b[0].id);
  assert.throws(() => g.catchUno('c', 'a'), /Too late/);
});

test('drawing a playable card lets you play it or pass', () => {
  const g = rig({ hands: { a: [card('blue', '1')], b: [card('blue', '2')], c: [] }, top: card('red', '5') });
  const good = card('red', '9');
  g.drawPile = [card('green', '1'), good];
  g.draw('a');
  assert.equal(g.current, 'a');
  assert.deepEqual(g.view('a').playable, [good.id]);
  assert.throws(() => g.draw('a'), /drew/);
  g.pass('a');
  assert.equal(g.current, 'b');
});

test('drawing an unplayable card passes automatically', () => {
  const g = rig({ hands: { a: [card('blue', '1')], b: [card('blue', '2')], c: [] }, top: card('red', '5') });
  g.drawPile = [card('green', '1')];
  g.draw('a');
  assert.equal(g.current, 'b');
});

test('draw until playable keeps drawing', () => {
  const g = rig({ settings: { drawUntilPlayable: true }, hands: { a: [card('blue', '1')], b: [], c: [] }, top: card('red', '5') });
  const good = card('red', '2');
  g.drawPile = [good, card('green', '3'), card('green', '4')];
  g.draw('a');
  assert.equal(g.hands.a.length, 4);
  assert.equal(g.drawn, good.id);
});

test('forced play forbids passing a playable drawn card', () => {
  const g = rig({ settings: { forcePlay: true }, hands: { a: [card('blue', '1')], b: [card('blue', '1')], c: [] }, top: card('red', '5') });
  g.drawPile = [card('red', '2')];
  g.draw('a');
  assert.throws(() => g.pass('a'), /Forced/);
  assert.equal(g.view('a').canPass, false);
});

test('7-0 rule: seven swaps, zero rotates', () => {
  const seven = card('red', '7');
  const g = rig({
    settings: { sevenZero: true },
    hands: { a: [seven, card('red', '1')], b: [card('blue', '2'), card('blue', '3'), card('blue', '4')], c: [card('green', '1')] },
    top: card('red', '5'),
  });
  assert.throws(() => g.play('a', seven.id), /swap/);
  g.play('a', seven.id, { target: 'b' });
  assert.equal(g.hands.a.length, 3);
  assert.equal(g.hands.b.length, 1);
  assert.ok(g.unoSafe.has('b'));

  const zero = card('blue', '0');
  const ha = [zero, card('red', '1')];
  const hb = [card('blue', '2'), card('blue', '3')];
  const hc = [card('green', '1'), card('green', '2'), card('green', '3')];
  const g2 = rig({ settings: { sevenZero: true }, hands: { a: ha, b: hb, c: hc }, top: card('blue', '5') });
  const bIds = hb.map(c => c.id);
  const cIds = hc.map(c => c.id);
  g2.play('a', zero.id);
  assert.equal(g2.hands.b.length, 1); // a's remaining card moved to b
  assert.deepEqual(g2.hands.c.map(c => c.id), bIds);
  assert.deepEqual(g2.hands.a.map(c => c.id), cIds);
});

test('jump-in lets an identical card be played out of turn', () => {
  const twin = card('red', '5');
  const g = rig({
    settings: { jumpIn: true },
    hands: { a: [card('blue', '1')], b: [card('green', '1')], c: [twin, card('red', '9')] },
    top: card('red', '5'),
  });
  assert.deepEqual(g.view('c').playable, [twin.id]);
  g.play('c', twin.id);
  assert.equal(g.current, 'a'); // play continues from c
  const g2 = rig({ hands: { a: [card('blue', '1')], b: [], c: [card('red', '5')] }, top: card('red', '5') });
  assert.throws(() => g2.play('c', g2.hands.c[0].id), /Not your turn/);
});

test('going out scores the other hands and can end the game', () => {
  const last = card('red', '1');
  const g = rig({
    settings: { targetScore: 30 },
    hands: { a: [last], b: [card('blue', '9'), card('wild', 'wild')], c: [card('green', 'skip')] },
    top: card('red', '5'),
  });
  g.unoSafe.add('a');
  g.play('a', last.id);
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.scores.a, 79);
  assert.equal(g.roundResult.winner, 'a');
});

test('going out with a draw card still makes the next player draw', () => {
  const d = card('red', 'draw2');
  const g = rig({ settings: { targetScore: 500 }, hands: { a: [d], b: [card('blue', '9')], c: [] }, top: card('red', '5') });
  g.unoSafe.add('a');
  g.play('a', d.id);
  assert.equal(g.phase, 'roundOver');
  assert.equal(g.roundResult.hands.b.length, 3);
  g.nextRound();
  assert.equal(g.phase, 'play');
  assert.equal(g.round, 2);
});

test('the draw pile is rebuilt from the discard pile', () => {
  const g = rig({ hands: { a: [card('blue', '1')], b: [], c: [] }, top: card('red', '5') });
  g.drawPile = [];
  g.discard = [card('green', '1'), card('green', '2'), card('red', '5')];
  g.give('b', 2);
  assert.equal(g.hands.b.length, 2);
  assert.equal(g.discard.length, 1);
  assert.equal(g.top.value, '5');
});

test('players leaving mid-turn hand the turn on correctly', () => {
  const g = rig({ players: ['a', 'b', 'c', 'd'], hands: { a: [], b: [card('red', '1')], c: [], d: [] }, top: card('red', '5'), turn: 1 });
  g.removePlayer('b');
  assert.equal(g.current, 'c');
  const g2 = rig({ players: ['a', 'b', 'c', 'd'], hands: { a: [], b: [card('red', '1')], c: [], d: [] }, top: card('red', '5'), turn: 1, direction: -1 });
  g2.removePlayer('b');
  assert.equal(g2.current, 'a');
  const g3 = rig({ players: ['a', 'b', 'c'], hands: { a: [], b: [], c: [] }, top: card('red', '5'), turn: 2 });
  g3.removePlayer('a');
  assert.equal(g3.current, 'c');
  g3.removePlayer('b');
  assert.equal(g3.phase, 'gameOver');
});

test('views never leak other hands', () => {
  const g = new UnoGame(['a', 'b'], {}, { rng: seeded(5) });
  const v = g.view('a');
  assert.equal(v.hand.length > 0, true);
  const json = JSON.stringify(v);
  for (const c of g.hands.b) {
    assert.equal(json.includes(`"id":${c.id},`) && !g.hands.a.concat(g.discard).some(x => x.id === c.id) && !v.events.some(e => e.card && e.card.id === c.id), false);
  }
  assert.equal(g.view('spectator').hand, null);
});

test('randomized bot games keep every invariant', () => {
  const ruleSets = [
    {},
    { stacking: true },
    { drawUntilPlayable: true, forcePlay: true },
    { sevenZero: true, jumpIn: true },
    { stacking: true, sevenZero: true, jumpIn: true, drawUntilPlayable: true, challenge: false },
    { startCards: 15, challenge: true },
  ];
  let games = 0;
  let rounds = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed);
    const n = 2 + (seed % 9);
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const settings = { ...ruleSets[seed % ruleSets.length], targetScore: seed % 3 === 0 ? 0 : 200 };
    const g = new UnoGame(ids, settings, { rng });
    let steps = 0;
    while (g.phase !== 'gameOver') {
      assert.ok(++steps < 50000, `game ${seed} did not finish`);
      if (g.phase === 'roundOver') { rounds++; g.nextRound(); continue; }
      // random UNO chatter
      const r = rng();
      if (r < 0.05) {
        const someone = g.players[Math.floor(rng() * g.players.length)];
        if (g.hands[someone].length <= 2) g.callUno(someone);
      } else if (r < 0.08 && g.vulnerable.size) {
        const [target] = g.vulnerable.keys();
        const catcher = g.players.find(id => id !== target);
        g.catchUno(catcher, target);
      } else if (r < 0.1 && g.settings.jumpIn) {
        for (const id of g.players) {
          const c = g.hands[id].find(x => id !== g.current && g.canJumpIn(id, x));
          if (c) { g.play(id, c.id, { target: g.players.find(x => x !== id) }); break; }
        }
      } else {
        applyMove(g, g.current, chooseMove(g, g.current, rng));
      }
      assert.equal(totalCards(g), 108, `card count broke in game ${seed}`);
      const all = [...g.drawPile, ...g.discard, ...Object.values(g.hands).flat()].map(c => c.id);
      assert.equal(new Set(all).size, 108, `duplicate card in game ${seed}`);
      assert.ok(g.turn >= 0 && g.turn < g.players.length);
      assert.ok(COLORS.includes(g.color));
      assert.ok(g.pending.count >= 0);
      if (g.phase === 'play' && !g.settings.stacking && !g.challenge) assert.equal(g.pending.count, 0);
    }
    games++;
    const winner = Object.entries(g.scores).sort((x, y) => y[1] - x[1])[0];
    assert.ok(g.settings.targetScore === 0 || winner[1] >= g.settings.targetScore);
  }
  assert.equal(games, 300);
  assert.ok(rounds > 0);
});
