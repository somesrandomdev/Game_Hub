'use strict';

// Pure Ludo tournament engine: no I/O, no timers.
// Everyone is split into tables of at most 4. Each table plays a round of Ludo
// (Ludo King rules); places earn points; after every round people are re-seated so
// they meet new opponents. The first to the target score (checked when a round ends) wins.

const { GameError } = require('./messages');

const COLORS = ['red', 'green', 'yellow', 'blue'];   // seats, clockwise from top left
const TRACK = 52;          // squares around the board
const LAST_TRACK = 50;     // a piece's last square before its home column
const HOME = 56;           // progress of a piece that made it home
const SEAT_OFFSET = 13;    // each seat starts a quarter of the board further on
const STAR = 8;            // safe star square, 8 after each start
const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
// points by finishing place, by table size
const POINTS = { 1: [3], 2: [3, 0], 3: [3, 1, 0], 4: [3, 2, 1, 0] };
// which seats a table of n uses (two players sit opposite each other)
const SEATS = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
// Raids: a piece in its home column can be caught by an opponent that rolls exactly
// onto it. The raider then sits in that lane and only backs out one square per 6 or 1.
// A raider in the lane of seat s, square c (1..5), is stored as RAID + s * 10 + c.
const RAID = 100;
const LANE = HOME - LAST_TRACK - 1;  // squares in a home column
const isRaid = p => p >= RAID;
const raidSeat = p => Math.floor((p - RAID) / 10);
const raidCell = p => (p - RAID) % 10;

const DEFAULT_SETTINGS = {
  target: 10,        // points to win the tournament
  pieces: 4,         // pieces per player
  quick: true,       // a table's round ends when its first player gets every piece home
  turnTimer: 30,     // seconds before autopilot plays for you; 0 = off
  autoNext: true,    // the next round starts by itself after a short break
};
const OPTIONS = {
  target: [3, 5, 10, 15, 20, 30],
  pieces: [2, 3, 4],
  turnTimer: [0, 15, 30, 60],
};

function sanitizeSettings(raw = {}, base = DEFAULT_SETTINGS) {
  const out = { ...DEFAULT_SETTINGS, ...base };
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(key in raw)) continue;
    if (typeof def === 'boolean') out[key] = Boolean(raw[key]);
    else if (OPTIONS[key].includes(Number(raw[key]))) out[key] = Number(raw[key]);
  }
  return out;
}

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Square on the shared track (0..51) of a piece at `progress` for a seat, or null
// when it isn't on the shared track (yard, home column, home).
function absOf(seat, progress) {
  if (progress < 0 || progress > LAST_TRACK) return null;
  return (seat * SEAT_OFFSET + progress) % TRACK;
}

// Progress of `seat` on the last track square before `lane`'s home column.
function laneEntry(seat, lane) {
  return ((lane - seat) * SEAT_OFFSET + LAST_TRACK + TRACK) % TRACK;
}

// Where a piece can be captured: a shared square or a lane square; null if it can't be.
function spotOf(seat, p) {
  if (isRaid(p)) return `lane${raidSeat(p)}:${raidCell(p)}`;
  if (p > LAST_TRACK && p < HOME) return `lane${seat}:${p - LAST_TRACK}`;
  const abs = absOf(seat, p);
  return abs === null || SAFE.has(abs) ? null : `track${abs}`;
}

const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

