'use strict';

// Pure UNO rules engine. No I/O: the server feeds it actions and broadcasts views.

const COLORS = ['red', 'yellow', 'green', 'blue'];
const DARK_COLORS = ['pink', 'teal', 'orange', 'purple'];
const ACTIONS = ['skip', 'reverse', 'draw2'];

// UNO Flip: every card has a light and a dark face. Cards are stored with the face in
// play as { color, value } and the other face as `back`; a Flip card swaps them all.
const LIGHT_ACTIONS = ['draw1', 'reverse', 'skip', 'flip'];
const DARK_ACTIONS = ['draw5', 'reverse', 'skipAll', 'flip'];
// how many cards each draw card deals ('color' = until the chosen color turns up)
const DRAWS = { draw1: 1, draw2: 2, wild2: 2, wild4: 4, draw5: 5, wildColor: 'color' };
const WILD_DRAWS = new Set(['wild4', 'wild2', 'wildColor']);
const POINTS = { draw1: 10, draw2: 20, reverse: 20, skip: 20, flip: 20, draw5: 20, skipAll: 30, wild4: 50, wild2: 50, wildColor: 60 };

const DEFAULT_SETTINGS = Object.freeze({
  startCards: 7,
  targetScore: 500,        // 0 = a single round decides the game
  stacking: false,         // +2 / +4 can be stacked onto a pending draw
  drawUntilPlayable: false,
  forcePlay: false,        // a playable drawn card must be played
  sevenZero: false,        // 7 swaps hands with a chosen player, 0 rotates every hand
  jumpIn: false,           // an identical card may be played out of turn
  multiPlay: true,         // cards of the same number/symbol may be played together, any colors
  lastStanding: true,      // the round goes on until only one player still holds cards
  challenge: true,         // a Wild Draw Four may be challenged
  unoLastCard: false,      // UNO can only be called once you're actually down to one card
  unoPenalty: 2,
  turnTimer: 0,            // seconds, 0 = off
  flip: false,             // UNO Flip: light and dark sides, Flip cards turn everything over
  challengeColor: false,   // UNO Flip: a Wild Draw Color may be challenged too
  bonuses: true,           // bonus points: catching, combos, going out on an action card, win streaks
});

const LIMITS = {
  startCards: [3, 15],
  targetScore: [0, 5000],
  unoPenalty: [1, 6],
  turnTimer: [0, 300],
};

// Round points don't grow with the size of the table, so a game to 500 lasts about as
// many rounds with 3 players as with 10.
// Last standing: 100 for going out first, 0 for the last one holding cards, the places in
// between spread evenly (rounded to 5).
const placePoints = (place, players) => (players < 2 ? 0 : Math.round((20 * (players - place)) / (players - 1)) * 5);

// Bonus points (the `bonuses` setting)
const BONUS = {
  catch: 10,        // catching someone who forgot UNO
  comboCard: 5,     // per card when playing 3 or more at once
  finish: 20,       // going out on an action card or a wild
  streak: 10,       // per round won in a row after the first, up to 30
};

const { GameError } = require('./messages');

function sanitizeSettings(input, base = DEFAULT_SETTINGS) {
  const out = { ...DEFAULT_SETTINGS, ...base };
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!(key in input)) continue;
    if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
      out[key] = Boolean(input[key]);
    } else {
      const n = Math.round(Number(input[key]));
      if (!Number.isFinite(n)) continue;
      const [lo, hi] = LIMITS[key];
      out[key] = Math.min(hi, Math.max(lo, n));
    }
  }
  return out;
}

function buildDeck() {
  const deck = [];
  let id = 0;
  const add = (color, value) => deck.push({ id: id++, color, value });
  for (const color of COLORS) {
    add(color, '0');
    for (let n = 1; n <= 9; n++) { add(color, String(n)); add(color, String(n)); }
    for (const a of ACTIONS) { add(color, a); add(color, a); }
  }
  for (let i = 0; i < 4; i++) { add('wild', 'wild'); add('wild', 'wild4'); }
  return deck;
}

