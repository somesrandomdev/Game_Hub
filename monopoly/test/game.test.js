'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MonopolyGame, GameError, sanitizeSettings, unmortgageCost } = require('../src/game');
const { SQUARES, GROUP_SQUARES, CHANCE, CHEST } = require('../src/board');
const ai = require('../src/ai');

// Seeded RNG so failures reproduce.
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

// A game whose dice come from a script: game.rolls.push([a, b]).
function scripted(ids = ['a', 'b'], settings = {}, opts = {}) {
  const rolls = [];
  let clock = 1000;
  const g = new MonopolyGame(ids, settings, {
    rng: rngFrom(7),
    now: () => clock,
    dice: () => rolls.shift() || [1, 2],
    ...opts,
  });
  g.rolls = rolls;
  g.tick = ms => { clock += ms; };
  g.turn = 0;
  return g;
}

const throwsCode = (fn, code) => assert.throws(fn, err => err instanceof GameError && err.code === code);

test('board: 40 squares, 28 properties, 16 cards per deck', () => {
  assert.equal(SQUARES.length, 40);
  assert.equal(SQUARES.filter(s => s.price).length, 28);
  assert.equal(CHANCE.length, 16);
  assert.equal(CHEST.length, 16);
  assert.deepEqual(GROUP_SQUARES.darkblue, [37, 39]);
  assert.deepEqual(GROUP_SQUARES.rail, [5, 15, 25, 35]);
});

test('settings are sanitized', () => {
  const s = sanitizeSettings({ startCash: 2000, timeLimit: 7, auctions: 0, evil: 1 });
  assert.equal(s.startCash, 2000);
  assert.equal(s.timeLimit, 60); // 7 isn't an option: the default stays
  assert.equal(s.auctions, false);
  assert.equal(s.evil, undefined);
});

test('roll, move, buy, end turn', () => {
  const g = scripted();
  g.rolls.push([1, 2]);
  g.roll('a');
  assert.equal(g.p.a.pos, 3);
  assert.equal(g.step, 'buy');
  assert.equal(g.offer, 3);
  throwsCode(() => g.endTurn('a'), 'decideFirst');
  g.buy('a');
  assert.equal(g.owner[3], 'a');
  assert.equal(g.p.a.cash, 1440);
  assert.equal(g.step, 'done');
  throwsCode(() => g.roll('b'), 'notYourTurn');
  g.endTurn('a');
  assert.equal(g.current, 'b');
});

test('rent is paid, doubled for a full color group, and set by houses', () => {
  const g = scripted();
  g.owner[1] = 'b';
  g.rolls.push([0, 1]);
  g.roll('a');
  assert.equal(g.p.a.cash, 1498);
  assert.equal(g.p.b.cash, 1502);

  g.owner[3] = 'b';
  assert.equal(g.rentFor(1), 4);
  g.houses[1] = 2;
  assert.equal(g.rentFor(1), 30);
  g.mortgaged[3] = true;
  assert.equal(g.rentFor(3), 0);
});

test('railroads and utilities', () => {
  const g = scripted();
  g.owner[5] = 'b';
  assert.equal(g.rentFor(5), 25);
  g.owner[15] = 'b';
  g.owner[25] = 'b';
  assert.equal(g.rentFor(5), 100);
  g.owner[12] = 'b';
  assert.equal(g.rentFor(12, { diceTotal: 7 }), 28);
  g.owner[28] = 'b';
  assert.equal(g.rentFor(12, { diceTotal: 7 }), 70);
});

test('passing GO pays the salary; doubles roll again; three doubles go to jail', () => {
  const g = scripted();
  g.p.a.pos = 38;
  g.rolls.push([2, 2]);
  g.roll('a');
  assert.equal(g.p.a.pos, 2);
  assert.equal(g.p.a.cash, 1700);
  assert.equal(g.step, 'roll'); // doubles
  g.rolls.push([1, 1]);
  g.roll('a');
  assert.equal(g.p.a.pos, 4); // income tax
  assert.equal(g.p.a.cash, 1500);
  g.rolls.push([3, 3]);
  g.roll('a');
  assert.equal(g.p.a.jailed, true);
  assert.equal(g.p.a.pos, 10);
  assert.equal(g.step, 'done');
});