// As even as possible, never more than 4: 5 -> 3+2, 9 -> 3+3+3, 13 -> 4+3+3+3.
function tableSizes(n) {
  const k = Math.ceil(n / 4);
  const base = Math.floor(n / k);
  return Array.from({ length: k }, (_, i) => base + (i < n % k ? 1 : 0));
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

class LudoGame {
  constructor(playerIds, settings = {}, { rng = Math.random, now = Date.now, die = null } = {}) {
    if (!Array.isArray(playerIds) || playerIds.length < 2) throw new GameError('needTwoPlayers');
    this.rng = rng;
    this.now = now;
    this.die = die || (() => 1 + Math.floor(rng() * 6));
    this.id = Math.floor(rng() * 1e9).toString(36) + now().toString(36);
    this.settings = sanitizeSettings(settings);
    this.players = [...playerIds];
    this.scores = Object.fromEntries(this.players.map(id => [id, 0]));
    this.wins = Object.fromEntries(this.players.map(id => [id, 0]));
    this.met = new Map();       // pair -> rounds played at the same table
    this.round = 0;
    this.tables = [];
    this.events = [];
    this.seq = 0;
    this.phase = 'play';
    this.roundEndedAt = null;
    this.lastRound = null;      // [{ table, places }] of the round that just ended
    this.winner = null;
    this.startRound();
  }

  // ---------- helpers ----------

  emit(type, data = {}) {
    this.events.push({ seq: ++this.seq, type, ...data });
    if (this.events.length > 80) this.events.shift();
  }

  tableOf(pid) { return this.tables.find(t => t.players.includes(pid)) || null; }
  current(t) { return t.players[t.turn]; }
  isOut(t, pid) { return t.finished.includes(pid); }
  touch(t) { t.turnStartedAt = this.now(); t.seq++; }

  // ---------- seating ----------

  // Many random seatings; keep the one where people have met each other least.
  seat() {
    const sizes = tableSizes(this.players.length);
    let best = null;
    let bestCost = Infinity;
    const tries = this.players.length <= 4 ? 1 : 400;
    for (let k = 0; k < tries; k++) {
      const order = shuffle([...this.players], this.rng);
      const groups = [];
      let at = 0;
      for (const size of sizes) { groups.push(order.slice(at, at + size)); at += size; }
      let cost = 0;
      for (const g of groups) {
        for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) cost += (this.met.get(pairKey(g[i], g[j])) || 0) ** 2;
      }
      if (cost < bestCost) { bestCost = cost; best = groups; }
      if (cost === 0) break;
    }
    for (const g of best) {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const key = pairKey(g[i], g[j]);
          this.met.set(key, (this.met.get(key) || 0) + 1);
        }
      }
    }
    return best;
  }

  startRound() {
    this.round++;
    this.phase = 'play';
    this.roundEndedAt = null;
    const n = this.settings.pieces;
    this.tables = this.seat().map((ids, k) => {
      const seats = SEATS[ids.length];
      const t = {
        id: k,
        players: ids,
        seat: Object.fromEntries(ids.map((id, i) => [id, seats[i]])),
        pieces: Object.fromEntries(ids.map(id => [id, Array(n).fill(-1)])),
        turn: Math.floor(this.rng() * ids.length),
        die: null,
        rolled: false,
        movable: [],
        raids: [],
        sixes: 0,
        finished: [],
        done: false,
        places: null,
        seq: 0,
        turnStartedAt: 0,
      };
      this.touch(t);
      return t;
    });
    this.emit('round', { round: this.round, tables: this.tables.map(t => t.players) });
    for (const t of this.tables) this.emit('turn', { table: t.id, player: this.current(t) });
  }

  nextRound() {
    if (this.phase !== 'roundOver') throw new GameError('roundNotOver');
    this.startRound();
  }

  // ---------- turns ----------

  assertTurn(pid) {
    if (this.phase !== 'play') throw new GameError('roundIsOver');
    const t = this.tableOf(pid);
    if (!t) throw new GameError('notInGame');
    if (t.done) throw new GameError('tableDone');
    if (this.current(t) !== pid) throw new GameError('notYourTurn');
    return t;
  }

  legalMoves(t, pid, d) {
    const out = [];
    t.pieces[pid].forEach((p, k) => {
      if (isRaid(p) ? d === 6 || d === 1 : p === -1 ? d === 6 : p < HOME && p + d <= HOME) out.push(k);
    });
    return out;
  }

  // Pieces on the track that can roll exactly onto an opponent in its home column.
  raidsFor(t, pid, d) {
    const out = [];
    const seat = t.seat[pid];
    t.pieces[pid].forEach((p, k) => {
      if (p < 0 || p > LAST_TRACK) return;
      for (const q of t.players) {
        if (q === pid) continue;
        const entry = laneEntry(seat, t.seat[q]);
        const cell = p + d - entry;
        if (entry < p || cell < 1 || cell > LANE) continue;
        const j = t.pieces[q].indexOf(LAST_TRACK + cell);
        if (j !== -1) out.push({ piece: k, victim: q, victimPiece: j });
      }
    });
    return out;
  }

  roll(pid) {
    const t = this.assertTurn(pid);
    if (t.rolled) throw new GameError('alreadyRolled');
    const d = this.die();
    t.die = d;
    this.emit('roll', { table: t.id, player: pid, value: d });
    if (d === 6 && ++t.sixes === 3) {
      this.emit('threeSixes', { table: t.id, player: pid });
      this.nextTurn(t);
      return;
    }
    const moves = this.legalMoves(t, pid, d);
    const raids = this.raidsFor(t, pid, d);
    if (!moves.length && !raids.length) {
      this.emit('noMove', { table: t.id, player: pid, value: d });
      this.nextTurn(t);
      return;
    }
    t.rolled = true;
    t.movable = moves;
    t.raids = raids;
    this.touch(t);
    // only one real choice (all pieces in the yard count as one): play it.
    // A raid is never played for you: catching someone is the player's call.
    const distinct = new Set(moves.map(k => t.pieces[pid][k]));
    if (distinct.size === 1 && !raids.length) this.move(pid, moves[0]);
  }

  // raid: break into an opponent's home column to catch the piece there
  move(pid, k, raid = false) {
    const t = this.assertTurn(pid);
    if (!t.rolled) throw new GameError('rollFirst');
    k = Number(k);
    const r = raid ? t.raids.find(x => x.piece === k) : null;
    if (raid ? !r : !t.movable.includes(k)) throw new GameError('cantMove');
    const d = t.die;
    const seat = t.seat[pid];
    const pieces = t.pieces[pid];
    const from = pieces[k];
    let to = from === -1 ? 0 : from + d;
    let path = null;  // squares walked, when they don't simply count up
    if (r) {
      const lane = t.seat[r.victim];
      to = RAID + lane * 10 + t.pieces[r.victim][r.victimPiece] - LAST_TRACK;
      path = [...range(from + 1, laneEntry(seat, lane)), ...range(RAID + lane * 10 + 1, to)];
    } else if (isRaid(from)) {
      // a raider backs out one square, then it's back on the track
      to = raidCell(from) > 1 ? from - 1 : laneEntry(seat, raidSeat(from));
      path = [to];
    }
    pieces[k] = to;
    t.rolled = false;
    t.movable = [];
    t.raids = [];
    this.emit('move', { table: t.id, player: pid, piece: k, from, to, ...(path && { path }), ...(r && { raid: r.victim }) });

    // landing on someone outside a safe square sends them back to their yard
    let captured = 0;
    const where = spotOf(seat, to);
    if (where) {
      for (const q of t.players) {
        if (q === pid) continue;
        t.pieces[q].forEach((p, j) => {
          if (spotOf(t.seat[q], p) === where) {
            t.pieces[q][j] = -1;
            captured++;
            this.emit('capture', { table: t.id, player: pid, victim: q, piece: j, square: absOf(seat, to) });
          }
        });
      }
    }

    const home = to === HOME;
    if (home) this.emit('home', { table: t.id, player: pid, piece: k });
    if (home && pieces.every(p => p === HOME)) {
      t.finished.push(pid);
      this.emit('finished', { table: t.id, player: pid, place: t.finished.length });
      const left = t.players.filter(q => !this.isOut(t, q));
      if (this.settings.quick || left.length <= 1) { this.endTable(t); return; }
      this.nextTurn(t);
      return;
    }

    // a six, a capture or a piece reaching home earns another roll
    if (d === 6 || captured || home) {
      if (d !== 6) t.sixes = 0;
      this.touch(t);
      this.emit('again', { table: t.id, player: pid, why: d === 6 ? 'six' : captured ? 'capture' : 'home' });
      return;
    }
    this.nextTurn(t);
  }

  nextTurn(t) {
    if (t.done) return;
    t.sixes = 0;
    t.rolled = false;
    t.movable = [];
    t.raids = [];
    const n = t.players.length;
    for (let s = 0; s < n; s++) {
      t.turn = (t.turn + 1) % n;
      if (!this.isOut(t, this.current(t))) break;
    }
    this.touch(t);
    this.emit('turn', { table: t.id, player: this.current(t) });
  }

  // How far along a player is: what decides the places of everyone who didn't finish.
  progress(t, pid) {
    return t.pieces[pid].reduce((s, p) => s + (p < 0 ? 0 : isRaid(p) ? laneEntry(t.seat[pid], raidSeat(p)) + 1 : p + 1), 0);
  }

  endTable(t) {
    if (t.done) return;
    const rest = t.players.filter(q => !this.isOut(t, q)).sort((a, b) => this.progress(t, b) - this.progress(t, a));
    const order = [...t.finished, ...rest];
    const pts = POINTS[order.length] || POINTS[4];
    t.places = order.map((id, i) => ({ id, place: i + 1, points: pts[i] ?? 0 }));
    for (const p of t.places) {
      this.scores[p.id] = (this.scores[p.id] || 0) + p.points;
      if (p.place === 1) this.wins[p.id] = (this.wins[p.id] || 0) + 1;
    }
    t.done = true;
    t.rolled = false;
    t.movable = [];
    t.raids = [];
    this.emit('tableDone', { table: t.id, places: t.places });
    if (this.tables.every(x => x.done)) this.endRound();
  }

  endRound() {
    this.lastRound = this.tables.map(t => ({ table: t.id, places: t.places }));
    this.roundEndedAt = this.now();
    const top = this.standings()[0];
    if (top && top.score >= this.settings.target) {
      this.phase = 'gameOver';
      this.winner = top.id;
      this.emit('gameOver', { winner: top.id });
    } else {
      this.phase = 'roundOver';
      this.emit('roundOver', { round: this.round });
    }
  }

  standings() {
    return [...this.players]
      .map(id => ({ id, score: this.scores[id] || 0, wins: this.wins[id] || 0 }))
      .sort((a, b) => b.score - a.score || b.wins - a.wins);
  }

  // ---------- people coming and going ----------

  addPlayer(pid) {
    if (this.phase === 'play') throw new GameError('waitRoundEnd');
    if (this.players.includes(pid)) return;
    this.players.push(pid);
    this.scores[pid] = 0;
    this.wins[pid] = 0;
  }

  removePlayer(pid) {
    if (!this.players.includes(pid)) return;
    this.players = this.players.filter(id => id !== pid);
    delete this.scores[pid];
    delete this.wins[pid];
    const t = this.tableOf(pid);
    if (t && !t.done && this.phase === 'play') {
      const cur = this.current(t);
      const idx = t.players.indexOf(pid);
      t.players.splice(idx, 1);
      delete t.pieces[pid];
      t.finished = t.finished.filter(id => id !== pid);
      this.emit('leave', { table: t.id, player: pid });
      if (t.players.filter(q => !this.isOut(t, q)).length <= 1) this.endTable(t);
      else if (cur === pid) {
        // whoever sat after them plays next
        t.turn = (idx - 1 + t.players.length) % t.players.length;
        this.nextTurn(t);
      } else t.turn = t.players.indexOf(cur);
    } else if (t) {
      t.players = t.players.filter(id => id !== pid);
    }
    if (this.players.length < 2 && this.phase !== 'gameOver') {
      this.phase = 'gameOver';
      this.winner = this.players[0] ?? null;
      this.emit('gameOver', { winner: this.winner, abandoned: true });
    }
  }

  // ---------- views ----------

  view(pid) {
    const mine = this.tableOf(pid);
    const myTurn = Boolean(mine && !mine.done && this.phase === 'play' && this.current(mine) === pid);
    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      settings: this.settings,
      players: this.players.map(id => ({ id, score: this.scores[id] || 0, wins: this.wins[id] || 0 })),
      standings: this.standings(),
      tables: this.tables.map(t => ({
        id: t.id,
        players: t.players.map(id => ({ id, seat: t.seat[id], color: COLORS[t.seat[id]], pieces: t.pieces[id], finished: t.finished.indexOf(id) + 1 })),
        current: t.done || this.phase !== 'play' ? null : this.current(t),
        die: t.die,
        rolled: t.rolled,
        movable: t.movable,
        raids: t.raids,
        sixes: t.sixes,
        done: t.done,
        places: t.places,
        turnStartedAt: t.turnStartedAt,
      })),
      myTable: mine ? mine.id : null,
      canRoll: myTurn && !mine.rolled,
      canMove: myTurn && mine.rolled ? mine.movable : [],
      canRaid: myTurn && mine.rolled ? mine.raids : [],
      roundEndedAt: this.roundEndedAt,
      lastRound: this.lastRound,
      winner: this.winner,
      events: this.events,
    };
  }
}

module.exports = {
  LudoGame, GameError, DEFAULT_SETTINGS, OPTIONS, sanitizeSettings, absOf, tableSizes, laneEntry,
  isRaid, raidSeat, raidCell, COLORS, SAFE, HOME, LAST_TRACK, TRACK, POINTS, STAR, RAID,
};
