'use strict';

// Zero-dependency LAN UNO server: static files + JSON API + Server-Sent Events.
// Run: node server.js [port] [--online]
// --online also opens a public https link (Cloudflare quick tunnel) for friends elsewhere.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { UnoGame, GameError, DEFAULT_SETTINGS, sanitizeSettings } = require('./src/game');
const { errorText, systemText } = require('./src/messages');
const { chooseMove, applyMove } = require('./src/ai');
const { startTunnel } = require('./src/tunnel');

const PUBLIC_DIR = path.join(__dirname, 'public');
const ARGS = process.argv.slice(2);
const START_PORT = Number(ARGS.find(a => /^\d+$/.test(a)) || process.env.PORT || 3000);
const ONLINE = ARGS.includes('--online');
const MAX_ROOMS = 200;           // online, anyone with the link can create rooms
const MAX_MEMBERS = 10;
const AWAY_GRACE_MS = 10000;     // autopilot kicks in this long after someone drops
const ROOM_IDLE_MS = 30 * 60e3;  // rooms with nobody connected are cleaned up
const BOT_NAMES = ['Botty', 'Robo', 'Chip', 'Pixel', 'Byte', 'Nova', 'Sparky', 'Gizmo', 'Zed', 'Echo', 'Bolt', 'Widget'];
const AVATAR_COLORS = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f45', '#2ec4b6', '#f15bb5', '#9b5de5', '#00bbf9'];
const REACTIONS = ['😂', '😡', '😎', '🔥', '👏', '😭', '🤡', '💀', '🙏', '👀'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const rooms = new Map();
let publicUrl = null;            // https://….trycloudflare.com while the online link is up
const randomId = (bytes = 6) => crypto.randomBytes(bytes).toString('hex');

function newRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => letters[crypto.randomInt(letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanName(raw, fallback = 'Player') {
  const name = String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 16);
  return name || fallback;
}

function lanAddresses() {
  const out = [];
  for (const [ifname, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal) continue;
      out.push({ address: a.address, iface: ifname });
    }
  }
  // real LAN / hotspot addresses first, link-local (169.254.x) last
  const rank = ip => (ip.startsWith('169.254.') ? 2 : ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') ? 0 : 1);
  return out.sort((a, b) => rank(a.address) - rank(b.address));
}

class Room {
  constructor(code) {
    this.code = code;
    this.members = new Map();
    this.hostId = null;
    this.settings = { ...DEFAULT_SETTINGS };
    this.game = null;
    this.chat = [];
    this.timers = [];
    this.plans = new Map();
    this.colorIdx = 0;
    this.lastActive = Date.now();
    this.createdAt = Date.now();
  }

  get humans() { return [...this.members.values()].filter(m => !m.isBot); }
  get anyoneConnected() { return this.humans.some(m => m.connected); }

  uniqueName(name) {
    const taken = new Set([...this.members.values()].map(m => m.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, 13)} ${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  addMember({ name, isBot = false }) {
    const m = {
      id: randomId(4),
      token: isBot ? null : randomId(16),
      name: this.uniqueName(name),
      isBot,
      clients: new Set(),
      connected: isBot,
      disconnectedAt: isBot ? null : Date.now(),
      waiting: Boolean(this.game && this.game.phase !== 'gameOver'),
      color: AVATAR_COLORS[this.colorIdx++ % AVATAR_COLORS.length],
      joinedAt: Date.now(),
    };
    this.members.set(m.id, m);
    if (!this.hostId && !isBot) this.hostId = m.id;
    return m;
  }

  removeMember(id, reason) {
    const m = this.members.get(id);
    if (!m) return;
    for (const res of m.clients) {
      sse(res, { type: 'kicked', reason: reason || 'left' });
      res.end();
    }
    m.clients.clear();
    this.members.delete(id);
    if (this.game && this.game.players.includes(id)) this.game.removePlayer(id);
    if (this.hostId === id) this.pickNewHost();
    if (!this.humans.length) this.destroy();
  }

  pickNewHost() {
    const humans = this.humans;
    const next = humans.find(h => h.connected) || humans[0];
    this.hostId = next ? next.id : null;
  }

  destroy() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    rooms.delete(this.code);
  }

  pushChat(entry) {
    const msg = { id: randomId(3), at: Date.now(), ...entry };
    this.chat.push(msg);
    if (this.chat.length > 120) this.chat.shift();
    this.sendAll({ type: 'chat', msg });
  }

  system(code, params = {}) { this.pushChat({ system: true, code, params, text: systemText(code, params) }); }

  view(memberId) {
    const members = [...this.members.values()].map(m => ({
      id: m.id, name: m.name, isBot: m.isBot, connected: m.connected, waiting: m.waiting, color: m.color,
    }));
    return {
      code: this.code,
      me: memberId,
      hostId: this.hostId,
      members,
      settings: this.settings,
      game: this.game ? this.game.view(memberId) : null,
      serverTime: Date.now(),
    };
  }

  send(memberId, msg) {
    const m = this.members.get(memberId);
    if (!m) return;
    for (const res of m.clients) sse(res, msg);
  }

  sendAll(msg) {
    const data = JSON.stringify(msg);
    for (const m of this.members.values()) for (const res of m.clients) res.write(`data: ${data}\n\n`);
  }

  broadcast() {
    this.lastActive = Date.now();
    for (const m of this.members.values()) {
      if (!m.clients.size) continue;
      const data = JSON.stringify({ type: 'state', state: this.view(m.id) });
      for (const res of m.clients) res.write(`data: ${data}\n\n`);
    }
    this.schedule();
  }

  safely(fn) {
    try { fn(); } catch (err) {
      if (!(err instanceof GameError)) console.error(`[room ${this.code}]`, err);
    }
  }

  // Everything time-based (bot turns, autopilot, turn timer, UNO calls/catches) is
  // re-planned after each broadcast. Plans are keyed so re-planning never re-rolls dice.
  schedule() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    const used = new Map();
    const plan = (key, make) => {
      const v = this.plans.has(key) ? this.plans.get(key) : make();
      used.set(key, v);
      return v;
    };
    const at = (time, fn) => {
      this.timers.push(setTimeout(() => this.safely(fn), Math.max(0, time - Date.now())));
    };
    const g = this.game;

    if (g && g.phase === 'play' && this.anyoneConnected) {
      const cur = g.current;
      const m = this.members.get(cur);
      const key = `turn:${g.id}:${g.seq}`;
      if (m && m.isBot) {
        at(plan(key, () => Date.now() + 850 + Math.random() * 900), () => this.autoMove(cur));
      } else if (m && !m.connected) {
        at(plan(`${key}:away`, () => Math.max(Date.now() + 1200, (m.disconnectedAt || 0) + AWAY_GRACE_MS)), () => this.autoMove(cur, 'away'));
      } else if (g.settings.turnTimer > 0) {
        at(g.turnStartedAt + g.settings.turnTimer * 1000, () => this.autoMove(cur, 'timeout'));
      }

      const bots = g.players.map(id => this.members.get(id)).filter(b => b && b.isBot);
      for (const [vid, vseq] of g.vulnerable) {
        const vm = this.members.get(vid);
        if (vm && vm.isBot) {
          // bots usually pre-call UNO; when they forget they remember a bit later
          at(plan(`unocall:${vid}:${vseq}`, () => Date.now() + 1500 + Math.random() * 2500), () => {
            if (g.vulnerable.has(vid)) { g.callUno(vid); this.broadcast(); }
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
              this.broadcast();
            });
          }
        }
      }
    }

    // hand the crown over if the host has been gone a while
    const host = this.members.get(this.hostId);
    if (host && !host.connected) {
      const other = this.humans.find(h => h.connected);
      if (other) {
        at(plan(`host:${host.id}:${host.disconnectedAt}`, () => (host.disconnectedAt || Date.now()) + 20000), () => {
          if (this.members.get(this.hostId)?.connected) return;
          this.pickNewHost();
          const nh = this.members.get(this.hostId);
          if (nh) this.system('newHost', { name: nh.name });
          this.broadcast();
        });
      }
    }
    this.plans = used;
  }

  autoMove(pid, reason) {
    const g = this.game;
    if (!g || g.phase !== 'play' || g.current !== pid) return;
    const m = this.members.get(pid);
    const move = chooseMove(g, pid);
    if (reason === 'timeout' && g.drawn === null) g.emit('timeout', { player: pid });
    // bots remember most of the time; autopilot always covers for a human
    const callUno = move.type === 'play' && g.hands[pid].length - [].concat(move.cardId).length === 1
      && (!m || !m.isBot || Math.random() < 0.8);
    // with unoLastCard the call only counts once the card is down
    if (callUno && !g.settings.unoLastCard) g.callUno(pid);
    applyMove(g, pid, move);
    if (callUno && g.settings.unoLastCard && g.phase === 'play' && g.hands[pid]?.length === 1) g.callUno(pid);
    this.broadcast();
  }

  handleAction(m, body) {
    const g = this.game;
    const isHost = this.hostId === m.id;
    const needHost = () => { if (!isHost) throw new GameError('hostOnly'); };
    const needGame = () => { if (!this.game) throw new GameError('noGame'); return this.game; };

    switch (body.action) {
      case 'settings':
        needHost();
        if (g && g.phase !== 'gameOver') throw new GameError('rulesBetweenGames');
        this.settings = sanitizeSettings(body.settings, this.settings);
        break;
      case 'addBot': {
        needHost();
        if (this.members.size >= MAX_MEMBERS) throw new GameError('roomFull');
        const used = new Set([...this.members.values()].map(x => x.name));
        const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot';
        const bot = this.addMember({ name, isBot: true });
        this.system('botJoined', { name: bot.name, waiting: bot.waiting });
        break;
      }
      case 'kick': {
        needHost();
        const target = this.members.get(body.target);
        if (!target) throw new GameError('noSuchPlayer');
        if (target.id === m.id) throw new GameError('useLeave');
        this.removeMember(target.id, 'kicked');
        this.system('removed', { name: target.name });
        break;
      }
      case 'start': {
        needHost();
        if (g && g.phase !== 'gameOver') throw new GameError('gameRunning');
        const ids = [...this.members.keys()];
        if (ids.length < 2) throw new GameError('needTwoBot');
        for (const x of this.members.values()) x.waiting = false;
        this.game = new UnoGame(ids, this.settings);
        this.plans.clear();
        this.system('gameOn', { target: this.settings.targetScore });
        break;
      }
      case 'nextRound': {
        needHost();
        const game = needGame();
        if (game.phase !== 'roundOver') throw new GameError('roundNotOver');
        for (const x of this.members.values()) {
          if (x.waiting) { game.addPlayer(x.id); x.waiting = false; }
        }
        game.nextRound();
        break;
      }
      case 'lobby':
        needHost();
        this.game = null;
        for (const x of this.members.values()) x.waiting = false;
        this.system('lobby');
        break;
      case 'play':
        needGame().play(m.id, [].concat(body.cardIds ?? body.cardId).slice(0, 20), { color: body.color, target: body.target });
        break;
      case 'draw': needGame().draw(m.id); break;
      case 'pass': needGame().pass(m.id); break;
      case 'challenge': needGame().challengeDraw4(m.id); break;
      case 'uno':
        if (!needGame().callUno(m.id)) return false;
        break;
      case 'catch': needGame().catchUno(m.id, body.target); break;
      case 'chat': {
        const text = String(body.text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240);
        if (!text) return false;
        this.pushChat({ from: m.id, name: m.name, color: m.color, text });
        return false;
      }
      case 'react':
        if (!REACTIONS.includes(body.emoji)) throw new GameError('unknownReaction');
        this.sendAll({ type: 'react', from: m.id, emoji: body.emoji });
        return false;
      case 'leave':
        this.system('left', { name: m.name });
        this.removeMember(m.id, 'left');
        break;
      default:
        throw new GameError('unknownAction');
    }
    return true;
  }
}

function sse(res, msg) {
  res.write(`data: ${JSON.stringify(msg)}\n\n`);
}

function fail(res, status, code, params) {
  json(res, status, { error: errorText(code, params), code, params });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 64 * 1024) { reject(new GameError('requestTooLarge')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new GameError('badJson')); }
    });
    req.on('error', reject);
  });
}

