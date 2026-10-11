'use strict';

// Heuristic bot. Also used as "autopilot" for players who time out or drop off.

const { COLORS, DARK_COLORS } = require('./game');

function bestColor(hand, excludeId, rng, colors = COLORS) {
  const weight = Object.fromEntries(colors.map(c => [c, 0]));
  for (const c of hand) {
    if (c.id === excludeId || !(c.color in weight)) continue;
    weight[c.color] += isNaN(Number(c.value)) ? 1.5 : 1;
  }
  let best = null;
  let max = 0;
  for (const col of colors) {
    if (weight[col] > max) { max = weight[col]; best = col; }
  }
  return best || colors[Math.floor(rng() * colors.length)];
}

const BLOCKERS = new Set(['skip', 'skipAll', 'draw1', 'draw2', 'draw5']);

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

  const opponents = game.active.filter(id => id !== pid);
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
      if (c.value === 'wild4' || c.value === 'wild2') s += attack ? 40 : -4;
      if (c.value === 'wildColor') s += attack ? 45 : 0;
    } else {
      s += sameColor(c.color) * 3;
      if (game.settings.multiPlay) s += (hand.filter(x => x.value === c.value).length - 1) * 4;
      const blocks = BLOCKERS.has(c.value) || (c.value === 'reverse' && opponents.length === 1);
      if (blocks) s += attack ? 25 : 5;
      if (c.value === 'draw2' || c.value === 'draw5') s += 3;
      if (c.value === 'skipAll') s += 6; // a free extra turn
      if (c.value === 'flip') s += attack ? 8 : 0; // shake things up when someone's close
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

  // dump every other card of the same number/symbol along with it
  const twins = game.settings.multiPlay ? hand.filter(c => c.value === best.value && c.id !== best.id) : [];
  const ids = [best.id, ...twins.map(c => c.id)];
  const move = { type: 'play', cardId: ids.length > 1 ? ids : best.id };
  const rest = hand.filter(c => !ids.includes(c.id));
  if (best.color === 'wild') move.color = bestColor(rest, null, rng, game.colors);
  // in case the Flip turns up a wild: pick from what the hand will look like afterwards
  if (best.value === 'flip') move.flipColor = bestColor(rest.map(c => ({ id: c.id, ...c.back })), null, rng, game.side === 'dark' ? COLORS : DARK_COLORS);
  if (game.settings.sevenZero && best.value === '7' && hand.length > ids.length) move.target = fewest;
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
