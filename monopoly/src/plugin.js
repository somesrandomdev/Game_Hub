'use strict';

// Monopoly as a game of the hub server: everything server.js needs to know about it.

const { MonopolyGame, GameError, DEFAULT_SETTINGS, sanitizeSettings } = require('./game');
const { act, nextBid, judgeTrade } = require('./ai');
require('./messages');

const AWAY_GRACE_MS = 10000;     // autopilot kicks in this long after someone drops
const BOT_TRADE_WAIT_MS = 45000; // a bot's offer nobody answers is withdrawn

// Give the table time to watch the token walk and read a card before a bot moves on.
function pause(g) {
  let ms = 1300 + Math.random() * 500; // slow enough for people to follow
  for (const e of g.events.slice(-6)) {
    if (e.type === 'move') ms += 260 + ((e.to - e.from + 40) % 40) * (e.forward ? 120 : 60);
    if (e.type === 'card') ms += 1600;
    if (e.type === 'roll') ms += 500;
  }
  return Math.min(ms, 6000);
}

function autoAct(room, pid, { bot }) {
  const g = room.game;
  if (!g || g.phase !== 'play') return;
  try {
    act(g, pid, { bot });
  } catch (err) {
    if (!(err instanceof GameError)) console.error(`[room ${room.code}] monopoly bot`, err);
    // never leave the table stuck on a bot that can't decide
    try {
      if (g.debts[0]?.player === pid) g.bankrupt(pid);
      else if (g.current === pid && g.step === 'buy') g.decline(pid);
      else if (g.current === pid && g.step === 'done') g.endTurn(pid);
    } catch { /* nothing more to try */ }
  }
  room.broadcast();
}

const num = v => Math.floor(Number(v));

module.exports = {
  id: 'monopoly',
  name: 'Monopoly',
  minPlayers: 2,
  maxPlayers: 8,
  defaults: DEFAULT_SETTINGS,
  sanitizeSettings,
  create: (ids, settings) => new MonopolyGame(ids, settings),
  startMessage: settings => ({ code: 'monoOn', params: { minutes: settings.timeLimit } }),

  action(room, m, body) {
    const g = room.game;
    if (!g) throw new GameError('noGame');
    const id = m.id;
    switch (body.action) {
      case 'roll': g.roll(id); break;
      case 'buy': g.buy(id); break;
      case 'decline': g.decline(id); break;
      case 'bid': g.bid(id, body.amount); break;
      case 'passAuction': return g.passAuction(id);
      case 'endTurn': g.endTurn(id); break;
      case 'payJail': g.payJail(id); break;
      case 'jailCard': g.useJailCard(id); break;
      case 'build': g.build(id, num(body.square)); break;
      case 'sell': g.sell(id, num(body.square)); break;
      case 'mortgage': g.mortgage(id, num(body.square)); break;
      case 'unmortgage': g.unmortgage(id, num(body.square)); break;
      case 'payDebt': g.payDebt(id); break;
      case 'bankrupt': g.bankrupt(id); break;
      case 'trade': g.proposeTrade(id, { to: body.to, give: body.give, take: body.take }); break;
      case 'tradeAnswer': g.respondTrade(id, Boolean(body.accept)); break;
      case 'tradeCancel': g.cancelTrade(id); break;
      default: throw new GameError('unknownAction');
    }
    return true;
  },

  schedule(room, { plan, at }) {
    const g = room.game;
    if (g.phase !== 'play') return;
    const member = id => room.members.get(id);
    const away = mm => mm && !mm.isBot && !mm.connected;
    const awayAt = (key, mm) => plan(key, () => Math.max(Date.now() + 1200, (mm.disconnectedAt || 0) + AWAY_GRACE_MS));

    if (g.endsAt) at(g.endsAt, () => { if (g.checkTime()) room.broadcast(); });

    // auctions: bots bid with a little thinking time, the clock closes it
    const a = g.auction;
    if (a) {
      at(a.endsAt, () => { if (g.expireAuction()) room.broadcast(); });
      for (const pid of g.active) {
        const mm = member(pid);
        if (a.out.includes(pid) || a.bidder === pid || !mm) continue;
        if (mm.isBot) {
          const mood = plan(`mood:${g.id}:${a.id}:${pid}`, () => 0.8 + Math.random() * 0.45);
          at(plan(`bid:${g.id}:${a.id}:${a.bids}:${pid}`, () => Date.now() + 900 + Math.random() * 2200), () => {
            if (g.auction !== a || a.out.includes(pid) || a.bidder === pid) return;
            const amount = nextBid(g, pid, mood);
            if (amount) g.bid(pid, amount); else g.passAuction(pid);
            room.broadcast();
          });
        } else if (away(mm)) {
          at(awayAt(`bidAway:${g.id}:${a.id}:${pid}`, mm), () => {
            if (g.auction === a && g.passAuction(pid)) room.broadcast();
          });
        }
      }
    }

    // trades: bots answer, absent players decline, a bot's ignored offer is withdrawn
    const t = g.trade;
    if (t) {
      const to = member(t.to);
      const done = fn => () => { if (g.trade === t) { fn(); room.broadcast(); } };
      if (to?.isBot) {
        at(plan(`trade:${g.id}:${t.id}`, () => Date.now() + 1400 + Math.random() * 1600), done(() => g.respondTrade(t.to, judgeTrade(g, t.to, t))));
      } else if (away(to)) {
        at(awayAt(`tradeAway:${g.id}:${t.id}`, to), done(() => g.respondTrade(t.to, false)));
      }
      if (member(t.from)?.isBot) at(t.at + BOT_TRADE_WAIT_MS, done(() => g.cancelTrade(t.from)));
    }

    // whoever the game is waiting on: a bot, an absent player, or the turn timer
    if (!a) {
      const actor = g.actor;
      const mm = member(actor);
      const key = `act:${g.id}:${g.seq}`;
      if (mm?.isBot) {
        at(plan(key, () => Date.now() + pause(g)), () => autoAct(room, actor, { bot: true }));
      } else if (away(mm)) {
        at(awayAt(`${key}:away`, mm), () => autoAct(room, actor, { bot: false }));
      } else if (g.settings.turnTimer > 0) {
        at(g.turnStartedAt + g.settings.turnTimer * 1000, () => {
          g.emit('timeout', { player: actor });
          autoAct(room, actor, { bot: false });
        });
      }
    }
  },
};
