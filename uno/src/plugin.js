'use strict';

// UNO as a game of the hub server: everything server.js needs to know about UNO.

const { UnoGame, GameError, DEFAULT_SETTINGS, sanitizeSettings } = require('./game');
const { chooseMove, applyMove } = require('./ai');
require('./messages');

const AWAY_GRACE_MS = 10000;     // autopilot kicks in this long after someone drops

module.exports = {
  id: 'uno',
  name: 'UNO',
  minPlayers: 2,
  maxPlayers: 10,
  defaults: DEFAULT_SETTINGS,
  sanitizeSettings,
  create: (ids, settings) => new UnoGame(ids, settings),
  startMessage: settings => ({ code: 'gameOn', params: { target: settings.targetScore } }),

  action(room, m, body) {
    const g = room.game;
    if (!g) throw new GameError('noGame');
    switch (body.action) {
      case 'play':
        g.play(m.id, [].concat(body.cardIds ?? body.cardId).slice(0, 20), { color: body.color, flipColor: body.flipColor, target: body.target, uno: Boolean(body.uno) });
        return true;
      case 'draw': g.draw(m.id); return true;
      case 'pass': g.pass(m.id); return true;
      case 'challenge': g.challengeDraw4(m.id); return true;
      case 'uno': return g.callUno(m.id);
      case 'catch': g.catchUno(m.id, body.target); return true;
      default: throw new GameError('unknownAction');
    }
  },

  // Bot turns, autopilot, the turn timer and UNO calls/catches. plan() keeps a value
  // across re-plans so re-planning never re-rolls dice.
  schedule(room, { plan, at }) {
    const g = room.game;
    if (g.phase !== 'play') return;
    const cur = g.current;
    const m = room.members.get(cur);
    const key = `turn:${g.id}:${g.seq}`;
    if (m && m.isBot) {
      at(plan(key, () => Date.now() + 650 + Math.random() * 700), () => autoMove(room, cur));
    } else if (m && !m.connected) {
      at(plan(`${key}:away`, () => Math.max(Date.now() + 1200, (m.disconnectedAt || 0) + AWAY_GRACE_MS)), () => autoMove(room, cur, 'away'));
    } else if (g.settings.turnTimer > 0) {
      at(g.turnStartedAt + g.settings.turnTimer * 1000, () => autoMove(room, cur, 'timeout'));
    }

    const bots = g.players.map(id => room.members.get(id)).filter(b => b && b.isBot);
    for (const [vid, vseq] of g.vulnerable) {
      const vm = room.members.get(vid);
      if (vm && vm.isBot) {
        // bots usually pre-call UNO; when they forget they remember a bit later
        at(plan(`unocall:${vid}:${vseq}`, () => Date.now() + 1500 + Math.random() * 2500), () => {
          if (g.vulnerable.has(vid)) { g.callUno(vid); room.broadcast(); }
        });
      }
      const catchers = bots.filter(b => b.id !== vid);
      if (catchers.length) {
        const when = plan(`catch:${vid}:${vseq}`, () => (Math.random() < 0.6 ? Date.now() + 500 + Math.random() * 1200 : null));
        if (when) {
          at(when, () => {
            if (!g.vulnerable.has(vid)) return;
            const by = catchers[Math.floor(Math.random() * catchers.length)];
            g.catchUno(by.id, vid);
            room.broadcast();
          });
        }
      }
    }
  },
};

function autoMove(room, pid, reason) {
  const g = room.game;
  if (!g || g.phase !== 'play' || g.current !== pid) return;
  const m = room.members.get(pid);
  const move = chooseMove(g, pid);
  if (reason === 'timeout' && g.drawn === null) g.emit('timeout', { player: pid });
  // bots remember most of the time; autopilot always covers for a human
  const callUno = move.type === 'play' && g.hands[pid].length - [].concat(move.cardId).length === 1
    && (!m || !m.isBot || Math.random() < 0.8);
  // with unoLastCard the call only counts once the card is down
  if (callUno && !g.settings.unoLastCard) g.callUno(pid);
  applyMove(g, pid, move);
  if (callUno && g.settings.unoLastCard && g.phase === 'play' && g.hands[pid]?.length === 1) g.callUno(pid);
  room.broadcast();
}
