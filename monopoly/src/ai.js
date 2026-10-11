'use strict';

// Bot / autopilot strategy. Simple and decent: buy what it can afford with a cushion,
// chase color groups, build evenly, mortgage the least useful things first when broke.

const { SQUARES, GROUP_SQUARES } = require('./board');
const { unmortgageCost } = require('./game');

const RESERVE = 120;  // cash a bot likes to keep for rent

const others = (g, pid) => g.active.filter(id => id !== pid);

// How many of this group does pid own, counting `extra` squares as theirs and `minus` as gone.
function ownedIn(g, pid, group, extra = [], minus = []) {
  return GROUP_SQUARES[group].filter(i => (g.owner[i] === pid && !minus.includes(i)) || extra.includes(i)).length;
}

const completes = (g, pid, i, extra = []) => ownedIn(g, pid, SQUARES[i].group, [i, ...extra]) === GROUP_SQUARES[SQUARES[i].group].length;

// Rough worth of a property to pid if they got it.
function valueTo(g, pid, i) {
  const sq = SQUARES[i];
  let v = sq.price;
  if (sq.type === 'rail') v *= 1 + 0.25 * ownedIn(g, pid, 'rail');
  if (sq.type === 'street' && completes(g, pid, i)) v *= 1.8;
  // keeping it away from someone one short of the group
  if (others(g, pid).some(o => completes(g, o, i))) v *= 1.4;
  return Math.round(v);
}

// The value of everything pid would hold (cash, property, finished groups) with a set of changes.
function position(g, pid, { gain = [], lose = [], cash = 0 } = {}) {
  const mine = i => (g.owner[i] === pid && !lose.includes(i)) || gain.includes(i);
  let v = g.p[pid].cash + cash;
  for (const sq of SQUARES) if (sq.price && mine(sq.i)) v += g.mortgaged[sq.i] ? sq.price / 2 : sq.price;
  for (const [group, list] of Object.entries(GROUP_SQUARES)) {
    if (!list.every(mine)) continue;
    const total = list.reduce((s, i) => s + SQUARES[i].price, 0);
    v += group === 'rail' ? total * 0.5 : group === 'util' ? 0 : total * 1.2;
  }
  return v;
}

function shouldBuy(g, pid, i) {
  const cash = g.p[pid].cash;
  const price = SQUARES[i].price;
  if (cash < price) return false;
  if (completes(g, pid, i) || others(g, pid).some(o => completes(g, o, i))) return true;
  return cash - price >= RESERVE;
}

// The most a bot would pay at auction (each bot gets its own mood per auction).
function maxBid(g, pid, i, mood = 1) {
  return Math.max(0, Math.min(g.p[pid].cash - 40, Math.round(valueTo(g, pid, i) * mood)));
}

function nextBid(g, pid, mood = 1) {
  const a = g.auction;
  if (!a || a.out.includes(pid) || a.bidder === pid) return null;
  const step = a.high < 100 ? 10 : a.high < 300 ? 20 : 50;
  const bid = Math.max(a.high + step, a.high ? 0 : Math.round(SQUARES[a.square].price * 0.3));
  return bid <= maxBid(g, pid, a.square, mood) ? bid : null;
}

// ---------- money ----------

// Raise cash until `target` is covered: mortgage loose property first, then sell
// buildings, then mortgage the rest. Returns true when there's enough.
function raiseCash(g, pid, target) {
  const p = g.p[pid];
  const mine = () => g.owner.map((o, i) => (o === pid ? i : -1)).filter(i => i >= 0);
  const inGroup = i => SQUARES[i].type === 'street' && ownedIn(g, pid, SQUARES[i].group) === GROUP_SQUARES[SQUARES[i].group].length;
  const tryDo = fn => { try { fn(); return true; } catch { return false; } };
  for (let guard = 0; guard < 200 && p.cash < target; guard++) {
    const loose = mine().filter(i => !g.mortgaged[i] && !inGroup(i)).sort((a, b) => SQUARES[a].price - SQUARES[b].price);
    if (loose.length && tryDo(() => g.mortgage(pid, loose[0]))) continue;
    const built = mine().filter(i => g.houses[i] > 0)
      .sort((a, b) => g.houses[b] - g.houses[a] || SQUARES[a].price - SQUARES[b].price);
    if (built.some(i => tryDo(() => g.sell(pid, i)))) continue;
    const rest = mine().filter(i => !g.mortgaged[i]).sort((a, b) => SQUARES[a].price - SQUARES[b].price);
    if (rest.some(i => tryDo(() => g.mortgage(pid, i)))) continue;
    break;
  }
  return p.cash >= target;
}

function settleDebt(g, pid) {
  const d = g.debts[0];
  if (!d || d.player !== pid) return false;
  if (raiseCash(g, pid, d.amount)) g.payDebt(pid);
  else g.bankrupt(pid);
  return true;
}

