'use strict';

// Heuristic bot. Also used as "autopilot" for players who time out or drop off.

const { COLORS } = require('./game');

function bestColor(hand, excludeId, rng) {
  const weight = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c.id === excludeId || c.color === 'wild') continue;
    weight[c.color] += isNaN(Number(c.value)) ? 1.5 : 1;
  }
  let best = null;
  let max = 0;
  for (const col of COLORS) {
    if (weight[col] > max) { max = weight[col]; best = col; }
  }
  return best || COLORS[Math.floor(rng() * COLORS.length)];
}

function chooseMove(game, pid, rng = Math.random) {
  const hand = game.hands[pid];

  if (game.challenge && game.current === pid) {
    // A player sitting on a big hand is more likely to have been bluffing.
    const offenderCards = game.hands[game.challenge.offender]?.length ?? 0;
    const odds = Math.min(0.5, 0.1 + offenderCards * 0.04);
    return rng() < odds ? { type: 'challenge' } : { type: 'draw' };
  }

  const playable = hand.filter(c => game.canPlay(pid, c));
  if (!playable.length) return game.drawn !== null ? { type: 'pass' } : { type: 'draw' };

  const opponents = game.players.filter(id => id !== pid);
  const next = game.players[game.nextIndex(1)];
  const nextCount = game.hands[next].length;
  const fewest = opponents.reduce((a, b) => (game.hands[a].length <= game.hands[b].length ? a : b));
  const sameColor = col => hand.filter(c => c.color === col).length;
  const attack = nextCount <= 3;

  let best = null;
  let bestScore = -Infinity;
  for (const c of playable) {
    let s = rng() * 4;
    if (c.color === 'wild') {
      s -= 12; // hold wilds for emergencies
      if (playable.length === 1) s += 30;
      if (c.value === 'wild4') s += attack ? 40 : -4;
    } else {
      s += sameColor(c.color) * 3;
      const blocks = c.value === 'skip' || c.value === 'draw2' || (c.value === 'reverse' && game.players.length === 2);
      if (blocks) s += attack ? 25 : 5;
      if (c.value === 'draw2') s += 3;
      if (!isNaN(Number(c.value))) s += Number(c.value) * 0.4; // shed points
    }
    if (game.settings.sevenZero && c.value === '7' && hand.length > 1) {
      s += game.hands[fewest].length < hand.length - 1 ? 18 : -10;
    }
    if (game.settings.sevenZero && c.value === '0') {
      const prev = game.players[game.nextIndex(-1)];
      s += (hand.length - 1 - game.hands[prev].length) * 2;
    }
    if (s > bestScore) { bestScore = s; best = c; }
  }

  const move = { type: 'play', cardId: best.id };
  if (best.color === 'wild') move.color = bestColor(hand, best.id, rng);
  if (game.settings.sevenZero && best.value === '7' && hand.length > 1) move.target = fewest;
  return move;
}

function applyMove(game, pid, move) {
  switch (move.type) {
    case 'play': return game.play(pid, move.cardId, move);
    case 'draw': return game.draw(pid);
    case 'pass': return game.pass(pid);
    case 'challenge': return game.challengeDraw4(pid);
    default: throw new Error(`Unknown move ${move.type}`);
  }
}

module.exports = { chooseMove, applyMove, bestColor };
