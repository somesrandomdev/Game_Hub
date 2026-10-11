'use strict';

// Pure Monopoly rules engine: no I/O, no timers. The server calls the methods below
// and broadcasts view(). Everything about the board is public, so every player gets
// the same view apart from a few "can I…" flags.

const { SQUARES, GROUP_SQUARES, CHANCE, CHEST, JAIL, isBuyable } = require('./board');
const { GameError } = require('./messages');

const SALARY = 200;
const JAIL_FINE = 50;
const START_HOUSES = 32;
const START_HOTELS = 12;
const AUCTION_MS = 10000;     // an auction closes this long after the last bid
const AUCTION_FIRST_MS = 15000;

const DEFAULT_SETTINGS = {
  startCash: 1500,
  timeLimit: 60,         // minutes, then the richest player wins; 0 = until one player is left
  auctions: true,        // a property nobody buys goes up for auction
  freeParking: false,    // taxes and fees go into a pot that Free Parking collects
  doubleGo: false,       // landing right on GO pays double
  dealProps: 0,          // properties dealt to each player at the start
  turnTimer: 0,          // seconds before autopilot plays for you; 0 = off
};

const OPTIONS = {
  startCash: [1000, 1500, 2000, 2500],
  timeLimit: [0, 30, 45, 60, 90],
  dealProps: [0, 2, 3],
  turnTimer: [0, 30, 60, 90],
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

const mortgageValue = i => SQUARES[i].price / 2;
const unmortgageCost = i => Math.ceil((mortgageValue(i) * 11) / 10);
const interest = i => Math.ceil(mortgageValue(i) / 10);

class MonopolyGame {
  constructor(playerIds, settings = {}, { rng = Math.random, now = Date.now, dice = null } = {}) {
    if (!Array.isArray(playerIds) || playerIds.length < 2) throw new GameError('needTwoPlayers');
    this.rng = rng;
    this.now = now;
    this.dice = dice || (() => [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)]);
    this.id = Math.floor(rng() * 1e9).toString(36) + now().toString(36);
    this.settings = sanitizeSettings(settings);
    this.players = [...playerIds];
    this.p = Object.fromEntries(this.players.map(id => [id, {
      pos: 0, cash: this.settings.startCash, jailed: false, jailTurns: 0, jailCards: [], bankrupt: false, place: 0,
    }]));
    this.owner = SQUARES.map(() => null);
    this.houses = SQUARES.map(() => 0);     // 5 = hotel
    this.mortgaged = SQUARES.map(() => false);
    this.bank = { houses: START_HOUSES, hotels: START_HOTELS };
    this.decks = { chance: shuffle(CHANCE.map(c => c.id), rng), chest: shuffle(CHEST.map(c => c.id), rng) };
    this.pot = 0;
    this.events = [];
    this.seq = 0;
    this.phase = 'play';
    this.turn = Math.floor(rng() * this.players.length);
    this.step = 'roll';          // roll | buy | auction | done
    this.lastDice = null;
    this.doubles = 0;            // doubles rolled this turn
    this.extraRoll = false;
    this.offer = null;           // square up for sale when step is 'buy'
    this.auction = null;
    this.debts = [];             // [{ player, amount, payees: [{ to, amount }], reason }]
    this.trade = null;
    this.eliminated = 0;
    this.winner = null;
    this.standings = null;
    this.endReason = null;
    this.startedAt = now();
    this.endsAt = this.settings.timeLimit ? this.startedAt + this.settings.timeLimit * 60e3 : null;
    this.dealProperties();
    this.touch();
    this.emit('start', { player: this.current });
  }

  // ---------- helpers ----------

  get current() { return this.players[this.turn]; }
  get active() { return this.players.filter(id => !this.p[id].bankrupt); }
  // whoever the game is waiting on: someone in debt, else the current player
  get actor() { return this.debts.length ? this.debts[0].player : this.current; }

  emit(type, data = {}) {
    this.events.push({ seq: ++this.seq, type, ...data });
    if (this.events.length > 60) this.events.shift();
  }

  touch() { this.turnStartedAt = this.now(); }

  dealProperties() {
    const n = this.settings.dealProps;
    if (!n) return;
    const pool = shuffle(SQUARES.filter(s => isBuyable(s.i)).map(s => s.i), this.rng);
    for (let round = 0; round < n; round++) {
      for (const id of this.players) {
        const sq = pool.pop();
        this.owner[sq] = id;
        this.emit('dealt', { player: id, square: sq });
      }
    }
  }

  assertPlaying() {
    if (this.phase !== 'play') throw new GameError('gameIsOver');
  }

  assertMember(pid) {
    if (!this.p[pid] || this.p[pid].bankrupt) throw new GameError('notInGame');
  }

  assertTurn(pid) {
    this.assertPlaying();
    this.assertMember(pid);
    if (pid !== this.current) throw new GameError('notYourTurn');
  }

  assertNoDebt() {
    const d = this.debts[0];
    if (d) throw new GameError('inDebt', { amount: d.amount });
  }

  assertNoAuction() {
    if (this.auction) throw new GameError('auctionRunning');
  }

  ownsGroup(pid, group) {
    return GROUP_SQUARES[group].every(i => this.owner[i] === pid);
  }

  groupHasBuildings(group) {
    return GROUP_SQUARES[group].some(i => this.houses[i] > 0);
  }

  countOwned(pid, group) {
    return GROUP_SQUARES[group].filter(i => this.owner[i] === pid).length;
  }

  rentFor(i, { diceTotal = 0, railMult = 1, utilMult = 0 } = {}) {
    const sq = SQUARES[i];
    const owner = this.owner[i];
    if (owner === null || this.mortgaged[i]) return 0;
    if (sq.type === 'street') {
      const h = this.houses[i];
      if (h) return sq.rents[h];
      return sq.rents[0] * (this.ownsGroup(owner, sq.group) ? 2 : 1);
    }
    if (sq.type === 'rail') return 25 * 2 ** (this.countOwned(owner, 'rail') - 1) * railMult;
    if (sq.type === 'util') {
      const mult = utilMult || (this.countOwned(owner, 'util') === 2 ? 10 : 4);
      return diceTotal * mult;
    }
    return 0;
  }

  // What everything is worth: cash, property at its price (half if mortgaged), buildings at cost.
  worth(pid) {
    let total = this.p[pid].cash;
    this.owner.forEach((o, i) => {
      if (o !== pid) return;
      total += this.mortgaged[i] ? mortgageValue(i) : SQUARES[i].price;
      total += this.houses[i] * (SQUARES[i].house || 0);
    });
    return total;
  }

  // The most cash this player could raise: sell every building, mortgage everything.
  liquidity(pid) {
    let total = this.p[pid].cash;
    this.owner.forEach((o, i) => {
      if (o !== pid) return;
      total += (this.houses[i] * SQUARES[i].house) / 2;
      if (!this.mortgaged[i]) total += mortgageValue(i);
    });
    return total;
  }

  owedBy(pid) {
    return this.debts.filter(d => d.player === pid).reduce((s, d) => s + d.amount, 0);
  }

  // ---------- money ----------

  // Money out of a player. Paid at once when they have the cash, otherwise it
  // becomes a debt that holds the game until they raise it or go bankrupt.
  charge(pid, payees, reason) {
    payees = payees.filter(x => x.amount > 0);
    const amount = payees.reduce((s, x) => s + x.amount, 0);
    if (!amount) return;
    const p = this.p[pid];
    if (p.cash >= amount && !this.owedBy(pid)) {
      p.cash -= amount;
      this.payOut(payees, reason);
      return;
    }
    this.debts.push({ player: pid, amount, payees, reason });
    this.emit('debt', { player: pid, amount, reason });
  }

  // Taxes and fees: to the bank, or into the Free Parking pot.
  fee(pid, amount, reason) {
    this.charge(pid, [{ to: this.settings.freeParking ? 'pot' : null, amount }], reason);
  }

  payOut(payees, reason) {
    for (const { to, amount } of payees) {
      if (to === 'pot') this.pot += amount;
      else if (to !== null && this.p[to] && !this.p[to].bankrupt) this.p[to].cash += amount;
    }
    void reason;
  }

  collect(pid, amount, reason) {
    this.p[pid].cash += amount;
    this.emit('collect', { player: pid, amount, reason });
  }

  // ---------- turn flow ----------

  roll(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    if (this.step !== 'roll') throw new GameError(this.step === 'buy' ? 'decideFirst' : this.step === 'auction' ? 'auctionRunning' : 'alreadyRolled');
    const p = this.p[pid];
    const [a, b] = this.dice();
    const isDouble = a === b;
    this.lastDice = [a, b];
    this.extraRoll = false;
    this.emit('roll', { player: pid, dice: [a, b] });
    this.touch();

    if (p.jailed) {
      if (isDouble) {
        this.release(pid, 'doubles');
      } else if (++p.jailTurns >= 3) {
        // third miss: pay the fine and move out
        this.fee(pid, JAIL_FINE, 'jail');
        this.release(pid, 'fine');
      } else {
        this.emit('jailStay', { player: pid, tries: p.jailTurns });
        this.step = 'done';
        return;
      }
      this.moveBy(pid, a + b);
      this.settle();
      return;
    }

    if (isDouble && ++this.doubles >= 3) {
      this.emit('speeding', { player: pid });
      this.sendToJail(pid);
      this.settle();
      return;
    }
    this.extraRoll = isDouble;
    this.moveBy(pid, a + b);
    this.settle();
  }

  // After a move resolves: roll again on doubles, otherwise the turn can end.
  settle() {
    if (this.phase !== 'play' || this.step === 'buy' || this.auction) return;
    const p = this.p[this.current];
    this.step = this.extraRoll && p && !p.jailed && !p.bankrupt ? 'roll' : 'done';
  }

  endTurn(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    this.assertNoAuction();
    if (this.step === 'roll') throw new GameError('rollFirst');
    if (this.step === 'buy') throw new GameError('decideFirst');
    this.nextTurn();
  }

  nextTurn() {
    if (this.phase !== 'play') return;
    if (this.endsAt && this.now() >= this.endsAt) { this.finish('time'); return; }
    const n = this.players.length;
    let i = this.turn;
    for (let guard = 0; guard < n; guard++) {
      i = (i + 1) % n;
      if (!this.p[this.players[i]].bankrupt) break;
    }
    this.turn = i;
    this.step = 'roll';
    this.doubles = 0;
    this.extraRoll = false;
    this.offer = null;
    this.touch();
    this.emit('turn', { player: this.current });
  }

  // ---------- moving ----------

  moveBy(pid, steps) {
    const from = this.p[pid].pos;
    this.moveTo(pid, (from + steps) % 40, { forward: true, via: 'roll' });
  }

  moveTo(pid, to, { forward = true, via = 'card', land = {} } = {}) {
    const p = this.p[pid];
    const from = p.pos;
    p.pos = to;
    const passedGo = forward && to < from;
    const onGo = forward && to === 0 && from !== 0;
    this.emit('move', { player: pid, from, to, forward, via });
    if (passedGo || onGo) {
      const bonus = onGo && this.settings.doubleGo ? SALARY * 2 : SALARY;
      this.collect(pid, bonus, 'go');
    }
    this.land(pid, land);
  }

  land(pid, opts = {}) {
    const i = this.p[pid].pos;
    const sq = SQUARES[i];
    switch (sq.type) {
      case 'street': case 'rail': case 'util': {
        const owner = this.owner[i];
        if (owner === null) {
          this.step = 'buy';
          this.offer = i;
          return;
        }
        if (owner === pid || this.mortgaged[i]) return;
        let diceTotal = this.lastDice ? this.lastDice[0] + this.lastDice[1] : 0;
        if (opts.utilMult) {
          // "nearest utility" card: roll again and pay ten times the throw
          const d = this.dice();
          diceTotal = d[0] + d[1];
          this.emit('roll', { player: pid, dice: d, forRent: true });
        }
        const rent = this.rentFor(i, { diceTotal, ...opts });
        this.emit('rent', { player: pid, owner, square: i, amount: rent });
        this.charge(pid, [{ to: owner, amount: rent }], 'rent');
        return;
      }
      case 'tax':
        this.emit('tax', { player: pid, square: i, amount: sq.amount });
        this.fee(pid, sq.amount, 'tax');
        return;
      case 'chance': case 'chest':
        this.drawCard(pid, sq.type);
        return;
      case 'gotojail':
        this.sendToJail(pid);
        return;
      case 'parking':
        if (this.settings.freeParking && this.pot > 0) {
          const amount = this.pot;
          this.pot = 0;
          this.collect(pid, amount, 'parking');
        }
        return;
      default:
    }
  }

  sendToJail(pid) {
    const p = this.p[pid];
    const from = p.pos;
    p.pos = JAIL;
    p.jailed = true;
    p.jailTurns = 0;
    this.extraRoll = false;
    this.emit('jail', { player: pid, from });
  }

  release(pid, how) {
    const p = this.p[pid];
    p.jailed = false;
    p.jailTurns = 0;
    this.emit('jailFree', { player: pid, how });
  }

  payJail(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    const p = this.p[pid];
    if (!p.jailed) throw new GameError('notInJail');
    if (this.step !== 'roll') throw new GameError('alreadyRolled');
    if (p.cash < JAIL_FINE) throw new GameError('cantAfford');
    this.fee(pid, JAIL_FINE, 'jail');
    this.release(pid, 'fine');
    this.touch();
  }

  useJailCard(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    const p = this.p[pid];
    if (!p.jailed) throw new GameError('notInJail');
    if (this.step !== 'roll') throw new GameError('alreadyRolled');
    if (!p.jailCards.length) throw new GameError('noJailCard');
    const deck = p.jailCards.pop();
    this.decks[deck].push(deck === 'chance' ? CHANCE.find(c => c.kind === 'jailFree').id : CHEST.find(c => c.kind === 'jailFree').id);
    this.release(pid, 'card');
    this.touch();
  }

  // ---------- cards ----------

  drawCard(pid, deck) {
    const pile = this.decks[deck];
    const id = pile.shift();
    const card = (deck === 'chance' ? CHANCE : CHEST)[id];
    this.emit('card', { player: pid, deck, card: id });
    if (card.kind === 'jailFree') this.p[pid].jailCards.push(deck); // leaves the deck until used
    else pile.push(id);
    const p = this.p[pid];
    const others = this.active.filter(id2 => id2 !== pid);
    switch (card.kind) {
      case 'goto': this.moveTo(pid, card.to, { forward: true }); break;
      case 'nearest': {
        let to = p.pos;
        do { to = (to + 1) % 40; } while (SQUARES[to].group !== card.group);
        this.moveTo(pid, to, { forward: true, land: card.group === 'rail' ? { railMult: 2 } : { utilMult: 10 } });
        break;
      }
      case 'back': this.moveTo(pid, (p.pos + 40 - card.steps) % 40, { forward: false }); break;
      case 'collect': this.collect(pid, card.amount, 'card'); break;
      case 'pay': this.fee(pid, card.amount, 'card'); break;
      case 'jail': this.sendToJail(pid); break;
      case 'jailFree': break;
      case 'repairs': {
        let houses = 0;
        let hotels = 0;
        this.owner.forEach((o, i) => {
          if (o !== pid) return;
          if (this.houses[i] === 5) hotels++;
          else houses += this.houses[i];
        });
        this.fee(pid, houses * card.house + hotels * card.hotel, 'repairs');
        break;
      }
      case 'payEach':
        this.charge(pid, others.map(to => ({ to, amount: card.amount })), 'card');
        break;
      case 'collectEach':
        for (const o of others) this.charge(o, [{ to: pid, amount: card.amount }], 'gift');
        break;
      default:
    }
  }

  // ---------- buying and auctions ----------

  buy(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    if (this.step !== 'buy' || this.offer === null) throw new GameError('nothingToBuy');
    const i = this.offer;
    const p = this.p[pid];
    if (p.cash < SQUARES[i].price) throw new GameError('cantAfford');
    p.cash -= SQUARES[i].price;
    this.owner[i] = pid;
    this.offer = null;
    this.step = 'roll'; // settle() decides
    this.emit('buy', { player: pid, square: i, price: SQUARES[i].price });
    this.touch();
    this.settle();
  }

  // Not buying: the property goes up for auction (or stays with the bank).
  decline(pid) {
    this.assertTurn(pid);
    this.assertNoDebt();
    if (this.step !== 'buy' || this.offer === null) throw new GameError('nothingToBuy');
    const i = this.offer;
    this.offer = null;
    this.touch();
    if (!this.settings.auctions) {
      this.emit('decline', { player: pid, square: i });
      this.step = 'roll';
      this.settle();
      return;
    }
    this.step = 'auction';
    this.auction = {
      id: this.seq + 1,
      square: i,
      high: 0,
      bidder: null,
      out: [],
      bids: 0,
      endsAt: this.now() + AUCTION_FIRST_MS,
    };
    this.emit('auction', { player: pid, square: i });
  }

  bidders() {
    return this.active.filter(id => !this.auction.out.includes(id));
  }

  bid(pid, amount) {
    this.assertPlaying();
    this.assertMember(pid);
    const a = this.auction;
    if (!a) throw new GameError('noAuction');
    if (a.out.includes(pid)) throw new GameError('youPassed');
    amount = Math.floor(Number(amount));
    if (!Number.isFinite(amount) || amount <= a.high) throw new GameError('bidTooLow', { min: a.high });
    if (amount > this.p[pid].cash) throw new GameError('cantAfford');
    a.high = amount;
    a.bidder = pid;
    a.bids++;
    a.endsAt = Math.max(a.endsAt, this.now() + AUCTION_MS);
    this.emit('bid', { player: pid, amount });
    if (this.bidders().every(id => id === pid)) this.closeAuction();
  }

  passAuction(pid) {
    this.assertPlaying();
    this.assertMember(pid);
    const a = this.auction;
    if (!a) throw new GameError('noAuction');
    if (a.out.includes(pid)) return false;
    a.out.push(pid);
    this.emit('auctionPass', { player: pid });
    const left = this.bidders();
    if (!left.length || (left.length === 1 && left[0] === a.bidder)) this.closeAuction();
    return true;
  }

  // Called by the server's timer; only closes once time is really up.
  expireAuction() {
    if (!this.auction || this.now() < this.auction.endsAt) return false;
    this.closeAuction();
    return true;
  }

  closeAuction() {
    const a = this.auction;
    if (!a) return;
    this.auction = null;
    if (a.bidder && !this.p[a.bidder].bankrupt) {
      this.owner[a.square] = a.bidder;
      this.emit('auctionWon', { player: a.bidder, square: a.square, amount: a.high });
      this.charge(a.bidder, [{ to: null, amount: a.high }], 'auction');
    } else {
      this.emit('auctionNone', { square: a.square });
    }
    this.step = 'roll';
    this.touch();
    this.settle();
  }

  // ---------- building and mortgages ----------

  assertOwner(pid, i) {
    this.assertPlaying();
    this.assertMember(pid);
    if (!Number.isInteger(i) || !isBuyable(i) || this.owner[i] !== pid) throw new GameError('notYours');
  }

  build(pid, i) {
    this.assertOwner(pid, i);
    this.assertNoAuction();
    if (this.owedBy(pid)) throw new GameError('inDebt', { amount: this.owedBy(pid) });
    const sq = SQUARES[i];
    if (sq.type !== 'street') throw new GameError('notAStreet');
    if (!this.ownsGroup(pid, sq.group)) throw new GameError('needGroup');
    const group = GROUP_SQUARES[sq.group];
    if (group.some(j => this.mortgaged[j])) throw new GameError('groupMortgaged');
    const h = this.houses[i];
    if (h >= 5) throw new GameError('maxBuilt');
    if (h > Math.min(...group.map(j => this.houses[j]))) throw new GameError('buildEvenly');
    if (h === 4 ? this.bank.hotels < 1 : this.bank.houses < 1) throw new GameError(h === 4 ? 'noHotelsLeft' : 'noHousesLeft');
    if (this.p[pid].cash < sq.house) throw new GameError('cantAfford');
    this.p[pid].cash -= sq.house;
    if (h === 4) { this.bank.hotels--; this.bank.houses += 4; } else this.bank.houses--;
    this.houses[i] = h + 1;
    this.emit('build', { player: pid, square: i, houses: h + 1 });
  }

  sell(pid, i) {
    this.assertOwner(pid, i);
    this.assertNoAuction();
    const sq = SQUARES[i];
    const h = this.houses[i];
    if (!h) throw new GameError('noBuildings');
    const group = GROUP_SQUARES[sq.group];
    if (h < Math.max(...group.map(j => this.houses[j]))) throw new GameError('sellEvenly');
    let sold = 1;
    if (h === 5) {
      this.bank.hotels++;
      if (this.bank.houses >= 4) { this.bank.houses -= 4; this.houses[i] = 4; } else {
        // not enough houses in the bank to break the hotel down: it all goes
        sold = 5;
        this.houses[i] = 0;
      }
    } else {
      this.bank.houses++;
      this.houses[i] = h - 1;
    }
    const refund = (sold * sq.house) / 2;
    this.p[pid].cash += refund;
    this.emit('sell', { player: pid, square: i, houses: this.houses[i], amount: refund });
  }

  mortgage(pid, i) {
    this.assertOwner(pid, i);
    this.assertNoAuction();
    if (this.mortgaged[i]) throw new GameError('alreadyMortgaged');
    const sq = SQUARES[i];
    if (sq.type === 'street' && this.groupHasBuildings(sq.group)) throw new GameError('sellBuildingsFirst');
    this.mortgaged[i] = true;
    this.p[pid].cash += mortgageValue(i);
    this.emit('mortgage', { player: pid, square: i, amount: mortgageValue(i) });
  }

  unmortgage(pid, i) {
    this.assertOwner(pid, i);
    this.assertNoAuction();
    if (!this.mortgaged[i]) throw new GameError('notMortgaged');
    if (this.owedBy(pid)) throw new GameError('inDebt', { amount: this.owedBy(pid) });
    const cost = unmortgageCost(i);
    if (this.p[pid].cash < cost) throw new GameError('cantAfford');
    this.p[pid].cash -= cost;
    this.mortgaged[i] = false;
    this.emit('unmortgage', { player: pid, square: i, amount: cost });
  }

  // ---------- debts and bankruptcy ----------

  payDebt(pid) {
    this.assertPlaying();
    const d = this.debts[0];
    if (!d || d.player !== pid) throw new GameError('noDebt');
    const p = this.p[pid];
    if (p.cash < d.amount) throw new GameError('cantPayYet');
    p.cash -= d.amount;
    this.debts.shift();
    this.payOut(d.payees, d.reason);
    this.emit('paid', { player: pid, amount: d.amount, to: d.payees.length === 1 ? d.payees[0].to : null });
    this.touch();
  }

  bankrupt(pid) {
    this.assertPlaying();
    this.assertMember(pid);
    const d = this.debts.find(x => x.player === pid);
    if (!d) throw new GameError('noDebt');
    // owing one player: they get everything; otherwise it all goes back to the bank
    const players = d.payees.filter(x => x.to !== null && x.to !== 'pot');
    const creditor = d.payees.length === 1 && players.length === 1 ? players[0].to : null;
    this.goBankrupt(pid, creditor);
  }

  goBankrupt(pid, creditor) {
    const p = this.p[pid];
    if (p.bankrupt) return;
    // buildings go back to the bank for half their cost
    this.owner.forEach((o, i) => {
      if (o !== pid || !this.houses[i]) return;
      const h = this.houses[i];
      if (h === 5) this.bank.hotels++; else this.bank.houses += h;
      p.cash += (h * SQUARES[i].house) / 2;
      this.houses[i] = 0;
    });
    const props = this.owner.map((o, i) => (o === pid ? i : -1)).filter(i => i >= 0);
    this.debts = this.debts.filter(x => x.player !== pid);
    const heir = creditor && this.p[creditor] && !this.p[creditor].bankrupt ? creditor : null;
    if (heir) {
      this.p[heir].cash += Math.max(0, p.cash);
      for (const i of props) this.owner[i] = heir;
      // mortgaged property costs the new owner 10% interest right away
      const due = props.filter(i => this.mortgaged[i]).reduce((s, i) => s + interest(i), 0);
      this.p[heir].jailCards.push(...p.jailCards);
      if (due) this.charge(heir, [{ to: null, amount: due }], 'interest');
    } else {
      for (const i of props) { this.owner[i] = null; this.mortgaged[i] = false; }
      for (const deck of p.jailCards) this.decks[deck].push((deck === 'chance' ? CHANCE : CHEST).find(c => c.kind === 'jailFree').id);
    }
    p.cash = 0;
    p.jailCards = [];
    p.jailed = false;
    p.bankrupt = true;
    p.place = this.players.length - this.eliminated++;
    this.emit('bankrupt', { player: pid, to: heir });
    this.touch();

    if (this.trade && (this.trade.from === pid || this.trade.to === pid)) this.trade = null;
    if (this.auction) {
      if (this.auction.bidder === pid) { this.auction.bidder = null; this.auction.high = 0; }
      const left = this.bidders();
      if (!left.length || (left.length === 1 && left[0] === this.auction.bidder)) this.closeAuction();
    }
    if (this.active.length <= 1) { this.finish('bankrupt'); return; }
    if (pid === this.current) this.nextTurn();
  }

  // ---------- trades ----------

  cleanSide(raw, pid) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const cash = Math.max(0, Math.floor(Number(r.cash) || 0));
    const props = [...new Set((Array.isArray(r.props) ? r.props : []).map(Number))].filter(i => Number.isInteger(i)).slice(0, 28);
    const cards = Math.max(0, Math.min(2, Math.floor(Number(r.cards) || 0)));
    const side = { cash, props, cards };
    this.checkSide(side, pid);
    return side;
  }

  checkSide(side, pid) {
    const p = this.p[pid];
    if (side.cash > p.cash || side.cards > p.jailCards.length) throw new GameError('badTrade');
    for (const i of side.props) {
      if (!isBuyable(i) || this.owner[i] !== pid) throw new GameError('badTrade');
      if (SQUARES[i].type === 'street' && this.groupHasBuildings(SQUARES[i].group)) throw new GameError('sellBuildingsFirst');
    }
  }

  proposeTrade(pid, offer = {}) {
    this.assertPlaying();
    this.assertMember(pid);
    this.assertNoAuction();
    if (this.trade) throw new GameError('tradeBusy');
    const to = offer.to;
    if (to === pid) throw new GameError('tradeSelf');
    if (!this.p[to] || this.p[to].bankrupt) throw new GameError('noSuchPlayer');
    const give = this.cleanSide(offer.give, pid);
    const take = this.cleanSide(offer.take, to);
    const empty = s => !s.cash && !s.props.length && !s.cards;
    if (empty(give) && empty(take)) throw new GameError('emptyTrade');
    this.trade = { id: this.seq + 1, from: pid, to, give, take, at: this.now() };
    this.emit('tradeOffer', { player: pid, target: to });
    return this.trade;
  }

  respondTrade(pid, accept) {
    this.assertPlaying();
    const t = this.trade;
    if (!t || t.to !== pid) throw new GameError('noTrade');
    this.trade = null;
    if (!accept) { this.emit('tradeDeclined', { player: pid, target: t.from }); return; }
    this.assertNoAuction();
    // things may have changed since the offer
    try {
      this.checkSide(t.give, t.from);
      this.checkSide(t.take, t.to);
    } catch (err) {
      this.emit('tradeFailed', { player: t.from, target: t.to });
      throw err;
    }
    const move = (side, from, to) => {
      this.p[from].cash -= side.cash;
      this.p[to].cash += side.cash;
      for (const i of side.props) this.owner[i] = to;
      for (let k = 0; k < side.cards; k++) this.p[to].jailCards.push(this.p[from].jailCards.pop());
    };
    move(t.give, t.from, t.to);
    move(t.take, t.to, t.from);
    this.emit('tradeDone', { player: t.from, target: t.to, give: t.give, take: t.take });
    // taking over a mortgage costs 10% interest
    const fees = (props, who) => {
      const due = props.filter(i => this.mortgaged[i]).reduce((s, i) => s + interest(i), 0);
      if (due) this.charge(who, [{ to: null, amount: due }], 'interest');
    };
    fees(t.give.props, t.to);
    fees(t.take.props, t.from);
  }

  cancelTrade(pid) {
    const t = this.trade;
    if (!t || t.from !== pid) throw new GameError('noTrade');
    this.trade = null;
    this.emit('tradeCancelled', { player: pid, target: t.to });
  }

  // ---------- the end ----------

  finish(reason) {
    this.phase = 'gameOver';
    this.endReason = reason;
    this.auction = null;
    this.trade = null;
    this.debts = [];
    const alive = this.active.sort((a, b) => this.worth(b) - this.worth(a));
    alive.forEach((id, k) => { this.p[id].place = k + 1; });
    this.standings = [...this.players]
      .sort((a, b) => this.p[a].place - this.p[b].place)
      .map(id => ({ id, place: this.p[id].place, worth: this.p[id].bankrupt ? 0 : this.worth(id), bankrupt: this.p[id].bankrupt }));
    this.winner = alive[0] ?? null;
    this.emit('gameOver', { winner: this.winner, reason });
  }

  // Server hook: a time-limited game also ends between turns, so check on a timer too.
  checkTime() {
    if (this.phase !== 'play' || !this.endsAt || this.now() < this.endsAt) return false;
    if (this.step !== 'roll' || this.debts.length || this.auction) return false;
    this.finish('time');
    return true;
  }

  addPlayer() {
    throw new GameError('waitGameEnd');
  }

  // Someone left the room: they go bankrupt to the bank and leave the table.
  removePlayer(pid) {
    if (!this.p[pid]) return;
    if (this.phase === 'play') this.goBankrupt(pid, null);
    const cur = this.current;
    this.players = this.players.filter(id => id !== pid);
    delete this.p[pid];
    if (this.standings) this.standings = this.standings.filter(s => s.id !== pid);
    this.turn = Math.max(0, this.players.indexOf(cur));
    this.emit('leave', { player: pid });
  }

  // ---------- views ----------

  view(pid) {
    const inGame = Boolean(this.p[pid]) && !this.p[pid].bankrupt;
    const myTurn = inGame && this.phase === 'play' && this.current === pid;
    const me = inGame ? this.p[pid] : null;
    const debt = this.debts[0] || null;
    const blocked = Boolean(debt || this.auction);
    return {
      id: this.id,
      phase: this.phase,
      players: this.players.map(id => {
        const p = this.p[id];
        return {
          id,
          pos: p.pos,
          cash: p.cash,
          jailed: p.jailed,
          jailTurns: p.jailTurns,
          jailCards: p.jailCards.length,
          bankrupt: p.bankrupt,
          place: p.place,
          worth: p.bankrupt ? 0 : this.worth(id),
        };
      }),
      owner: this.owner,
      houses: this.houses,
      mortgaged: this.mortgaged,
      bank: this.bank,
      pot: this.pot,
      current: this.phase === 'play' ? this.current : null,
      actor: this.phase === 'play' ? this.actor : null,
      step: this.step,
      dice: this.lastDice,
      doubles: this.doubles,
      offer: this.offer,
      auction: this.auction,
      debt: debt && { player: debt.player, amount: debt.amount, reason: debt.reason, to: debt.payees.length === 1 ? debt.payees[0].to : null, canCover: this.liquidity(debt.player) >= debt.amount },
      trade: this.trade,
      canRoll: myTurn && !blocked && this.step === 'roll',
      canBuy: myTurn && !blocked && this.step === 'buy' && me.cash >= SQUARES[this.offer].price,
      canDecline: myTurn && !blocked && this.step === 'buy',
      canEnd: myTurn && !blocked && this.step === 'done',
      canPayJail: myTurn && !blocked && this.step === 'roll' && me.jailed && me.cash >= JAIL_FINE,
      canUseCard: myTurn && !blocked && this.step === 'roll' && me.jailed && me.jailCards.length > 0,
      turnStartedAt: this.turnStartedAt,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      settings: this.settings,
      winner: this.winner,
      standings: this.standings,
      endReason: this.endReason,
      events: this.events,
    };
  }
}

module.exports = {
  MonopolyGame, GameError, DEFAULT_SETTINGS, OPTIONS, sanitizeSettings, mortgageValue, unmortgageCost, SALARY, JAIL_FINE,
  AUCTION_MS, AUCTION_FIRST_MS,
};