test('jail: pay the fine, use a card, or roll doubles; third miss pays and moves', () => {
  const g = scripted();
  g.sendToJail('a');
  g.rolls.push([1, 2]);
  g.roll('a');
  assert.equal(g.p.a.jailed, true);
  assert.equal(g.step, 'done');
  g.endTurn('a');
  g.rolls.push([1, 2]);
  g.roll('b');
  g.buy('b');
  g.endTurn('b');

  g.rolls.push([2, 2]);
  g.roll('a');
  assert.equal(g.p.a.jailed, false);
  assert.equal(g.p.a.pos, 14);
  assert.equal(g.step, 'buy'); // doubles out of jail don't roll again
  g.decline('a');
  g.passAuction('a');
  g.passAuction('b');
  assert.equal(g.step, 'done');
  g.endTurn('a');
  g.endTurn = g.endTurn.bind(g);

  const h = scripted();
  h.sendToJail('a');
  h.p.a.jailTurns = 2;
  h.rolls.push([1, 3]);
  h.roll('a');
  assert.equal(h.p.a.jailed, false);
  assert.equal(h.p.a.cash, 1450);
  assert.equal(h.p.a.pos, 14);

  const k = scripted();
  k.sendToJail('a');
  k.p.a.jailCards.push('chest');
  k.useJailCard('a');
  assert.equal(k.p.a.jailed, false);
  assert.equal(k.p.a.jailCards.length, 0);
  assert.equal(k.decks.chest.length, 17);
  k.decks.chest.pop();
  k.sendToJail('a');
  k.payJail('a');
  assert.equal(k.p.a.cash, 1450);
});

test('go to jail square', () => {
  const g = scripted();
  g.p.a.pos = 25;
  g.rolls.push([2, 3]);
  g.roll('a');
  assert.equal(g.p.a.pos, 10);
  assert.equal(g.p.a.jailed, true);
  assert.equal(g.p.a.cash, 1500); // no salary
});

test('cards: advance, nearest railroad pays double, birthday, repairs', () => {
  const g = scripted(['a', 'b', 'c']);
  g.p.a.pos = 7;
  g.decks.chance.unshift(4); // nearest railroad
  g.owner[15] = 'b';
  g.drawCard('a', 'chance');
  assert.equal(g.p.a.pos, 15);
  assert.equal(g.p.b.cash, 1550);

  g.decks.chest.unshift(8); // birthday: 10 from everyone
  g.drawCard('a', 'chest');
  assert.equal(g.p.a.cash, 1450 + 20);

  g.owner[1] = 'a'; g.owner[3] = 'a';
  g.houses[1] = 5; g.houses[3] = 2;
  g.decks.chance.unshift(11); // repairs 25/house 100/hotel
  g.drawCard('a', 'chance');
  assert.equal(g.p.a.cash, 1470 - 150);

  g.p.a.pos = 7;
  g.decks.chance.unshift(9); // back 3 -> income tax
  g.drawCard('a', 'chance');
  assert.equal(g.p.a.pos, 4);
  assert.equal(g.p.a.cash, 1320 - 200);
});

test('free parking pot and double GO house rules', () => {
  const g = scripted(['a', 'b'], { freeParking: true, doubleGo: true });
  g.p.a.pos = 2;
  g.rolls.push([1, 1]);
  g.roll('a'); // income tax 200 into the pot
  assert.equal(g.pot, 200);
  g.p.a.pos = 18;
  g.rolls.push([1, 1]);
  g.roll('a');
  assert.equal(g.p.a.pos, 20);
  assert.equal(g.pot, 0);
  assert.equal(g.p.a.cash, 1500);
  g.p.a.pos = 30;
  g.p.a.jailed = false;
  g.step = 'roll';
  g.rolls.push([6, 4]);
  g.roll('a');
  assert.equal(g.p.a.pos, 0);
  assert.equal(g.p.a.cash, 1900);
});

test('auction: highest bid wins, the clock extends, everyone passing ends it', () => {
  const g = scripted(['a', 'b', 'c']);
  g.rolls.push([1, 2]);
  g.roll('a');
  g.decline('a');
  assert.equal(g.step, 'auction');
  throwsCode(() => g.endTurn('a'), 'auctionRunning');
  g.bid('b', 20);
  throwsCode(() => g.bid('c', 20), 'bidTooLow');
  g.bid('c', 30);
  throwsCode(() => g.bid('b', 99999), 'cantAfford');
  g.passAuction('a');
  assert.equal(g.expireAuction(), false);
  g.tick(16000);
  assert.equal(g.expireAuction(), true);
  assert.equal(g.owner[3], 'c');
  assert.equal(g.p.c.cash, 1470);
  assert.equal(g.step, 'done');

  const h = scripted();
  h.rolls.push([1, 2]);
  h.roll('a');
  h.decline('a');
  h.passAuction('a');
  h.passAuction('b');
  assert.equal(h.owner[3], null);
  assert.equal(h.auction, null);

  const k = scripted(['a', 'b'], { auctions: false });
  k.rolls.push([1, 2]);
  k.roll('a');
  k.decline('a');
  assert.equal(k.auction, null);
  assert.equal(k.step, 'done');
});