function buildFlipDeck(rng = Math.random) {
  const faces = (colors, actions, wild, wildDraw) => {
    const out = [];
    for (const color of colors) {
      for (let n = 1; n <= 9; n++) out.push({ color, value: String(n) }, { color, value: String(n) });
      for (const a of actions) out.push({ color, value: a }, { color, value: a });
    }
    for (let i = 0; i < 4; i++) out.push({ color: 'wild', value: wild }, { color: 'wild', value: wildDraw });
    return out;
  };
  const light = faces(COLORS, LIGHT_ACTIONS, 'wild', 'wild2');
  const dark = shuffle(faces(DARK_COLORS, DARK_ACTIONS, 'wild', 'wildColor'), rng);
  return light.map((f, id) => ({ id, ...f, back: dark[id] }));
}

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardPoints(card, flip = false) {
  if (card.value === 'wild') return flip ? 40 : 50;
  return POINTS[card.value] ?? Number(card.value);
}

// What everyone may see of a card: the face in play, never the other side.
const face = c => (c ? { id: c.id, color: c.color, value: c.value } : c);
const isDraw = v => v in DRAWS;

class UnoGame {
  constructor(playerIds, settings = {}, { rng = Math.random, now = Date.now } = {}) {
    if (!Array.isArray(playerIds) || playerIds.length < 2) throw new GameError('needTwoPlayers');
    this.rng = rng;
    this.now = now;
    this.id = Math.floor(rng() * 1e9).toString(36) + now().toString(36);
    this.settings = sanitizeSettings(settings);
    this.players = [...playerIds];
    this.scores = Object.fromEntries(this.players.map(id => [id, 0]));
    this.round = 0;
    this.dealer = Math.floor(rng() * this.players.length);
    this.events = [];
    this.seq = 0;
    this.roundResult = null;
    this.streak = { player: null, count: 0 };
    this.startRound();
  }

  // ---------- helpers ----------

  get current() { return this.players[this.turn]; }
  get top() { return this.discard[this.discard.length - 1]; }

  isOut(pid) { return this.finished.includes(pid); }
  get colors() { return this.side === 'dark' ? DARK_COLORS : COLORS; }
  get active() { return this.players.filter(id => !this.isOut(id)); }

  // Players who already went out (last-standing) are stepped over.
  nextIndex(steps = 1) {
    const n = this.players.length;
    const dir = this.direction * Math.sign(steps);
    let i = this.turn;
    for (let s = 0; s < Math.abs(steps); s++) {
      let guard = n;
      do { i = (((i + dir) % n) + n) % n; } while (this.isOut(this.players[i]) && --guard > 0);
    }
    return i;
  }

  // Could this hand get down to one card in a single play?
  nearUno(hand) {
    if (this.settings.unoLastCard) return hand.length === 1;
    if (hand.length <= 2) return true;
    if (!this.settings.multiPlay) return false;
    const groups = {};
    for (const c of hand) groups[c.value] = (groups[c.value] || 0) + 1;
    return Math.max(...Object.values(groups)) >= hand.length - 1;
  }

  emit(type, data = {}) {
    this.events.push({ seq: ++this.seq, type, ...data });
    if (this.events.length > 40) this.events.shift();
  }

  touchTurn() { this.turnStartedAt = this.now(); }

  advance(steps) {
    this.turn = this.nextIndex(steps);
    this.touchTurn();
  }

  drawOne() {
    if (!this.drawPile.length) {
      if (this.discard.length <= 1) return null;
      const top = this.discard.pop();
      this.drawPile = shuffle(this.discard, this.rng);
      this.discard = [top];
      this.emit('reshuffle');
    }
    return this.drawPile.pop();
  }

