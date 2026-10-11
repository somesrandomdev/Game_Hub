'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { server, rooms } = require('../server');

let base;

test.before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  for (const r of rooms.values()) r.destroy();
  server.closeAllConnections?.();
  server.close();
});

async function post(path, body) {
  const res = await fetch(`${base}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// Minimal SSE client on top of fetch streaming.
function listen(session) {
  const ctrl = new AbortController();
  const client = { states: [], chats: [], signals: [], kicked: null, latest: null, waiters: [] };
  client.close = () => ctrl.abort();
  client.waitFor = (pred, ms = 8000) => new Promise((resolve, reject) => {
    if (client.latest && pred(client.latest)) return resolve(client.latest);
    const timer = setTimeout(() => reject(new Error('timed out waiting for state')), ms);
    client.waiters.push({ pred, resolve: s => { clearTimeout(timer); resolve(s); } });
  });
  (async () => {
    const res = await fetch(`${base}/api/stream?code=${session.code}&token=${session.token}`, { signal: ctrl.signal });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.split('\n').find(l => l.startsWith('data: '));
        if (!line) continue;
        const msg = JSON.parse(line.slice(6));
        if (msg.type === 'state') {
          client.latest = msg.state;
          client.states.push(msg.state);
          client.waiters = client.waiters.filter(w => (w.pred(msg.state) ? (w.resolve(msg.state), false) : true));
        } else if (msg.type === 'chat') client.chats.push(msg.msg);
        else if (msg.type === 'kicked') client.kicked = msg.reason;
        else if (msg.type === 'signal') client.signals.push(msg);
      }
    }
  })().catch(() => {});
  return client;
}

test('static files are served and traversal is blocked', async () => {
  const hub = await fetch(`${base}/`);
  assert.equal(hub.status, 200);
  assert.match(await hub.text(), /Game Night/);
  const uno = await fetch(`${base}/uno/`);
  assert.match(await uno.text(), /UNO Night/);
  const mono = await fetch(`${base}/monopoly/`);
  assert.match(await mono.text(), /Monopoly/);
  const js = await fetch(`${base}/uno/js/app.js`);
  assert.match(js.headers.get('content-type'), /javascript/);
  const shared = await fetch(`${base}/shared/voice.js`);
  assert.equal(shared.status, 200);
  // every shared module a game page imports is actually served
  for (const gameDir of ['uno', 'monopoly', 'ludo', 'hub']) {
    const dir = path.join(__dirname, '..', gameDir, gameDir === 'hub' ? '' : 'public/js');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const [, url] of src.matchAll(/from '(\/shared\/[^']+)'/g)) {
        assert.equal((await fetch(`${base}${url}`)).status, 200, `${gameDir}/${file} imports ${url}`);
      }
    }
  }
  const board = await (await fetch(`${base}/monopoly/board.json`)).json();
  assert.equal(board.squares.length, 40);
  const bare = await fetch(`${base}/monopoly`, { redirect: 'manual' });
  assert.equal(bare.status, 302);
  assert.equal(bare.headers.get('location'), '/monopoly/');
  for (const evil of ['/..%2fserver.js', '/uno/..%2f..%2fserver.js', '/shared/..%2fserver.js', '/%E0%A4%A']) {
    const res = await fetch(`${base}${evil}`);
    assert.ok([400, 403, 404].includes(res.status), evil);
  }
});

test('games, rooms per game, and invite links that find the right game', async () => {
  const { games } = await (await fetch(`${base}/api/games`)).json();
  assert.deepEqual(games.map(g => g.id), ['uno', 'monopoly', 'ludo']);

  const m = (await post('create', { name: 'Rich', game: 'monopoly' })).data;
  assert.equal(m.game, 'monopoly');
  const u = (await post('create', { name: 'Cardy' })).data;
  assert.equal(u.game, 'uno');
  assert.equal((await post('create', { name: 'x', game: 'chess' })).status, 400);
  const mc = listen(m);
  const uc = listen(u);
  await mc.waitFor(s => s.gameType === 'monopoly');
  await uc.waitFor(s => s.gameType === 'uno');

  const only = await (await fetch(`${base}/api/rooms?game=monopoly`)).json();
  assert.ok(only.rooms.some(r => r.code === m.code && r.game === 'monopoly'));
  assert.ok(!only.rooms.some(r => r.code === u.code));
  const all = await (await fetch(`${base}/api/rooms`)).json();
  assert.ok(all.rooms.some(r => r.code === u.code));

  const room = await (await fetch(`${base}/api/room?code=${m.code.toLowerCase()}`)).json();
  assert.equal(room.game, 'monopoly');
  assert.equal((await fetch(`${base}/api/room?code=QQQQ`)).status, 404);

  const wrong = await post('join', { code: m.code, name: 'Lost', game: 'uno' });
  assert.equal(wrong.status, 409);
  assert.equal(wrong.data.code, 'wrongGame');
  assert.equal(wrong.data.params.game, 'monopoly');

  const invite = await fetch(`${base}/?room=${m.code}`, { redirect: 'manual' });
  assert.equal(invite.status, 302);
  assert.equal(invite.headers.get('location'), `/monopoly/?room=${m.code}`);
  mc.close();
  uc.close();
});

test('monopoly: bots play their turns, you play yours', { timeout: 180000 }, async () => {
  const host = (await post('create', { name: 'Mo', game: 'monopoly' })).data;
  const hc = listen(host);
  await hc.waitFor(s => s.members.length === 1);
  const act = (action, extra = {}) => post('action', { code: host.code, token: host.token, action, ...extra });
  assert.equal((await act('start')).status, 400); // alone
  await act('addBot');
  await act('addBot');
  assert.equal((await act('settings', { settings: { startCash: 2000, timeLimit: 0, evil: 1 } })).status, 200);
  const lobby = await hc.waitFor(s => s.members.length === 3 && s.settings.startCash === 2000);
  assert.equal(lobby.settings.evil, undefined);
  assert.equal((await act('start')).status, 200);
  const started = await hc.waitFor(s => s.game);
  assert.equal(started.game.players.length, 3);
  assert.equal(started.game.players[0].cash, 2000);
  assert.ok(hc.chats.some(c => c.code === 'monoOn'));

  // play a few of our own turns; bots must keep the game moving in between
  // (auctions can run a while: every bid restarts their clock)
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  let mine = 0;
  let lastSeq = -1;
  let quiet = 0;
  // bots pause between moves so people can follow, so this takes a while
  const until = Date.now() + 150000;
  while (Date.now() < until && mine < 2) {
    await sleep(100);
    const g = hc.latest.game;
    if (g.phase !== 'play') break;
    const seq = g.events.at(-1).seq;
    quiet = seq === lastSeq ? quiet + 1 : 0;
    lastSeq = seq;
    assert.ok(quiet < 250, `game stalled: ${JSON.stringify({ actor: g.actor, step: g.step, debt: g.debt, auction: g.auction })}`);
    let r = null;
    if (g.trade?.to === host.id) r = await act('tradeAnswer', { accept: false });
    else if (g.auction && !g.auction.out.includes(host.id)) r = await act('passAuction');
    else if (g.debt?.player === host.id) r = await act('bankrupt');
    else if (g.canRoll) r = await act('roll');
    else if (g.canBuy) r = await act('buy');
    else if (g.canDecline) r = await act('decline');
    else if (g.canEnd) { r = await act('endTurn'); mine++; }
    // a state from just before our move can still be the latest one: wait for news
    if (r) { assert.equal(r.status, 200, JSON.stringify(r.data)); await hc.waitFor(x => x.game.events.at(-1).seq !== seq, 20000); }
  }
  const last = hc.latest.game;
  assert.ok(last.phase !== 'play' || mine === 2, `only played ${mine} turns`);
  assert.ok(last.events.some(e => e.type === 'turn' && e.player !== host.id), 'bots took turns');
  const bad = await act('build', { square: 39 });
  assert.equal(bad.status, 400);
  hc.close();
});

test('info reports the port', async () => {
  const res = await fetch(`${base}/api/info`);
  const data = await res.json();
  assert.equal(data.port, server.address().port);
  assert.ok(Array.isArray(data.addresses));
});

test('full flow: create, join, bot, play to the end', { timeout: 120000 }, async () => {
  const host = (await post('create', { name: 'Khalil' })).data;
  assert.match(host.code, /^[A-Z]{4}$/);
  const friend = (await post('join', { code: host.code.toLowerCase(), name: 'Khalil' })).data;
  assert.ok(friend.token);

  const bad = await post('join', { code: 'ZZZZ', name: 'x' });
  assert.equal(bad.status, 404);

  const hc = listen(host);
  const fc = listen(friend);
  const lobby = await fc.waitFor(s => s.members.length === 2 && s.members.every(m => m.connected));
  assert.equal(lobby.game, null);
  assert.deepEqual(lobby.members.map(m => m.name).sort(), ['Khalil', 'Khalil 2']);

  // only the host may change rules / start
  assert.equal((await post('action', { ...friend, action: 'start' })).status, 400);
  assert.equal((await post('action', { ...host, action: 'settings', settings: { targetScore: 0, startCards: 5, stacking: true } })).status, 200);
  await hc.waitFor(s => s.settings.startCards === 5 && s.settings.stacking);
  assert.equal((await post('action', { ...host, action: 'addBot' })).status, 200);
  await hc.waitFor(s => s.members.length === 3);

  // rejoining with the same token keeps your seat
  const again = (await post('join', { code: host.code, name: 'whatever', token: friend.token })).data;
  assert.equal(again.id, friend.id);

  assert.equal((await post('action', { ...host, action: 'start' })).status, 200);
  const started = await hc.waitFor(s => s.game && s.game.phase === 'play');
  assert.equal(started.game.hand.length >= 5, true);
  assert.equal(started.game.players.length, 3);

  // hands are private
  const fstate = await fc.waitFor(s => s.game);
  const hostIds = new Set(started.game.hand.map(c => c.id));
  assert.ok(fstate.game.hand.every(c => !hostIds.has(c.id)));

  // chat goes to everyone
  await post('action', { ...friend, action: 'chat', text: 'gg <b>ez</b>' });
  await new Promise(r => setTimeout(r, 200));
  assert.ok(hc.chats.some(m => m.text === 'gg <b>ez</b>' && m.name === 'Khalil 2'));

  // play out the game: humans act with a naive strategy, the bot plays itself
  const sessions = { [host.id]: host, [friend.id]: friend };
  const clients = { [host.id]: hc, [friend.id]: fc };
  let moves = 0;
  for (;;) {
    const s = hc.latest;
    if (s.game.phase !== 'play') break;
    const cur = s.game.current;
    if (!sessions[cur]) { await new Promise(r => setTimeout(r, 100)); continue; }
    const view = clients[cur].latest.game;
    if (view.current !== cur) { await new Promise(r => setTimeout(r, 30)); continue; }
    let seq = view.events.at(-1)?.seq;
    let res;
    if (view.playable.length) {
      const card = view.hand.find(c => c.id === view.playable[0]);
      if (view.hand.length === 2 && !view.safe) {
        await post('action', { ...sessions[cur], action: 'uno' });
        seq = (await clients[cur].waitFor(st => st.game.events.some(e => e.type === 'uno' && e.seq > seq))).game.events.at(-1).seq;
      }
      res = await post('action', { ...sessions[cur], action: 'play', cardId: card.id, color: 'red' });
    } else if (view.canPass) {
      res = await post('action', { ...sessions[cur], action: 'pass' });
    } else {
      res = await post('action', { ...sessions[cur], action: 'draw' });
    }
    assert.equal(res.status, 200, JSON.stringify(res.data));
    await clients[cur].waitFor(st => st.game && st.game.events.at(-1)?.seq !== seq);
    assert.ok(++moves < 2000, 'game should end');
  }
  const final = await hc.waitFor(s => s.game.phase === 'gameOver');
  assert.ok(final.game.roundResult.winner);

  // back to lobby, then leaving hands host over / destroys the room
  assert.equal((await post('action', { ...host, action: 'lobby' })).status, 200);
  await fc.waitFor(s => s.game === null);
  await post('action', { ...host, action: 'leave' });
  const after = await fc.waitFor(s => s.hostId === friend.id);
  assert.equal(after.members.length, 2);
  await post('action', { ...friend, action: 'leave' });
  assert.equal(rooms.has(host.code), false);
  hc.close();
  fc.close();
});

test('autopilot covers a disconnected player', { timeout: 30000 }, async () => {
  const a = (await post('create', { name: 'A' })).data;
  const b = (await post('join', { code: a.code, name: 'B' })).data;
  const ac = listen(a);
  const bc = listen(b);
  await ac.waitFor(s => s.members.length === 2 && s.members.every(m => m.connected));
  await post('action', { ...a, action: 'settings', settings: { turnTimer: 1 } });
  await post('action', { ...a, action: 'start' });
  const s0 = await ac.waitFor(s => s.game && s.game.phase === 'play');
  const firstSeq = s0.game.events.at(-1).seq;
  // nobody moves: the 1-second turn timer must make progress on its own
  const s1 = await ac.waitFor(s => s.game.events.some(e => e.type === 'timeout' && e.seq > firstSeq), 10000);
  assert.ok(s1);
  ac.close();
  bc.close();
  for (const r of rooms.values()) r.destroy();
});

test('long polling: held polls get updates as they happen, and a stop marks you away', { timeout: 30000 }, async () => {
  const host = (await post('create', { name: 'Poller' })).data;
  const poll = async cid => (await fetch(`${base}/api/poll?code=${host.code}&token=${host.token}&cid=${cid || ''}`)).json();

  const first = await poll();
  assert.ok(first.cid);
  assert.deepEqual(first.messages.map(m => m.type).slice(0, 2), ['chatHistory', 'state']);
  assert.equal(first.messages.find(m => m.type === 'state').state.members[0].connected, true);

  // a held poll answers as soon as something changes
  const held = poll(first.cid);
  await new Promise(r => setTimeout(r, 300));
  const t0 = Date.now();
  await post('action', { code: host.code, token: host.token, action: 'addBot' });
  const next = await held;
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(next.messages.filter(m => m.type === 'state').pop().state.members.length, 2);

  await post('action', { code: host.code, token: host.token, action: 'leave' });
  const last = await poll(first.cid);
  assert.ok(last.messages.some(m => m.type === 'kicked'));
});

test('voice chat: who is in it shows in the room, and setup messages reach only their target', async () => {
  const { data: a } = await post('create', { name: 'Ann' });
  const { data: b } = await post('join', { code: a.code, name: 'Ben' });
  const { data: c } = await post('join', { code: a.code, name: 'Cid' });
  const la = listen(a); const lb = listen(b); const lc = listen(c);
  await lb.waitFor(s => s.members.length === 3 && s.members.every(m => m.connected));

  await post('action', { code: a.code, token: a.token, action: 'voice', on: true, muted: true });
  const s = await lb.waitFor(st => st.members.find(m => m.id === a.id).voice);
  assert.equal(s.members.find(m => m.id === a.id).voiceMuted, true);

  const offer = { sdp: { type: 'offer', sdp: 'v=0' } };
  await post('action', { code: a.code, token: a.token, action: 'signal', target: b.id, data: offer });
  await new Promise(r => setTimeout(r, 150));
  assert.deepEqual(lb.signals.map(m => [m.from, m.data]), [[a.id, offer]]);
  assert.equal(lc.signals.length, 0);
  const bad = await post('action', { code: a.code, token: a.token, action: 'signal', target: 'nobody', data: offer });
  assert.equal(bad.status, 400);

  // dropping off takes you out of the voice chat
  la.close();
  await lb.waitFor(st => !st.members.find(m => m.id === a.id).connected);
  assert.equal(lb.latest.members.find(m => m.id === a.id).voice, false);
  lb.close(); lc.close();
});