// Between rolls: unmortgage when rich, build houses on finished groups.
function manage(g, pid) {
  const p = g.p[pid];
  const mine = g.owner.map((o, i) => (o === pid ? i : -1)).filter(i => i >= 0);
  for (const i of mine.filter(j => g.mortgaged[j]).sort((a, b) => SQUARES[b].price - SQUARES[a].price)) {
    if (p.cash - unmortgageCost(i) < 400) break;
    try { g.unmortgage(pid, i); } catch { /* not now */ }
  }
  const groups = [...new Set(mine.map(i => SQUARES[i].group))]
    .filter(gr => SQUARES[GROUP_SQUARES[gr][0]].type === 'street' && ownedIn(g, pid, gr) === GROUP_SQUARES[gr].length)
    .sort((a, b) => SQUARES[GROUP_SQUARES[b][0]].house - SQUARES[GROUP_SQUARES[a][0]].house);
  for (let guard = 0; guard < 60; guard++) {
    let built = false;
    for (const gr of groups) {
      const list = GROUP_SQUARES[gr];
      const cost = SQUARES[list[0]].house;
      if (p.cash - cost < RESERVE + 60) continue;
      const target = list.reduce((best, i) => (g.houses[i] < g.houses[best] ? i : best), list[0]);
      try { g.build(pid, target); built = true; } catch { /* mortgaged, maxed, bank empty */ }
    }
    if (!built) break;
  }
}

// ---------- trades ----------

function judgeTrade(g, pid, t) {
  if (!t || t.to !== pid) return false;
  const them = t.from;
  const mineBefore = position(g, pid);
  const mineAfter = position(g, pid, { gain: t.give.props, lose: t.take.props, cash: t.give.cash - t.take.cash });
  const theirsBefore = position(g, them);
  const theirsAfter = position(g, them, { gain: t.take.props, lose: t.give.props, cash: t.take.cash - t.give.cash });
  const mine = mineAfter - mineBefore + (t.give.cards - t.take.cards) * 30;
  const theirs = theirsAfter - theirsBefore;
  return mine > 0 && mine >= theirs * 0.5;
}

// Offer cash (or a swap) for the last piece of a group. Tried pieces wait a while.
const tried = new WeakMap();
function proposal(g, pid) {
  const memo = tried.get(g) || new Map();
  tried.set(g, memo);
  const p = g.p[pid];
  for (const [group, list] of Object.entries(GROUP_SQUARES)) {
    if (group === 'util' || group === 'rail') continue;
    const missing = list.filter(i => g.owner[i] !== pid);
    if (missing.length !== 1 || list.some(i => g.houses[i] > 0)) continue;
    const i = missing[0];
    const holder = g.owner[i];
    if (!holder || holder === pid || g.p[holder].bankrupt) continue;
    const key = `${pid}:${i}`;
    if ((memo.get(key) ?? -Infinity) > g.seq - 80) continue;
    memo.set(key, g.seq);
    // a piece of theirs we hold that finishes one of *their* groups makes a fair swap
    const swap = g.owner.findIndex((o, j) => o === pid && SQUARES[j].type === 'street' && SQUARES[j].group !== group
      && completes(g, holder, j) && g.houses[j] === 0 && !GROUP_SQUARES[SQUARES[j].group].some(k => g.houses[k] > 0));
    if (swap >= 0) return { to: holder, give: { cash: 0, props: [swap], cards: 0 }, take: { cash: 0, props: [i], cards: 0 } };
    const offer = Math.min(p.cash - RESERVE, Math.round(SQUARES[i].price * (1.6 + Math.random() * 0.6)));
    if (offer < SQUARES[i].price) continue;
    return { to: holder, give: { cash: offer, props: [], cards: 0 }, take: { cash: 0, props: [i], cards: 0 } };
  }
  return null;
}

// ---------- one decision for whoever the game waits on ----------

// Does the next thing for pid (if the game is waiting on them). `bot` bots also
// build and propose trades; autopilot for an absent human plays it safe.
// Returns a short tag of what it did, or null.
function act(g, pid, { bot = true } = {}) {
  if (g.phase !== 'play') return null;
  if (g.debts.length) return g.debts[0].player === pid && settleDebt(g, pid) ? 'debt' : null;
  if (g.auction || g.current !== pid) return null;
  const p = g.p[pid];
  switch (g.step) {
    case 'roll':
      if (p.jailed) {
        if (p.jailCards.length) { g.useJailCard(pid); return 'card'; }
        const unowned = g.owner.filter((o, i) => o === null && SQUARES[i].price).length;
        if (unowned > 8 && p.cash >= 50 + RESERVE * 2) { g.payJail(pid); return 'fine'; }
      }
      g.roll(pid);
      return 'roll';
    case 'buy':
      if (shouldBuy(g, pid, g.offer)) g.buy(pid); else g.decline(pid);
      return 'buy';
    case 'done':
      if (bot) {
        manage(g, pid);
        if (!g.trade && Math.random() < 0.35) {
          const offer = proposal(g, pid);
          if (offer) {
            try { g.proposeTrade(pid, offer); return 'trade'; } catch { /* changed meanwhile */ }
          }
        }
      }
      g.endTurn(pid);
      return 'end';
    default:
      return null;
  }
}

module.exports = { act, nextBid, judgeTrade, shouldBuy, raiseCash, manage, valueTo };