test('building: whole group, evenly, bank stock; selling back evenly', () => {
  const g = scripted();
  g.owner[1] = 'a';
  throwsCode(() => g.build('a', 1), 'needGroup');
  g.owner[3] = 'a';
  g.build('a', 1);
  throwsCode(() => g.build('a', 1), 'buildEvenly');
  g.build('a', 3);
  g.build('a', 1);
  assert.equal(g.p.a.cash, 1350);
  assert.equal(g.bank.houses, 29);
  throwsCode(() => g.sell('a', 3), 'sellEvenly');
  throwsCode(() => g.mortgage('a', 3), 'sellBuildingsFirst');
  g.sell('a', 1);
  assert.equal(g.p.a.cash, 1375);
  for (let k = 0; k < 4; k++) { g.build('a', 1); g.build('a', 3); }
  assert.equal(g.houses[1], 5);
  assert.equal(g.houses[3], 5);
  assert.equal(g.bank.hotels, 10);
  assert.equal(g.bank.houses, 32);
  throwsCode(() => g.build('a', 1), 'maxBuilt');

  g.bank.houses = 0;
  throwsCode(() => g.build('b', 1), 'notYours');
  g.sell('a', 1); // hotel with no houses in the bank: sold whole
  assert.equal(g.houses[1], 0);
});

test('mortgage and pay it off with 10% interest', () => {
  const g = scripted();
  g.owner[39] = 'a';
  g.mortgage('a', 39);
  assert.equal(g.p.a.cash, 1700);
  throwsCode(() => g.mortgage('a', 39), 'alreadyMortgaged');
  g.unmortgage('a', 39);
  assert.equal(g.p.a.cash, 1700 - unmortgageCost(39));
  assert.equal(unmortgageCost(39), 220);
});

test('debt: raise money then pay, or go bankrupt to the creditor', () => {
  const g = scripted(['a', 'b', 'c']);
  g.owner[39] = 'b';
  g.houses[39] = 5;
  g.owner[37] = 'b';
  g.owner[1] = 'a';
  g.p.a.cash = 100;
  g.p.a.pos = 35;
  g.rolls.push([1, 3]);
  g.roll('a');
  assert.equal(g.debts.length, 1);
  assert.equal(g.debts[0].amount, 2000);
  throwsCode(() => g.endTurn('a'), 'inDebt');
  throwsCode(() => g.payDebt('a'), 'cantPayYet');
  g.bankrupt('a');
  assert.equal(g.p.a.bankrupt, true);
  assert.equal(g.owner[1], 'b');
  assert.equal(g.p.b.cash, 1600);
  assert.equal(g.current, 'b');

  const h = scripted();
  h.owner[39] = 'b';
  h.owner[5] = 'a';
  h.p.a.cash = 30;
  h.p.a.pos = 35;
  h.rolls.push([1, 3]);
  h.roll('a');
  h.mortgage('a', 5);
  h.payDebt('a');
  assert.equal(h.p.a.cash, 80);
  assert.equal(h.p.b.cash, 1550);
  h.endTurn('a');
});

test('the last player standing wins', () => {
  const g = scripted();
  g.charge('a', [{ to: 'b', amount: 5000 }], 'rent');
  g.bankrupt('a');
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.winner, 'b');
  assert.equal(g.standings[0].id, 'b');
  assert.equal(g.standings[1].place, 2);
});

test('time limit: the richest player wins at the end of a turn', () => {
  const g = scripted(['a', 'b'], { timeLimit: 30 });
  g.owner[39] = 'b';
  g.rolls.push([1, 2]);
  g.roll('a');
  g.buy('a');
  g.tick(31 * 60e3);
  g.endTurn('a');
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.endReason, 'time');
  assert.equal(g.winner, 'b');
});