function findMember(code, token) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room || !token) return {};
  const member = [...room.members.values()].find(m => m.token === token);
  return member ? { room, member } : { room };
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

function openStream(req, res, url) {
  const { room, member } = findMember(url.searchParams.get('code'), url.searchParams.get('token'));
  if (!member) return fail(res, 404, 'memberNotFound');
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  res.writeHead(200, {
    // exactly this (no charset): tunnels/proxies match it to stream instead of buffering
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 1500\n\n');
  attachClient(room, member, res);
  req.on('close', () => detachClient(room, member, res));
}

// A member's clients are anything with write()/end() that takes SSE frames: a live
// event stream, or a PollClient for networks that hold streams back.
function attachClient(room, member, client) {
  const wasConnected = member.connected;
  member.clients.add(client);
  member.connected = true;
  member.disconnectedAt = null;
  sse(client, { type: 'chatHistory', messages: room.chat });
  if (!wasConnected && room.members.size > 1) room.system('connected', { name: member.name });
  room.broadcast();
}

function detachClient(room, member, client) {
  if (!member.clients.delete(client)) return;
  if (member.clients.size || !room.members.has(member.id)) return;
  member.connected = false;
  member.disconnectedAt = Date.now();
  room.broadcast();
}

// ---------------- long polling ----------------
// Some proxies (Cloudflare quick tunnels among them) deliver an event stream only when
// it closes. Those browsers poll instead: each request is held open until there is
// something to say, so updates still arrive right away.

const POLL_HOLD_MS = 25000;   // answer an idle poll after this long
const POLL_GONE_MS = 12000;   // no poll for this long = disconnected
const polls = new Map();      // cid -> PollClient

class PollClient {
  constructor(room, member) {
    this.id = randomId(12);
    this.room = room;
    this.member = member;
    this.queue = [];
    this.waiting = null;      // the held response
    this.holdTimer = 0;
    this.closed = false;
    this.seen = Date.now();
  }

  write(frame) {
    if (!frame.startsWith('data: ')) return; // pings and retry hints are for streams
    this.queue.push(JSON.parse(frame.slice(6)));
    if (this.waiting) setImmediate(() => this.flush()); // let a burst of writes batch up
  }

  end() {
    this.closed = true;
    if (this.waiting) setImmediate(() => this.flush());
  }

  hold(res) {
    this.seen = Date.now();
    if (this.waiting) this.flush(); // a newer poll replaces the old one
    this.waiting = res;
    res.on('close', () => { if (this.waiting === res) { this.waiting = null; clearTimeout(this.holdTimer); } });
    if (this.queue.length || this.closed) return this.flush();
    this.holdTimer = setTimeout(() => this.flush(), POLL_HOLD_MS);
  }

  flush() {
    const res = this.waiting;
    if (!res) return;
    this.waiting = null;
    clearTimeout(this.holdTimer);
    json(res, 200, { cid: this.id, messages: this.queue.splice(0) });
    this.seen = Date.now();
    if (this.closed) polls.delete(this.id);
  }
}

function openPoll(req, res, url) {
  const cid = url.searchParams.get('cid');
  let client = cid && polls.get(cid);
  if (!client) {
    const { room, member } = findMember(url.searchParams.get('code'), url.searchParams.get('token'));
    if (!member) return fail(res, 404, 'memberNotFound');
    client = new PollClient(room, member);
    polls.set(client.id, client);
    attachClient(room, member, client);
  }
  req.socket.setTimeout(0);
  client.hold(res);
}

setInterval(() => {
  const now = Date.now();
  for (const [cid, c] of polls) {
    if (c.waiting || now - c.seen < POLL_GONE_MS) continue;
    polls.delete(cid);
    detachClient(c.room, c.member, c);
  }
}, 3000).unref();

async function handleApi(req, res, url) {
  const route = url.pathname.slice('/api/'.length);

  if (req.method === 'GET') {
    if (route === 'stream') return openStream(req, res, url);
    if (route === 'poll') return openPoll(req, res, url);
    if (route === 'info') return json(res, 200, { addresses: lanAddresses(), port: server.address().port, online: ONLINE, publicUrl });
    if (route === 'rooms') {
      const list = [...rooms.values()]
        .filter(r => r.anyoneConnected)
        .map(r => ({
          code: r.code,
          host: r.members.get(r.hostId)?.name || '?',
          players: r.members.size,
          status: r.game ? (r.game.phase === 'gameOver' ? 'finished' : 'playing') : 'lobby',
        }));
      return json(res, 200, { rooms: list });
    }
    return fail(res, 404, 'notFound');
  }

  if (req.method !== 'POST') return fail(res, 405, 'methodNotAllowed');
  const body = await readBody(req);

  if (route === 'create') {
    if (rooms.size >= MAX_ROOMS) return fail(res, 503, 'tooManyRooms');
    const room = new Room(newRoomCode());
    rooms.set(room.code, room);
    const m = room.addMember({ name: cleanName(body.name) });
    room.system('created', { name: m.name });
    console.log(`Room ${room.code} created by ${m.name}`);
    return json(res, 200, { code: room.code, id: m.id, token: m.token });
  }

  if (route === 'join') {
    const code = String(body.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return fail(res, 404, 'roomNotFound', { code });
    const existing = body.token && [...room.members.values()].find(m => m.token === body.token);
    if (existing) return json(res, 200, { code, id: existing.id, token: existing.token });
    if (room.members.size >= MAX_MEMBERS) return fail(res, 409, 'roomFullMax');
    const m = room.addMember({ name: cleanName(body.name) });
    room.system('joined', { name: m.name, waiting: m.waiting });
    room.broadcast();
    return json(res, 200, { code, id: m.id, token: m.token });
  }

  if (route === 'check') {
    const { member } = findMember(body.code, body.token);
    return member ? json(res, 200, { ok: true }) : fail(res, 404, 'sessionExpired');
  }

  if (route === 'action') {
    const { room, member } = findMember(body.code, body.token);
    if (!member) return fail(res, 404, 'memberNotFound');
    const changed = room.handleAction(member, body);
    if (changed && rooms.has(room.code)) room.broadcast();
    return json(res, 200, { ok: true });
  }

  return fail(res, 404, 'notFound');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, url.pathname);
    else fail(res, 405, 'methodNotAllowed');
  } catch (err) {
    if (err instanceof GameError) return fail(res, 400, err.code, err.params);
    console.error(err);
    if (!res.headersSent) fail(res, 500, 'serverError');
  }
});
server.keepAliveTimeout = 65000;

