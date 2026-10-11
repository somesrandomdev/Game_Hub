'use strict';

// Bot / autopilot strategy: get pieces home, capture when possible, don't stop
// right in front of an opponent, bring pieces out on a six.

const { absOf, SAFE, HOME, LAST_TRACK, TRACK } = require('./game');

// Could an opponent piece reach this shared square with one roll?
function threatened(t, pid, abs) {
  if (abs === null || SAFE.has(abs)) return false;
  for (const q of t.players) {
    if (q === pid) continue;
    for (const p of t.pieces[q]) {
      const at = absOf(t.seat[q], p);
      if (at === null) continue;
      const gap = (abs - at + TRACK) % TRACK;
      // they must not turn off into their home column before getting there
      if (gap >= 1 && gap <= 6 && p + gap <= LAST_TRACK) return true;
    }
  }
  return false;
}

function scoreMove(t, pid, k, d) {
  const from = t.pieces[pid][k];
  const to = from === -1 ? 0 : from + d;
  const seat = t.seat[pid];
  const abs = absOf(seat, to);
  let s = to / 10;
  if (to === HOME) s += 100;
  if (from === -1) s += 45;
  if (from <= LAST_TRACK && to > LAST_TRACK && to < HOME) s += 25; // into the home column: safe
  if (abs !== null && !SAFE.has(abs)) {
    for (const q of t.players) {
      if (q !== pid && t.pieces[q].some(p => absOf(t.seat[q], p) === abs)) s += 80;
    }
  }
  if (threatened(t, pid, absOf(seat, from))) s += 30; // escaping
  if (threatened(t, pid, abs)) s -= 40;               // walking into danger
  if (abs !== null && SAFE.has(abs)) s += 10;
  return s;
}

function chooseMove(g, pid) {
  const t = g.tableOf(pid);
  if (!t || !t.rolled) return null;
  let best = t.movable[0];
  let bestScore = -Infinity;
  for (const k of t.movable) {
    const s = scoreMove(t, pid, k, t.die) + Math.random() * 4;
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return best;
}

// One step for pid: roll, or move a piece. Returns what it did, or null.
function act(g, pid) {
  const t = g.tableOf(pid);
  if (!t || t.done || g.phase !== 'play' || g.current(t) !== pid) return null;
  if (!t.rolled) { g.roll(pid); return 'roll'; }
  g.move(pid, chooseMove(g, pid));
  return 'move';
}

module.exports = { act, chooseMove, threatened };