test('trades swap property, cash and cards, with mortgage interest', () => {
  const g = scripted();
  g.owner[1] = 'a';
  g.owner[39] = 'b';
  g.mortgaged[39] = true;
  g.p.b.jailCards.push('chance');
  throwsCode(() => g.proposeTrade('a', { to: 'b', give: { props: [39] } }), 'badTrade');
  throwsCode(() => g.proposeTrade('a', { to: 'a', give: { cash: 1 } }), 'tradeSelf');
  g.proposeTrade('a', { to: 'b', give: { props: [1], cash: 100 }, take: { props: [39], cards: 1 } });
  throwsCode(() => g.proposeTrade('b', { to: 'a', give: { cash: 1 } }), 'tradeBusy');
  throwsCode(() => g.respondTrade('a', true), 'noTrade');
  g.respondTrade('b', true);
  assert.equal(g.owner[1], 'b');
  assert.equal(g.owner[39], 'a');
  assert.equal(g.p.a.jailCards.length, 1);
  assert.equal(g.p.a.cash, 1500 - 100 - 20); // 10% interest on the $200 mortgage
  assert.equal(g.p.b.cash, 1600);

  g.proposeTrade('b', { to: 'a', take: { cash: 10 } });
  g.cancelTrade('b');
  assert.equal(g.trade, null);
  g.proposeTrade('b', { to: 'a', take: { cash: 10 } });
  g.respondTrade('a', false);
  assert.equal(g.p.a.cash, 1380);
});

test('dealt properties at the start', () => {
  const g = new MonopolyGame(['a', 'b', 'c'], { dealProps: 3 }, { rng: rngFrom(3) });
  for (const id of ['a', 'b', 'c']) assert.equal(g.owner.filter(o => o === id).length, 3);
});

test('a player leaving goes bankrupt to the bank', () => {
  const g = scripted(['a', 'b', 'c']);
  g.owner[1] = 'a';
  g.houses[1] = 0;
  g.removePlayer('a');
  assert.equal(g.owner[1], null);
  assert.deepEqual(g.players, ['b', 'c']);
  assert.equal(g.current, 'b');
  g.removePlayer('c');
  assert.equal(g.phase, 'gameOver');
});

// Bots play whole games: nothing may get stuck, money and buildings must add up.
function simulate(seed, n) {
  const rng = rngFrom(seed);
  let clock = 0;
  const ids = Array.from({ length: n }, (_, k) => `p${k}`);
  const g = new MonopolyGame(ids, { dealProps: seed % 3 === 0 ? 2 : 0, freeParking: seed % 2 === 0 }, { rng, now: () => clock });
  const origRandom = Math.random;
  Math.random = rng;
  try {
    for (let step = 0; step < 20000 && g.phase === 'play'; step++) {
      clock += 500;
      if (g.auction) {
        const a = g.auction;
        const bidder = g.active.find(id => !a.out.includes(id) && a.bidder !== id);
        if (!bidder) { clock = a.endsAt; g.expireAuction(); continue; }
        const amount = ai.nextBid(g, bidder);
        if (amount) g.bid(bidder, amount); else g.passAuction(bidder);
        continue;
      }
      if (g.trade) g.respondTrade(g.trade.to, ai.judgeTrade(g, g.trade.to, g.trade));
      const did = ai.act(g, g.actor);
      assert.ok(did, `stuck: actor ${g.actor} step ${g.step}`);
      for (const id of g.players) assert.ok(g.p[id].cash >= 0, `negative cash for ${id}`);
      const built = g.houses.reduce((s, h) => s + (h === 5 ? 0 : h), 0);
      const hotels = g.houses.filter(h => h === 5).length;
      assert.equal(built + g.bank.houses, 32);
      assert.equal(hotels + g.bank.hotels, 12);
      for (let i = 0; i < 40; i++) {
        if (g.houses[i]) assert.ok(g.owner[i] && !g.mortgaged[i]);
        if (g.owner[i]) assert.ok(!g.p[g.owner[i]].bankrupt);
      }
    }
  } finally {
    Math.random = origRandom;
  }
  return g;
}

test('300 simulated bot games run without getting stuck', { timeout: 120000 }, () => {
  let finished = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const g = simulate(seed, 2 + (seed % 5));
    if (g.phase === 'gameOver') {
      finished++;
      assert.ok(g.winner);
      assert.equal(g.active.length, 1);
    }
  }
  assert.ok(finished > 150, `only ${finished} games finished`);
});
