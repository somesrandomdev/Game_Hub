'use strict';

// Ludo tournament as a game of the hub server: everything server.js needs to know about it.

const { LudoGame, GameError, DEFAULT_SETTINGS, sanitizeSettings } = require('./game');
const { act } = require('./ai');
require('./messages');

const AWAY_GRACE_MS = 10000;     // autopilot kicks in this long after someone drops
const NEXT_ROUND_MS = 12000;     // break between rounds (to read the results)

// Leave time to watch the die and the piece walking before a bot moves on.
function pause(g, t) {
  const last = g.events.filter(e => e.table === t.id).slice(-3);
  let ms = 700 + Math.random() * 400;
  for (const e of last) {
    if (e.type === 'roll') ms += 450;
    if (e.type === 'move') ms += Math.max(0, e.to - Math.max(e.from, 0)) * 90 + 200;
    if (e.type === 'capture') ms += 700;
    if (e.type === 'noMove' || e.type === 'threeSixes') ms += 600;
  }
  return Math.min(ms, 4000);
}

function autoAct(room, pid) {
  const g = room.game;
  if (!g || g.phase !== 'play') return;
  try { act(g, pid); } catch (err) {
    if (!(err instanceof GameError)) console.error(`[room ${room.code}] ludo bot`, err);
  }
  room.broadcast();
}

module.exports = {
  id: 'ludo',
  name: 'Ludo',
  minPlayers: 2,
  maxPlayers: 16,
  defaults: DEFAULT_SETTINGS,
  sanitizeSettings,
  create: (ids, settings) => new LudoGame(ids, settings),
  startMessage: settings => ({ code: 'ludoOn', params: { target: settings.target } }),

  action(room, m, body) {
    const g = room.game;
    if (!g) throw new GameError('noGame');
    switch (body.action) {
      case 'roll': g.roll(m.id); return true;
      case 'move': g.move(m.id, body.piece); return true;
      default: throw new GameError('unknownAction');
    }
  },

  schedule(room, { plan, at }) {
    const g = room.game;
    if (g.phase === 'roundOver' && g.settings.autoNext) {
      at(g.roundEndedAt + NEXT_ROUND_MS, () => {
        if (g.phase !== 'roundOver' || room.game !== g) return;
        for (const x of room.members.values()) {
          if (x.waiting) { g.addPlayer(x.id); x.waiting = false; }
        }
        g.nextRound();
        room.system('ludoRound', { round: g.round });
        room.broadcast();
      });
      return;
    }
    if (g.phase !== 'play') return;
    // every table plays at its own pace
    for (const t of g.tables) {
      if (t.done) continue;
      const pid = g.current(t);
      const mm = room.members.get(pid);
      const key = `turn:${g.id}:${g.round}:${t.id}:${t.seq}`;
      if (!mm || mm.isBot) {
        at(plan(key, () => Date.now() + pause(g, t)), () => autoAct(room, pid));
      } else if (!mm.connected) {
        at(plan(`${key}:away`, () => Math.max(Date.now() + 1000, (mm.disconnectedAt || 0) + AWAY_GRACE_MS)), () => autoAct(room, pid));
      } else if (g.settings.turnTimer > 0) {
        at(t.turnStartedAt + g.settings.turnTimer * 1000, () => {
          g.emit('timeout', { table: t.id, player: pid });
          autoAct(room, pid);
        });
      }
    }
  },

  NEXT_ROUND_MS,
};