  give(pid, count, reason = 'draw') {
    const got = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawOne();
      if (!card) break;
      this.hands[pid].push(card);
      got.push(card);
    }
    this.unoSafe.delete(pid);
    this.vulnerable.delete(pid);
    if (got.length) this.emit('draw', { player: pid, count: got.length, reason });
    return got;
  }

  // Wild Draw Color: keep drawing until a card of that color turns up.
  giveUntil(pid, color, reason) {
    let n = 0;
    for (;;) {
      const card = this.drawOne();
      if (!card) break;
      this.hands[pid].push(card);
      n++;
      if (card.color === color) break;
    }
    this.unoSafe.delete(pid);
    this.vulnerable.delete(pid);
    if (n) this.emit('draw', { player: pid, count: n, reason });
  }

  // Deal out a draw penalty ({ count, type, color }), plus `extra` cards on top.
  givePenalty(pid, penalty, reason, extra = 0) {
    if (penalty.type === 'wildColor') {
      this.giveUntil(pid, penalty.color, reason);
      if (extra) this.give(pid, extra, reason);
    } else this.give(pid, penalty.count + extra, reason);
  }

  // Flip: every card in the game turns over. A wild landing on top takes `color`.
  flipAll(color) {
    this.side = this.side === 'dark' ? 'light' : 'dark';
    const turn = c => {
      const { back } = c;
      c.back = { color: c.color, value: c.value };
      c.color = back.color;
      c.value = back.value;
    };
    this.drawPile.forEach(turn);
    this.discard.forEach(turn);
    for (const hand of Object.values(this.hands)) hand.forEach(turn);
    this.color = this.top.color === 'wild' ? color : this.top.color;
    this.emit('flip', { side: this.side, card: face(this.top), color: this.color });
  }

  // After hands move around wholesale (7-0 rule) nobody gets punished for the surprise.
  settleUno(pid) {
    const len = this.hands[pid].length;
    this.vulnerable.delete(pid);
    if (len === 1) this.unoSafe.add(pid);
    else if (len > 2) this.unoSafe.delete(pid);
  }

  matches(card) {
    return card.color === 'wild' || card.color === this.color || card.value === this.top.value;
  }

  assertPlaying() {
    if (this.phase !== 'play') throw new GameError('roundIsOver');
  }

  assertTurn(pid) {
    this.assertPlaying();
    if (!this.hands[pid]) throw new GameError('notInGame');
    if (pid !== this.current) throw new GameError('notYourTurn');
  }

  // ---------- rounds ----------

  startRound() {
    const n = this.players.length;
    this.round++;
    this.side = 'light';
    this.drawPile = shuffle(this.settings.flip ? buildFlipDeck(this.rng) : buildDeck(), this.rng);
    this.discard = [];
    this.hands = {};
    for (const id of this.players) this.hands[id] = [];
    // keep at least ~20 cards in the draw pile even with 10 players
    const deal = Math.min(this.settings.startCards, Math.floor(88 / n));
    for (let i = 0; i < deal; i++) {
      for (const id of this.players) this.hands[id].push(this.drawPile.pop());
    }
    let first = this.drawPile.pop();
    while (first.color === 'wild' || first.value === 'flip') {
      // bury it somewhere below the top and flip again
      this.drawPile.splice(Math.floor(this.rng() * this.drawPile.length), 0, first);
      first = this.drawPile.pop();
    }
    this.discard.push(first);
    this.color = first.color;
    this.direction = 1;
    this.turn = (this.dealer + 1) % n;
    this.pending = { count: 0, type: null };
    this.challenge = null;
    this.drawn = null;
    this.unoSafe = new Set();
    this.vulnerable = new Map(); // pid -> seq when they became catchable
    this.finished = [];          // last-standing: players who went out, in order
    this.awarded = {};
    this.bonuses = {};           // pid -> [{ kind, points }] earned this round
    this.phase = 'play';
    this.roundResult = null;
    this.touchTurn();
    this.emit('roundStart', { round: this.round, dealer: this.players[this.dealer], card: face(first) });

    if (first.value === 'skip' || (first.value === 'reverse' && n === 2)) {
      this.emit('skip', { player: this.current });
      this.advance(1);
    } else if (first.value === 'reverse') {
      this.direction = -1;
      this.turn = this.dealer;
      this.emit('reverse', { direction: -1 });
    } else if (isDraw(first.value)) {
      this.give(this.current, DRAWS[first.value], first.value);
      this.emit('skip', { player: this.current });
      this.advance(1);
    }
  }

  addBonus(pid, kind, points) {
    if (!this.settings.bonuses || !points || !(pid in this.scores)) return;
    this.scores[pid] += points;
    (this.bonuses[pid] ||= []).push({ kind, points });
    this.emit('bonus', { player: pid, kind, points });
  }

  // Last-standing: the player (already in this.finished) sits out the rest of the round.
  finish(pid) {
    const points = placePoints(this.finished.length, this.players.length);
    this.awarded[pid] = points;
    this.scores[pid] += points;
    this.unoSafe.delete(pid);
    this.vulnerable.delete(pid);
    this.emit('finished', { player: pid, place: this.finished.length, points });
    if (this.active.length <= 1) this.endRound(this.finished[0]);
  }

  endRound(winner) {
    const hands = {};
    for (const id of this.players) hands[id] = this.hands[id].map(face);
    let loser = null;
    if (this.settings.lastStanding) {
      loser = this.active[0] ?? null;
    } else {
      // the cards left in the other hands, divided by the square root of the number of
      // opponents: the official rule with 2 players, and a big table no longer hands out a
      // game-winning pile (a game to 500 takes about as many rounds at any table size)
      let total = 0;
      for (const id of this.players) {
        if (id !== winner) total += this.hands[id].reduce((sum, c) => sum + cardPoints(c, this.settings.flip), 0);
      }
      const points = Math.round(total / Math.sqrt(Math.max(1, this.players.length - 1)));
      this.scores[winner] += points;
      this.awarded = { [winner]: points };
    }
    // winning rounds back to back
    this.streak = this.streak.player === winner ? { player: winner, count: this.streak.count + 1 } : { player: winner, count: 1 };
    if (this.streak.count > 1) this.addBonus(winner, 'streak', Math.min(3, this.streak.count - 1) * BONUS.streak);
    const points = this.awarded[winner] ?? 0;
    const target = this.settings.targetScore;
    const gameOver = target === 0 || Math.max(...Object.values(this.scores)) >= target;
    this.phase = gameOver ? 'gameOver' : 'roundOver';
    this.pending = { count: 0, type: null };
    this.challenge = null;
    this.drawn = null;
    this.vulnerable.clear();
    const ranking = loser ? [...this.finished, loser] : null;
    this.roundResult = { winner, loser, points, awarded: { ...this.awarded }, bonuses: { ...this.bonuses }, ranking, hands, scores: { ...this.scores }, gameOver, streak: this.streak.count };
    this.emit('roundOver', { winner, loser, points, gameOver });
  }

  nextRound() {
    if (this.phase !== 'roundOver') throw new GameError('roundNotOver');
    if (this.players.length < 2) throw new GameError('needTwoPlayers');
    this.dealer = (this.dealer + 1) % this.players.length;
    this.startRound();
  }

  addPlayer(pid) {
    if (this.phase === 'play') throw new GameError('waitRoundEnd');
    if (this.players.includes(pid)) return;
    this.players.push(pid);
    this.scores[pid] = 0;
    this.hands[pid] = [];
  }

  removePlayer(pid) {
    const idx = this.players.indexOf(pid);
    if (idx < 0) return;
    const wasCurrent = this.phase === 'play' && idx === this.turn;
    this.drawPile.unshift(...(this.hands[pid] || []));
    delete this.hands[pid];
    delete this.scores[pid];
    delete this.awarded[pid];
    delete this.bonuses[pid];
    this.finished = this.finished.filter(id => id !== pid);
    this.players.splice(idx, 1);
    this.unoSafe.delete(pid);
    this.vulnerable.delete(pid);
    const n = this.players.length;
    if (idx < this.dealer) this.dealer--;
    if (this.dealer >= n) this.dealer = 0;
    this.emit('leave', { player: pid });

    if (n < 2) {
      // between rounds too: with one player left there is no next round to deal
      if (this.phase !== 'gameOver') {
        this.phase = 'gameOver';
        this.roundResult = null;
        this.emit('abandoned');
      }
      this.turn = 0;
      return;
    }
    // The bluffer left: the victim still has to eat the +4 (pending stays), but nothing to challenge.
    if (this.challenge && this.challenge.offender === pid) this.challenge = null;

    if (idx < this.turn) this.turn--;
    else if (wasCurrent) {
      this.turn = this.direction === 1 ? idx % n : (idx - 1 + n) % n;
      this.drawn = null;
      this.challenge = null;
      this.pending = { count: 0, type: null };
      this.touchTurn();
    }
    if (this.turn >= n) this.turn = 0;
    if (this.phase !== 'play') return;
    if (this.isOut(this.current)) this.turn = this.nextIndex(1);
    // (with 2+ players left, someone has already gone out)
    if (this.active.length < 2) this.endRound(this.finished[0]);
  }

  // ---------- rules ----------

  canPlay(pid, card) {
    if (this.phase !== 'play' || !this.hands[pid]) return false;
    if (pid !== this.current) return this.canJumpIn(pid, card);
    if (this.drawn !== null) return card.id === this.drawn;
    if (this.pending.count > 0) {
      const type = this.pending.type;
      if (!this.settings.stacking || type === 'wildColor') return false;
      // the same draw card, or a wild draw on top of a colored one
      return card.value === type || (!WILD_DRAWS.has(type) && (card.value === 'wild4' || card.value === 'wild2'));
    }
    return this.matches(card);
  }

  canJumpIn(pid, card) {
    if (!this.settings.jumpIn || this.phase !== 'play' || this.pending.count > 0 || this.challenge) return false;
    if (!this.hands[pid] || card.color === 'wild') return false;
    const top = this.top;
    return card.color === top.color && card.value === top.value;
  }

  // cardIds: one id, or several cards of the same number/symbol (multiPlay). The first
  // one must be playable; the last one ends up on top and sets the color.
  play(pid, cardIds, opts = {}) {
    this.assertPlaying();
    const hand = this.hands[pid];
    if (!hand) throw new GameError('notInGame');
    const ids = [...new Set([].concat(cardIds).map(Number))];
    const cards = ids.map(id => hand.find(c => c.id === id));
    if (!cards.length || cards.some(c => !c)) throw new GameError('noCard');
    const card = cards[0];
    const jumpIn = pid !== this.current;
    if (!this.canPlay(pid, card)) {
      if (jumpIn) throw new GameError('notYourTurn');
      if (this.drawn !== null) throw new GameError('onlyDrawn');
      if (this.pending.count > 0) throw new GameError('stackOrTake', { count: this.pending.count });
      throw new GameError('noMatch');
    }
    if (cards.length > 1) {
      if (!this.settings.multiPlay) throw new GameError('oneCardOnly');
      if (cards.some(c => c.value !== card.value)) throw new GameError('sameValueOnly');
    }

    const last = cards[cards.length - 1];
    let chosen = last.color;
    if (last.color === 'wild') {
      if (!this.colors.includes(opts.color)) throw new GameError('pickColor', { colors: this.colors });
      chosen = opts.color;
    }
    // an odd number of Flips turns the table over; if a wild comes up, the player picks its color
    const flips = card.value === 'flip' && cards.length % 2 === 1;
    if (flips && last.back.color === 'wild') {
      const next = this.side === 'dark' ? COLORS : DARK_COLORS;
      if (!next.includes(opts.flipColor)) throw new GameError('pickColor', { colors: next, flip: true });
    }
    const swap = this.settings.sevenZero && card.value === '7' && hand.length > cards.length;
    if (swap && (opts.target === pid || !this.hands[opts.target] || this.isOut(opts.target))) {
      throw new GameError('pickTarget');
    }

    const prevColor = this.color;
    const guilty = WILD_DRAWS.has(card.value) && hand.some(c => !ids.includes(c.id) && c.color === prevColor);
    const duel = this.active.length === 2;

    this.vulnerable.clear();
    if (jumpIn) {
      this.turn = this.players.indexOf(pid);
      this.emit('jumpIn', { player: pid });
    }
    this.drawn = null;
    this.challenge = null;
    for (const c of cards) {
      hand.splice(hand.indexOf(c), 1);
      this.discard.push(c);
      this.emit('play', { player: pid, card: face(c), color: c.color === 'wild' ? chosen : c.color });
    }
    this.color = chosen;

    if (hand.length === 1 && !this.unoSafe.has(pid)) {
      // UNO called together with the play (pressed before / with the cards)
      if (opts.uno) {
        this.unoSafe.add(pid);
        this.emit('uno', { player: pid });
      } else this.vulnerable.set(pid, this.seq);
    }
    const out = hand.length === 0;
    const leaving = out && this.settings.lastStanding;
    if (cards.length >= 3) this.addBonus(pid, 'combo', cards.length * BONUS.comboCard);
    if (out && isNaN(Number(last.value))) this.addBonus(pid, 'finish', BONUS.finish);
    if (leaving) this.finished.push(pid);
    const n = cards.length;

    switch (card.value) {
      case 'skip':
        this.skipNext(n);
        break;
      case 'reverse':
        if (duel) this.skipNext(n);
        else {
          if (n % 2) this.direction *= -1;
          this.emit('reverse', { direction: this.direction });
          this.advance(1);
        }
        break;
      case 'draw1':
      case 'draw2':
      case 'draw5':
        this.applyDraw({ count: DRAWS[card.value] * n, type: card.value }, { out });
        break;
      case 'wild4':
      case 'wild2':
        this.applyDraw({ count: DRAWS[card.value] * n, type: card.value }, { out, offender: pid, guilty });
        break;
      case 'wildColor':
        this.applyDraw({ count: 1, type: 'wildColor', color: chosen }, { out, offender: pid, guilty });
        break;
      case 'skipAll':
        // everyone else is skipped: the same player goes again
        for (const id of this.active) if (id !== pid) this.emit('skip', { player: id });
        if (leaving) this.advance(1);
        else this.touchTurn();
        break;
      case 'flip':
        if (flips) this.flipAll(opts.flipColor);
        this.advance(1);
        break;
      case '7':
        if (swap) this.swapHands(pid, opts.target);
        this.advance(1);
        break;
      case '0':
        if (this.settings.sevenZero && !out) this.rotateHands();
        this.advance(1);
        break;
      default:
        this.advance(1);
    }

    if (leaving) this.finish(pid);
    else if (out) this.endRound(pid);
  }

  skipNext(count) {
    for (let i = 1; i <= count; i++) this.emit('skip', { player: this.players[this.nextIndex(i)] });
    this.advance(count + 1);
  }

  // penalty: { count, type }, or { count: 1, type: 'wildColor', color } for Wild Draw Color
  applyDraw(penalty, { out, offender, guilty }) {
    const victim = this.players[this.nextIndex(1)];
    const { type } = penalty;
    if (type !== 'wildColor') penalty = { count: this.pending.count + penalty.count, type };
    if (out) {
      // last card: whatever is stacked lands on the victim immediately
      this.pending = { count: 0, type: null };
      this.givePenalty(victim, penalty, type);
      this.advance(2);
      return;
    }
    if (this.settings.stacking && type !== 'wildColor') {
      this.pending = penalty;
      this.advance(1);
      return;
    }
    if (WILD_DRAWS.has(type) && this.settings.challenge && (type !== 'wildColor' || this.settings.challengeColor)) {
      this.pending = penalty;
      this.challenge = { offender, victim, guilty };
      this.advance(1);
      return;
    }
    this.givePenalty(victim, penalty, type);
    this.emit('skip', { player: victim });
    this.advance(2);
  }

  swapHands(a, b) {
    [this.hands[a], this.hands[b]] = [this.hands[b], this.hands[a]];
    this.settleUno(a);
    this.settleUno(b);
    this.emit('swap', { player: a, target: b });
  }

  rotateHands() {
    const ids = this.active;
    const n = ids.length;
    const old = ids.map(id => this.hands[id]);
    ids.forEach((id, i) => {
      this.hands[id] = old[(((i - this.direction) % n) + n) % n];
    });
    for (const id of ids) this.settleUno(id);
    this.emit('rotate', { direction: this.direction });
  }

  draw(pid) {
    this.assertTurn(pid);
    if (this.drawn !== null) throw new GameError('playOrPass');
    this.vulnerable.clear();

    if (this.pending.count > 0) {
      const penalty = this.pending;
      this.pending = { count: 0, type: null };
      this.challenge = null;
      this.givePenalty(pid, penalty, penalty.type);
      this.emit('skip', { player: pid });
      this.advance(1);
      return;
    }

    const hand = this.hands[pid];
    let last = null;
    let drew = 0;
    do {
      last = this.drawOne();
      if (!last) break;
      hand.push(last);
      drew++;
    } while (this.settings.drawUntilPlayable && !this.matches(last));
    if (drew) {
      this.unoSafe.delete(pid);
      this.emit('draw', { player: pid, count: drew, reason: 'draw' });
    }

    if (last && this.matches(last)) {
      this.drawn = last.id;
    } else {
      this.emit('pass', { player: pid });
      this.advance(1);
    }
  }

  pass(pid) {
    this.assertTurn(pid);
    if (this.drawn === null) throw new GameError('drawFirst');
    if (this.settings.forcePlay) throw new GameError('forcedPlay');
    this.vulnerable.clear();
    this.drawn = null;
    this.emit('pass', { player: pid });
    this.advance(1);
  }

  challengeDraw4(pid) {
    this.assertTurn(pid);
    if (!this.challenge) throw new GameError('nothingToChallenge');
    const { offender, guilty } = this.challenge;
    const penalty = this.pending;
    this.challenge = null;
    this.pending = { count: 0, type: null };
    this.vulnerable.clear();
    this.emit('challenge', { player: pid, target: offender, success: guilty });
    if (guilty) {
      this.givePenalty(offender, penalty, 'challenge');
      this.touchTurn(); // challenger now plays normally
    } else {
      this.givePenalty(pid, penalty, 'challenge', 2);
      this.emit('skip', { player: pid });
      this.advance(1);
    }
  }

  callUno(pid) {
    this.assertPlaying();
    const hand = this.hands[pid];
    if (!hand) throw new GameError('notInGame');
    if (!this.nearUno(hand)) throw new GameError('unoTooMany');
    if (this.unoSafe.has(pid) && !this.vulnerable.has(pid)) return false;
    this.unoSafe.add(pid);
    this.vulnerable.delete(pid);
    this.emit('uno', { player: pid });
    return true;
  }

  catchUno(pid, target) {
    this.assertPlaying();
    if (!this.hands[pid]) throw new GameError('notInGame');
    if (pid === target) throw new GameError('catchSelf');
    if (!this.vulnerable.has(target)) throw new GameError('tooLate');
    this.vulnerable.delete(target);
    this.emit('caught', { player: target, by: pid });
    this.give(target, this.settings.unoPenalty, 'caught');
    this.addBonus(pid, 'catch', BONUS.catch);
  }

  // ---------- views ----------

  view(pid) {
    const inGame = Boolean(this.hands[pid]) && this.players.includes(pid);
    const myTurn = inGame && this.phase === 'play' && this.current === pid;
    const hand = inGame ? this.hands[pid] : null;
    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      players: this.players.map(id => ({
        id,
        count: this.hands[id]?.length ?? 0,
        score: this.scores[id] ?? 0,
        uno: this.unoSafe.has(id) && (this.hands[id]?.length ?? 0) === 1,
        vulnerable: this.vulnerable.has(id),
        place: this.finished.indexOf(id) + 1,
        roundPoints: this.awarded[id] ?? 0,
        bonus: (this.bonuses[id] || []).reduce((s, b) => s + b.points, 0),
        // UNO Flip: the other side of everyone else's cards faces the table
        backs: this.settings.flip && id !== pid ? (this.hands[id] || []).map(c => c.back) : undefined,
      })),
      hand: hand ? hand.map(face) : null,
      playable: hand ? hand.filter(c => this.canPlay(pid, c)).map(c => c.id) : [],
      safe: this.unoSafe.has(pid),
      canUno: Boolean(hand && hand.length && this.phase === 'play' && this.nearUno(hand)),
      top: face(this.top),
      recent: this.discard.slice(-4).map(face),
      color: this.color,
      side: this.side,
      colors: this.colors,
      // the draw pile lies face down, so its top card shows its other side
      drawBack: this.settings.flip && this.drawPile.length ? this.drawPile[this.drawPile.length - 1].back : null,
      direction: this.direction,
      current: this.phase === 'play' ? this.current : null,
      dealer: this.players[this.dealer],
      pending: this.pending,
      drawn: myTurn ? this.drawn : null,
      canDraw: myTurn && this.drawn === null,
      canPass: myTurn && this.drawn !== null && !this.settings.forcePlay,
      canChallenge: myTurn && Boolean(this.challenge),
      drawPile: this.drawPile.length,
      turnStartedAt: this.turnStartedAt,
      settings: this.settings,
      roundResult: this.roundResult,
      events: this.events,
    };
  }
}

module.exports = {
  UnoGame, GameError, COLORS, DARK_COLORS, DEFAULT_SETTINGS, sanitizeSettings, buildDeck, buildFlipDeck, shuffle, cardPoints,
};