// keep SSE connections alive through sleepy Wi-Fi and phones
setInterval(() => {
  for (const room of rooms.values()) {
    for (const m of room.members.values()) for (const res of m.clients) res.write(': ping\n\n');
  }
}, 15000).unref();

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (!room.anyoneConnected && now - room.lastActive > ROOM_IDLE_MS) {
      console.log(`Room ${room.code} closed (idle)`);
      room.destroy();
    }
  }
}, 60000).unref();

function listen(port, attemptsLeft = 10) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  server.listen(port, '0.0.0.0', () => {
    const p = server.address().port;
    const line = '='.repeat(56);
    console.log(`\n${line}\n  UNO server is running!\n${line}`);
    console.log(`  On this PC:        http://localhost:${p}`);
    const addrs = lanAddresses();
    if (!addrs.length) console.log('  (no network found: connect to Wi-Fi or turn on Mobile Hotspot)');
    for (const a of addrs) {
      const note = a.address.startsWith('169.254.') ? '  (link-local, may not work)' : '';
      console.log(`  Friends open:      http://${a.address}:${p}   [${a.iface}]${note}`);
    }
    console.log(`${line}\n  Press Ctrl+C to stop.\n`);
    if (ONLINE) goOnline(p);
  });
}

function goOnline(port) {
  console.log('  Opening the online link...');
  startTunnel(port, {
    onUrl(url) {
      publicUrl = url;
      if (!url) return;
      const line = '='.repeat(56);
      console.log(`\n${line}\n  ONLINE! Friends anywhere can open:\n\n     ${url}\n\n  (it's also in the lobby, with a QR code)\n${line}\n`);
    },
  }).catch(err => console.log(`  Online mode failed: ${err.message}\n  Playing on the same Wi-Fi still works.`));
}

if (require.main === module) listen(START_PORT);

module.exports = { server, rooms, Room, listen };
