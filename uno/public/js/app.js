import { createCard, createBack, cardName, sortHand, tiltFor, COLOR_HEX } from './cards.js';
import { sfx, isMuted, setMuted } from './sound.js';
import { fly, toast, bubble, confetti, vibrate } from './fx.js';
import { t, has, getLang, setLang, applyStatic, onLangChange } from './i18n.js';

// ================================================================
// helpers
// ================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888');
const cap = str => str.charAt(0).toUpperCase() + str.slice(1);

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`uno.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(`uno.${key}`);
      else localStorage.setItem(`uno.${key}`, JSON.stringify(value));
    } catch { /* storage blocked */ }
  },
};

const cardsOpt = n => [n, () => t('opt.cards', { n })];
const SETTINGS_UI = [
  { key: 'startCards', type: 'select', options: [cardsOpt(5), cardsOpt(7), cardsOpt(10), cardsOpt(15)] },
  { key: 'targetScore', hint: true, type: 'select', options: [[0, () => t('opt.oneRound')], ...[100, 250, 500, 1000].map(n => [n, () => t('opt.points', { n })])] },
  { key: 'turnTimer', hint: true, type: 'select', options: [[0, () => t('opt.off')], ...[15, 30, 60].map(n => [n, () => t('opt.seconds', { n })])] },
  { key: 'unoPenalty', type: 'select', options: [cardsOpt(2), cardsOpt(4)] },
  { key: 'stacking', hint: true, type: 'bool' },
  { key: 'challenge', hint: true, type: 'bool' },
  { key: 'drawUntilPlayable', hint: true, type: 'bool' },
  { key: 'forcePlay', hint: true, type: 'bool' },
  { key: 'sevenZero', hint: true, type: 'bool' },
  { key: 'jumpIn', hint: true, type: 'bool' },
];
const SORT_MODES = ['color', 'value', 'none'];
const REACTIONS = ['😂', '😡', '😎', '🔥', '👏', '😭', '🤡', '💀', '🙏', '👀'];

const app = {
  session: null,
  state: null,
  es: null,
  info: null,
  booting: true,
  lastSeq: 0,
  gameId: null,
  sortMode: store.get('sort', 'color'),
  drawerOpen: false,
  drawerTab: 'chat',
  unread: 0,
  resultsKey: null,
  resultsTimer: 0,
  prevMyTurn: false,
  timerRaf: 0,
  lastTickSec: -1,
  busy: false,
  connBannerTimer: 0,
  pickResolve: null,
  roomPollTimer: 0,
  lastRooms: [],
  skew: 0,
  lobbySig: '',
  chatMsgs: [],   // kept so chat can be re-rendered when the language changes
  logEvents: [],  // same for the game log
};

const me = () => app.state?.me;
const member = id => app.state?.members.find(m => m.id === id);
const isHost = () => Boolean(app.state && app.state.hostId === app.state.me);
// "You" for the current player (unless you=false), else the player's name.
const nameOf = (id, you = true) => (id === me() && you ? t('you') : member(id)?.name ?? t('someone'));
const colorName = c => t(`color.${c}`);

// Server errors arrive as { error, code, params }; prefer our own translation.
function errorMessage(err) {
  if (err.code && has(`err.${err.code}`)) return t(`err.${err.code}`, err.params || {});
  return err.message;
}

function avatarHtml(m) {
  if (!m) return '<div class="avatar">?</div>';
  const initial = esc([...m.name][0] || '?');
  return `<div class="avatar" style="--av:${safeColor(m.color)}">${initial}${m.isBot ? '<i class="bot">🤖</i>' : ''}</div>`;
}

// ================================================================
// network
// ================================================================

async function api(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error(data.error || t('err.requestFailed', { status: res.status }));
    err.status = res.status;
    err.code = data.code;
    err.params = data.params;
    throw err;
  }
  return data;
}

async function act(action, extra = {}) {
  if (!app.session) return false;
  try {
    await api('action', { code: app.session.code, token: app.session.token, action, ...extra });
    return true;
  } catch (err) {
    sfx.error();
    if (err instanceof TypeError) toast(t('err.connection'), 'error');
    else toast(errorMessage(err), 'error');
    if (err.status === 404) recheck();
    return false;
  }
}

function saveSession(s) {
  app.session = s;
  try { sessionStorage.setItem('uno.session', JSON.stringify(s)); } catch { /* ignore */ }
  store.set('last', { ...s, name: $('#name-input').value.trim() });
}
function loadTabSession() {
  try { const v = sessionStorage.getItem('uno.session'); return v ? JSON.parse(v) : null; } catch { return null; }
}
function clearSession() {
  app.session = null;
  try { sessionStorage.removeItem('uno.session'); } catch { /* ignore */ }
  store.set('last', null);
}

function enterRoom(session) {
  saveSession(session);
  app.booting = true;
  app.lastSeq = 0;
  app.gameId = null;
  app.lobbySig = '';
  history.replaceState(null, '', `?room=${session.code}`);
  connect();
}

function connect() {
  if (app.es) app.es.close();
  const { code, token } = app.session;
  const es = new EventSource(`/api/stream?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);
  app.es = es;
  es.onopen = () => setConn(true);
  es.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    onMessage(msg);
  };
  es.onerror = () => {
    setConn(false);
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      recheck();
    }
  };
}

let recheckTimer = 0;
async function recheck() {
  clearTimeout(recheckTimer);
  if (!app.session) return;
  try {
    await api('check', app.session);
    recheckTimer = setTimeout(() => app.session && connect(), 800);
  } catch (err) {
    if (err.status === 404) leaveToHome(t('toast.roomGone'));
    else recheckTimer = setTimeout(recheck, 2500);
  }
}

function setConn(ok) {
  clearTimeout(app.connBannerTimer);
  if (ok) { $('#conn-banner').classList.add('hidden'); return; }
  app.connBannerTimer = setTimeout(() => {
    if (app.session) $('#conn-banner').classList.remove('hidden');
  }, 1500);
}

function leaveToHome(message) {
  clearTimeout(recheckTimer);
  if (app.es) { app.es.close(); app.es = null; }
  clearSession();
  app.state = null;
  app.resultsKey = null;
  app.logEvents = [];
  app.chatMsgs = [];
  $('#log-list').innerHTML = '';
  $('#chat-list').innerHTML = '';
  closeAllModals();
  setConn(true);
  history.replaceState(null, '', location.pathname);
  document.body.dataset.color = 'none';
  showScreen('home');
  if (message) toast(message, 'info', 3500);
}

function onMessage(msg) {
  switch (msg.type) {
    case 'state': {
      const prev = app.state;
      app.state = msg.state;
      app.skew = msg.state.serverTime - Date.now();
      render(prev);
      app.booting = false;
      break;
    }
    case 'chat': addChat(msg.msg, true); break;
    case 'chatHistory':
      app.chatMsgs = [];
      $('#chat-list').innerHTML = '';
      for (const m of msg.messages) addChat(m, false);
      break;
    case 'react': showReaction(msg.from, msg.emoji); break;
    case 'kicked':
      if (app.es) app.es.close();
      leaveToHome(has(`kick.${msg.reason}`) ? t(`kick.${msg.reason}`) : msg.reason);
      break;
    default: break;
  }
}

// ================================================================
// screens
// ================================================================

function showScreen(name) {
  for (const s of ['home', 'lobby', 'game']) $(`#screen-${s}`).classList.toggle('hidden', s !== name);
  document.body.dataset.screen = name;
  if (name === 'home') startRoomPolling(); else stopRoomPolling();
}

function render(prev) {
  const s = app.state;
  if (!s) return;
  if (!s.game) {
    if (app.resultsKey) { closeModal('results'); app.resultsKey = null; }
    document.body.dataset.color = 'none';
    stopTimer();
    showScreen('lobby');
    renderLobby(s);
    app.gameId = null;
    return;
  }
  showScreen('game');
  renderGame(s, prev);
}

// ---------------- home ----------------

async function loadInfo() {
  try {
    const res = await fetch('/api/info');
    app.info = await res.json();
  } catch { app.info = null; }
  renderAddresses($('#home-addresses'));
  if (app.state) renderAddresses($('#lobby-addresses'), app.state.code);
}

function renderAddresses(box, code) {
  if (!box) return;
  const suffix = code ? `/?room=${code}` : '/';
  const port = app.info?.port || location.port || 80;
  const list = (app.info?.addresses || []).map(a => ({ url: `http://${a.address}:${port}${suffix}`, iface: a.iface, weak: a.address.startsWith('169.254.') }));
  if (!list.length) {
    box.innerHTML = `<div class="addr"><a href="${esc(location.origin + suffix)}">${esc(location.origin + suffix)}</a></div>
      <p class="muted small">${esc(t('addr.none'))}</p>`;
    return;
  }
  box.innerHTML = list.map(a => `
    <div class="addr${a.weak ? ' weak' : ''}">
      <div><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url.replace('http://', ''))}</a><br><small>${esc(a.iface)}${a.weak ? ` · ${esc(t('addr.weak'))}` : ''}</small></div>
      <button class="btn ghost sm" data-copy="${esc(a.url)}">${esc(t('btn.copy'))}</button>
    </div>`).join('');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API needs https/localhost; fall back for LAN addresses
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast(t('toast.copied'), 'good', 1500);
}

function startRoomPolling() {
  stopRoomPolling();
  const poll = async () => {
    try {
      const res = await fetch('/api/rooms');
      const { rooms } = await res.json();
      app.lastRooms = rooms;
    } catch { app.lastRooms = []; }
    renderRoomList();
  };
  poll();
  app.roomPollTimer = setInterval(poll, 3000);
}
function stopRoomPolling() { clearInterval(app.roomPollTimer); }

function renderRoomList() {
  const rooms = app.lastRooms;
  const last = store.get('last', null);
  const items = [];
  if (last && rooms.some(r => r.code === last.code)) {
    items.push(`<button class="room-item" data-rejoin="1"><span><b>${esc(last.code)}</b><br><small>${t('rooms.rejoin', { name: esc(last.name || '?') })}</small></span><span class="status">${esc(t('rooms.rejoinTag'))}</span></button>`);
  }
  for (const r of rooms) {
    if (last && r.code === last.code) continue;
    items.push(`<button class="room-item" data-join="${esc(r.code)}">
      <span><b>${esc(r.code)}</b><br><small>${t('rooms.desc', { host: esc(r.host), n: r.players })}</small></span>
      <span class="status ${r.status === 'playing' ? 'playing' : ''}">${esc(t(`rooms.status.${r.status}`))}</span>
    </button>`);
  }
  $('#room-list').innerHTML = items.join('');
}

function myName() {
  const input = $('#name-input');
  const name = input.value.trim();
  if (!name) {
    toast(t('toast.enterName'), 'error');
    input.focus();
    return null;
  }
  store.set('name', name);
  return name;
}

async function createRoom() {
  const name = myName();
  if (!name) return;
  try {
    const s = await api('create', { name });
    enterRoom(s);
  } catch (err) { toast(errorMessage(err), 'error'); }
}

async function joinRoom(code) {
  const name = myName();
  if (!name) return;
  code = String(code || '').trim().toUpperCase();
  if (code.length !== 4) { toast(t('toast.codeLength'), 'error'); $('#code-input').focus(); return; }
  const last = store.get('last', null);
  try {
    const s = await api('join', { code, name, token: last?.code === code ? last.token : undefined });
    enterRoom(s);
  } catch (err) { toast(errorMessage(err), 'error'); }
}

// ---------------- lobby ----------------

function buildSettingsForm() {
  const form = $('#settings-form');
  form.innerHTML = SETTINGS_UI.map(s => {
    const hint = s.hint ? `<small data-i18n="set.${s.key}.hint"></small>` : '';
    const label = `<span class="lbl"><b data-i18n="set.${s.key}"></b>${hint}</span>`;
    if (s.type === 'bool') {
      return `<label class="setting">${label}<span class="switch"><input type="checkbox" name="${s.key}"><i></i></span></label>`;
    }
    const opts = s.options.map(([v]) => `<option value="${v}"></option>`).join('');
    return `<label class="setting">${label}<select name="${s.key}">${opts}</select></label>`;
  }).join('');
  labelSettingsForm();
  form.addEventListener('change', () => {
    const settings = {};
    for (const s of SETTINGS_UI) {
      const el = form.elements[s.key];
      settings[s.key] = s.type === 'bool' ? el.checked : Number(el.value);
    }
    act('settings', { settings });
  });
}

function labelSettingsForm() {
  const form = $('#settings-form');
  applyStatic(form);
  for (const s of SETTINGS_UI) {
    if (s.type !== 'select') continue;
    const select = form.elements[s.key];
    for (const [v, label] of s.options) {
      const opt = [...select.options].find(o => o.value === String(v));
      if (opt) opt.textContent = label();
    }
  }
}

function fillSettings(settings, editable) {
  const form = $('#settings-form');
  for (const s of SETTINGS_UI) {
    const el = form.elements[s.key];
    if (s.type === 'bool') el.checked = Boolean(settings[s.key]);
    else {
      const v = String(settings[s.key]);
      if (![...el.options].some(o => o.value === v)) el.add(new Option(v, v));
      el.value = v;
    }
    el.disabled = !editable;
  }
  form.elements.challenge.closest('.setting').style.opacity = settings.stacking ? 0.5 : 1;
}

function renderLobby(s) {
  $('#lobby-code').textContent = s.code;
  $('#lobby-code-2').textContent = s.code;
  const host = isHost();
  const sig = JSON.stringify([s.members, s.hostId, host, getLang()]);
  if (sig !== app.lobbySig) {
    app.lobbySig = sig;
    $('#lobby-count').textContent = `${s.members.length}/10`;
    $('#lobby-players').innerHTML = s.members.map(m => `
      <li data-id="${m.id}">
        ${avatarHtml(m)}
        <span class="pname">${esc(m.name)}</span>
        <span class="tags">
          ${m.id === s.hostId ? `<span class="tag host">${t('tag.host')}</span>` : ''}
          ${m.id === s.me ? `<span class="tag you">${t('tag.you')}</span>` : ''}
          ${m.isBot ? `<span class="tag">${t('tag.bot')}</span>` : ''}
          ${!m.connected ? `<span class="tag off">${t('tag.away')}</span>` : ''}
        </span>
        ${host && m.id !== s.me ? `<button class="btn ghost sm kick" data-kick="${m.id}" title="${esc(t('lobby.remove', { name: m.name }))}">✕</button>` : ''}
      </li>`).join('');
  }
  $('#btn-add-bot').classList.toggle('hidden', !host || s.members.length >= 10);
  fillSettings(s.settings, host);
  $('#rules-lock').textContent = host ? t('lobby.youPick') : t('lobby.hostPicks');
  const start = $('#btn-start');
  start.classList.toggle('hidden', !host);
  start.disabled = s.members.length < 2;
  start.textContent = s.members.length < 2 ? t('lobby.needPlayers') : t('lobby.start', { n: s.members.length });
  const hostName = member(s.hostId)?.name || t('theHost');
  $('#lobby-wait').textContent = host ? t('lobby.allDealt') : t('lobby.waiting', { name: hostName });
  const addrBox = $('#lobby-addresses');
  if (!addrBox.children.length || addrBox.dataset.code !== s.code || addrBox.dataset.lang !== getLang()) {
    addrBox.dataset.code = s.code;
    addrBox.dataset.lang = getLang();
    renderAddresses(addrBox, s.code);
  }
}

// ================================================================
// game rendering
// ================================================================

function seatOrder(g) {
  const idx = g.players.findIndex(p => p.id === me());
  if (idx < 0) return g.players;
  return [...g.players.slice(idx + 1), ...g.players.slice(0, idx)];
}

function seatEl(id) {
  return id === me() ? $('#me-info') : $(`#opponents .seat[data-id="${id}"]`);
}

function anchorFor(id) {
  if (document.body.dataset.screen === 'lobby') return $(`#lobby-players li[data-id="${id}"] .avatar`);
  const el = seatEl(id);
  return el ? el.querySelector('.avatar') || el : null;
}

function renderGame(s, prev) {
  const g = s.game;
  const boot = app.booting;
  if (app.gameId !== g.id) {
    app.gameId = g.id;
    app.lastSeq = 0;
    if (!boot) { app.logEvents = []; $('#log-list').innerHTML = ''; }
  }
  const handRects = new Map($$('#hand .card').map(el => [Number(el.dataset.id), el.getBoundingClientRect()]));
  const myP = g.players.find(p => p.id === s.me);
  const myTurn = g.phase === 'play' && g.current === s.me;

  document.body.dataset.color = g.phase === 'play' ? g.color : 'none';
  $('#g-code').textContent = s.code;
  const target = g.settings.targetScore;
  $('#g-round').textContent = target
    ? t('game.roundTarget', { n: g.round, target })
    : t('game.roundSingle', { n: g.round });

  renderOpponents(s, g);
  renderPiles(g, myTurn);
  renderMe(s, g, myP, myTurn);
  const newCards = renderHand(g, myTurn);
  renderActions(g, myP, myTurn);
  renderStatus(g, myP, myTurn);
  startTimer();

  if (!boot && newCards.length) animateNewCards(newCards, g);
  processEvents(g, handRects, boot);
  maybeShowResults(g, boot);

  if (myTurn && !app.prevMyTurn && !boot) {
    sfx.turn();
    vibrate(40);
  }
  app.prevMyTurn = myTurn;
  document.title = myTurn && document.hidden ? t('title.turn') : t('title.page');
}

let seatsSig = '';
function renderOpponents(s, g) {
  const box = $('#opponents');
  const amIn = g.players.some(p => p.id === s.me);
  const html = seatOrder(g).map(p => {
    const m = member(p.id);
    const cls = ['seat'];
    if (p.id === g.current) cls.push('turn');
    if (p.vulnerable) cls.push('vulnerable');
    if (m && !m.connected) cls.push('offline');
    const backs = Math.min(p.count, 7);
    return `<div class="${cls.join(' ')}" data-id="${p.id}">
      ${avatarHtml(m)}
      <div class="seat-info">
        <span class="seat-name">${esc(m?.name ?? '?')}${p.id === g.dealer ? ' <span class="dealer-tag">(D)</span>' : ''}</span>
        <span class="seat-meta"><span class="mini-hand">${'<i></i>'.repeat(backs)}</span><b>${p.count}</b><span class="score">${t('seat.pts', { n: p.score })}</span></span>
      </div>
      ${p.uno ? '<span class="uno-tag">UNO</span>' : ''}
      ${p.vulnerable && amIn && g.phase === 'play' ? `<button class="catch-btn" data-catch="${p.id}">${t('seat.catch')}</button>` : ''}
    </div>`;
  }).join('');

  // spectators who'll join next round
  const waiting = s.members.filter(m => m.waiting);
  const extra = waiting.length
    ? `<div class="seat offline"><div class="seat-info"><span class="seat-name">👀 ${waiting.map(w => esc(w.name)).join(', ')}</span><span class="seat-meta">${t('seat.joinsNext')}</span></div></div>`
    : '';
  if (seatsSig !== html + extra) {
    seatsSig = html + extra;
    box.innerHTML = seatsSig;
  }
}

let drawSig = '';
let discardSig = '';
function renderPiles(g, myTurn) {
  const draw = $('#draw-pile');
  const can = myTurn && g.canDraw;
  const sigD = `${g.drawPile}|${g.pending.count}|${can}|${getLang()}`;
  if (sigD !== drawSig) {
    drawSig = sigD;
    draw.innerHTML = '';
    const layers = Math.max(1, Math.min(3, g.drawPile));
    for (let i = 0; i < layers; i++) draw.appendChild(createBack());
    if (!g.drawPile) draw.lastChild.style.opacity = '0.25';
    draw.insertAdjacentHTML('beforeend', `<span class="pile-count">${t('pile.left', { n: g.drawPile })}</span>`);
    if (g.pending.count > 0) draw.insertAdjacentHTML('beforeend', `<span class="pending-badge">+${g.pending.count}</span>`);
    draw.classList.toggle('can', can);
    draw.disabled = !can;
  }

  const discard = $('#discard-pile');
  const sigX = `${g.recent.map(c => c.id).join(',')}|${g.color}|${getLang()}`;
  if (sigX !== discardSig) {
    discardSig = sigX;
    discard.innerHTML = '';
    g.recent.forEach((c, i) => {
      const el = createCard(c);
      const isTop = i === g.recent.length - 1;
      el.style.transform = `rotate(${tiltFor(c.id)}deg)`;
      el.classList.toggle('under', !isTop);
      if (isTop) el.classList.add('top');
      discard.appendChild(el);
    });
    discard.dataset.wild = g.top.color === 'wild' ? g.color : '';
  }

  const dir = $('#direction');
  dir.classList.toggle('ccw', g.direction === -1);
  dir.classList.toggle('hidden', g.phase !== 'play');
}

function renderMe(s, g, myP, myTurn) {
  const box = $('#me-info');
  const m = member(s.me);
  if (!myP) {
    box.innerHTML = `${avatarHtml(m)}<div class="seat-info"><span class="seat-name">${esc(m?.name)}</span><span class="seat-meta">${t('me.spectating')}</span></div>`;
    box.className = 'me-info';
    return;
  }
  box.className = `me-info${myTurn ? ' turn' : ''}${myP.vulnerable ? ' vulnerable' : ''}`;
  box.innerHTML = `${avatarHtml(m)}<div class="seat-info"><span class="seat-name">${esc(m?.name)} ${t('me.you')}</span><span class="seat-meta">${t('me.meta', { n: myP.count, pts: myP.score })}</span></div>`;
}

function renderHand(g, myTurn) {
  const hand = $('#hand');
  const cards = g.hand ? sortHand(g.hand, app.sortMode) : [];
  const playable = new Set(g.playable);
  hand.classList.toggle('my-turn', myTurn);
  const existing = new Map($$('.card', hand).map(el => [Number(el.dataset.id), el]));
  const ordered = [];
  const fresh = [];
  for (const c of cards) {
    let el = existing.get(c.id);
    if (el) existing.delete(c.id);
    else {
      el = createCard(c);
      el.tabIndex = 0;
      fresh.push(el);
    }
    el.classList.toggle('playable', myTurn && playable.has(c.id));
    el.classList.toggle('jump', !myTurn && playable.has(c.id));
    el.classList.toggle('drawn', g.drawn === c.id);
    el.classList.remove('hide-for-fly');
    ordered.push(el);
  }
  for (const el of existing.values()) el.remove();
  ordered.forEach((el, i) => { if (hand.children[i] !== el) hand.insertBefore(el, hand.children[i] || null); });
  layoutHand();
  return fresh;
}

function layoutHand() {
  const hand = $('#hand');
  const wrap = $('#hand-wrap');
  const n = hand.children.length;
  if (!n) return;
  const cw = hand.children[0].offsetWidth || 80;
  const avail = wrap.clientWidth - 24;
  let gap = 6;
  if (n > 1) gap = Math.min(6, (avail - cw * n) / (n - 1));
  gap = Math.max(gap, -cw * 0.7);
  hand.style.setProperty('--gap', `${gap}px`);
}

function animateNewCards(els) {
  const from = $('#draw-pile').getBoundingClientRect();
  const big = els.length > 3;
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const dx = from.left - r.left;
    const dy = from.top - r.top;
    el.animate(
      [{ translate: `${dx}px ${dy}px`, scale: `${from.width / r.width}`, opacity: 0.4 }, { translate: '0 0', scale: '1', opacity: 1 }],
      { duration: 380, delay: i * (big ? 55 : 110), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
    sfx.deal(i);
  });
}

function renderActions(g, myP, myTurn) {
  const uno = $('#btn-uno');
  const count = myP?.count ?? 0;
  const showUno = Boolean(myP) && g.phase === 'play' && count > 0 && count <= 2;
  uno.classList.toggle('hidden', !showUno);
  const safe = g.safe && !myP?.vulnerable;
  uno.classList.toggle('done', safe);
  uno.textContent = safe ? t('btn.unoDone') : t('btn.uno');
  uno.disabled = safe;
  uno.classList.toggle('hot', Boolean(myP?.vulnerable) || (count === 2 && myTurn && !g.safe && g.playable.length > 0));

  const draw = $('#btn-draw');
  draw.classList.toggle('hidden', !g.canDraw);
  if (g.pending.count > 0) draw.textContent = t(g.canChallenge ? 'btn.accept' : 'btn.take', { n: g.pending.count });
  else draw.textContent = t('btn.draw');
  draw.classList.toggle('warn', g.pending.count > 0);
  $('#btn-pass').classList.toggle('hidden', !g.canPass);
  $('#btn-challenge').classList.toggle('hidden', !g.canChallenge);
  $('#btn-sort').textContent = t(`sort.${app.sortMode}`);
  $('#btn-sort').classList.toggle('hidden', !myP);
}

function renderStatus(g, myP, myTurn) {
  const el = $('#status');
  let text;
  let cls = '';
  const cur = member(g.current);
  const curName = cur?.name ?? '?';
  if (g.phase !== 'play') text = t(g.phase === 'gameOver' ? 'status.gameOver' : 'status.roundOver');
  else if (!myP) text = t('status.spectating', { name: curName });
  else if (myTurn) {
    cls = 'mine';
    if (g.canChallenge) { text = t('status.challenge'); cls = 'danger'; }
    else if (g.pending.count > 0) { text = t('status.stack', { n: g.pending.count }); cls = 'danger'; }
    else if (g.drawn !== null) text = t(g.canPass ? 'status.drawnPass' : 'status.drawnForced');
    else text = t(g.playable.length ? 'status.yourTurn' : 'status.noMatch');
  } else {
    text = t('status.theirTurn', { name: curName }) + (cur?.isBot ? ' 🤖' : '') + (cur && !cur.connected ? t('status.away') : '');
  }
  el.className = `status ${cls}`;
  el.textContent = text;
}

// ---------------- turn timer ----------------

function startTimer() {
  cancelAnimationFrame(app.timerRaf);
  const g = app.state?.game;
  const box = $('#timer');
  if (!g || g.phase !== 'play' || !g.settings.turnTimer) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const total = g.settings.turnTimer * 1000;
  const bar = box.firstElementChild;
  const tick = () => {
    const gg = app.state?.game;
    if (!gg || gg !== g) return;
    const left = g.turnStartedAt + total - (Date.now() + app.skew);
    const frac = Math.max(0, Math.min(1, left / total));
    bar.style.transform = `scaleX(${frac})`;
    box.classList.toggle('low', left < 5000);
    const sec = Math.ceil(left / 1000);
    if (g.current === me() && sec <= 5 && sec > 0 && sec !== app.lastTickSec) { app.lastTickSec = sec; sfx.tick(); }
    if (left > 0) app.timerRaf = requestAnimationFrame(tick);
  };
  tick();
}
function stopTimer() { cancelAnimationFrame(app.timerRaf); $('#timer').classList.add('hidden'); }

// ================================================================
// events → animations, sounds, log
// ================================================================

function processEvents(g, handRects, boot) {
  const fresh = g.events.filter(e => e.seq > app.lastSeq);
  if (g.events.length) app.lastSeq = Math.max(app.lastSeq, g.events[g.events.length - 1].seq);
  let drawIdx = 0;
  for (const ev of fresh) {
    logEvent(ev);
    if (boot) continue;
    try { animateEvent(ev, g, handRects, drawIdx); } catch (err) { console.warn(err); }
    if (ev.type === 'draw') drawIdx += Math.min(ev.count, 4);
  }
}

function rectAround(el, w) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return { left: cx - w / 2, top: cy - (w * 1.5) / 2, width: w, height: w * 1.5 };
}

function animateEvent(ev, g, handRects, drawIdx) {
  const mine = ev.player === me();
  switch (ev.type) {
    case 'play': {
      sfx.play();
      if (ev.card.color === 'wild') setTimeout(sfx.wild, 120);
      const pile = $('#discard-pile');
      const toRect = pile.getBoundingClientRect();
      let fromRect = mine ? handRects.get(ev.card.id) : null;
      if (!fromRect) {
        const seat = seatEl(ev.player);
        fromRect = seat ? rectAround(seat, 40) : null;
      }
      const top = pile.querySelector('.card.top');
      const isTop = top && Number(top.dataset.id) === ev.card.id;
      if (isTop) top.style.visibility = 'hidden';
      fly(createCard(ev.card), fromRect, toRect, {
        duration: mine ? 360 : 480,
        rotFrom: mine ? 0 : -40,
        rotTo: tiltFor(ev.card.id),
        onDone: () => { if (isTop) top.style.visibility = ''; },
      });
      break;
    }
    case 'draw': {
      const penalty = ev.reason !== 'draw';
      for (let i = 0; i < Math.min(ev.count, 4); i++) sfx.draw(drawIdx + i);
      if (penalty && ev.count >= 2) {
        setTimeout(sfx.penalty, 150);
        bubble(anchorFor(ev.player), `+${ev.count}`, 'bad');
        if (mine) vibrate([60, 40, 60]);
      }
      if (!mine) {
        const seat = seatEl(ev.player);
        if (!seat) break;
        const from = $('#draw-pile').getBoundingClientRect();
        const to = rectAround(seat, 30);
        for (let i = 0; i < Math.min(ev.count, 5); i++) {
          fly(createBack(), from, to, { duration: 420, delay: (drawIdx + i) * 80, rotFrom: 0, rotTo: 15 });
        }
      }
      break;
    }
    case 'skip':
      setTimeout(() => { sfx.skip(); bubble(anchorFor(ev.player), t('ev.skipped'), 'skip'); }, 250);
      break;
    case 'reverse': {
      sfx.reverse();
      const dir = $('#direction');
      dir.classList.remove('flip');
      void dir.offsetWidth;
      dir.classList.add('flip');
      bubble($('#discard-pile'), t('ev.reverse'), 'skip');
      break;
    }
    case 'uno':
      sfx.uno();
      bubble(anchorFor(ev.player), t('btn.uno'), 'uno');
      vibrate(80);
      break;
    case 'caught': {
      sfx.caught();
      bubble(anchorFor(ev.player), t('ev.caught'), 'bad');
      const n = g.settings.unoPenalty;
      if (mine) toast(t('toast.caughtMe', { by: nameOf(ev.by), n }), 'error');
      else if (ev.by === me()) toast(t('toast.youCaught', { who: nameOf(ev.player), n }), 'good');
      else toast(t('toast.caught', { by: nameOf(ev.by), who: nameOf(ev.player), n }));
      break;
    }
    case 'challenge':
      toast(t(ev.success ? 'toast.challengeOk' : 'toast.challengeBad', { a: nameOf(ev.player), b: nameOf(ev.target) }), ev.success ? 'good' : 'error', 3200);
      break;
    case 'swap':
      sfx.swap();
      toast(t('toast.swap', { a: nameOf(ev.player), b: nameOf(ev.target) }), 'info', 3000);
      break;
    case 'rotate':
      sfx.swap();
      toast(t('toast.rotate'), 'info', 3000);
      break;
    case 'jumpIn':
      bubble(anchorFor(ev.player), t('ev.jumpIn'), 'good');
      break;
    case 'timeout':
      toast(mine ? t('toast.timeoutMe') : t('toast.timeout', { name: nameOf(ev.player) }), mine ? 'error' : 'info');
      break;
    case 'reshuffle':
      toast(t('toast.reshuffle'), 'info', 1800);
      break;
    case 'roundStart':
      toast(t('toast.roundStart', { n: ev.round }), 'good', 1800);
      break;
    case 'roundOver': {
      const won = ev.winner === me();
      setTimeout(won ? sfx.win : sfx.lose, 300);
      bubble(anchorFor(ev.winner), won ? t('ev.iWin') : t('ev.out'), 'good');
      break;
    }
    case 'abandoned':
      toast(t('toast.abandoned'), 'error', 3500);
      break;
    default: break;
  }
}

// Log lines are HTML, so names are escaped before they go into the template.
function describe(ev) {
  const actor = ev.player ?? ev.winner;
  const p = { who: esc(nameOf(actor)), me: actor === me() };
  switch (ev.type) {
    case 'play':
      return t('log.play', { ...p, card: esc(cardName(ev.card)), color: ev.card.color === 'wild' ? colorName(ev.color) : '' });
    case 'draw':
      return t('log.draw', { ...p, n: ev.count, reason: ev.reason === 'draw' ? '' : t(`log.reason.${ev.reason}`) });
    case 'pass': return t('log.pass', p);
    case 'skip': return t('log.skip', p);
    case 'reverse': return t('log.reverse');
    case 'uno': return t('log.uno', p);
    case 'caught':
      return t('log.caught', { by: esc(nameOf(ev.by)), byMe: ev.by === me(), who: esc(nameOf(ev.player)), whoMe: ev.player === me() });
    case 'challenge':
      return t('log.challenge', { ...p, target: esc(nameOf(ev.target)), targetMe: ev.target === me(), ok: ev.success });
    case 'swap': return t('log.swap', { ...p, target: esc(nameOf(ev.target)) });
    case 'rotate': return t('log.rotate');
    case 'jumpIn': return t('log.jumpIn', p);
    case 'timeout': return t('log.timeout', p);
    case 'reshuffle': return t('log.reshuffle');
    case 'roundStart':
      return t('log.roundStart', { n: ev.round, dealer: esc(nameOf(ev.dealer, false)), card: esc(cardName(ev.card)) });
    case 'roundOver': return t('log.roundOver', { ...p, pts: ev.points, over: ev.gameOver });
    case 'abandoned': return t('log.abandoned');
    case 'leave': return t('log.leave');
    default: return null;
  }
}

function logEvent(ev, store = true) {
  if (store) {
    app.logEvents.push(ev);
    if (app.logEvents.length > 200) app.logEvents.shift();
  }
  const html = describe(ev);
  if (!html) return;
  const list = $('#log-list');
  const line = document.createElement('div');
  line.className = 'log-line';
  const dotColor = ev.type === 'play' ? (ev.card.color === 'wild' ? COLOR_HEX[ev.color] : COLOR_HEX[ev.card.color]) : null;
  line.innerHTML = `${dotColor ? `<span class="dot" style="background:${dotColor}"></span>` : ''}${html}`;
  list.appendChild(line);
  while (list.children.length > 200) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
}

// ================================================================
// player input
// ================================================================

function cantPlayReason(g, card) {
  if (g.current !== me()) return t(g.settings.jumpIn ? 'reason.notTurnJump' : 'reason.notTurn');
  if (g.drawn !== null) return t('reason.onlyDrawn');
  if (g.pending.count > 0) return t(g.settings.stacking ? 'reason.stack' : 'reason.take', { n: g.pending.count });
  const top = g.top;
  const value = isNaN(Number(top.value)) ? t(`value.${top.value}`) : top.value;
  return t('reason.noMatch', { card: cardName(card), color: colorName(g.color), value });
}

async function onCardClick(el) {
  const g = app.state?.game;
  if (!g || g.phase !== 'play' || !g.hand) return;
  const id = Number(el.dataset.id);
  const card = g.hand.find(c => c.id === id);
  if (!card) return;
  if (!g.playable.includes(id)) {
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
    sfx.error();
    toast(cantPlayReason(g, card), 'error', 1800);
    return;
  }
  if (app.busy) return;
  const opts = { cardId: id };
  if (card.color === 'wild') {
    const color = await pickColor(g.hand, id);
    if (!color) return;
    opts.color = color;
  }
  if (g.settings.sevenZero && card.value === '7' && g.hand.length > 1) {
    const target = await pickTarget();
    if (!target) return;
    opts.target = target;
  }
  app.busy = true;
  await act('play', opts);
  app.busy = false;
}

function pickColor(hand, excludeId) {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.id !== excludeId && counts[c.color] !== undefined) counts[c.color]++;
  for (const btn of $$('#modal-color .cbtn')) {
    const col = btn.dataset.color;
    btn.innerHTML = `${esc(cap(colorName(col)))}<span class="count">${esc(t('picker.inHand', { n: counts[col] }))}</span>`;
  }
  return openPicker('color');
}

function pickTarget() {
  const g = app.state.game;
  $('#target-list').innerHTML = g.players.filter(p => p.id !== me()).map(p => {
    const m = member(p.id);
    return `<button class="btn" data-target="${p.id}">${avatarHtml(m)}<span>${esc(m?.name ?? '?')}</span><span class="cnt">${esc(t('cards.count', { n: p.count }))}</span></button>`;
  }).join('');
  return openPicker('target');
}

function openPicker(name) {
  if (app.pickResolve) app.pickResolve(null);
  openModal(name);
  return new Promise(resolve => {
    app.pickResolve = value => {
      app.pickResolve = null;
      closeModal(name);
      resolve(value);
    };
  });
}

// ================================================================
// modals, results, scoreboard
// ================================================================

function openModal(name) { $(`#modal-${name}`).classList.remove('hidden'); }
function closeModal(name) {
  const el = $(`#modal-${name}`);
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  if ((name === 'color' || name === 'target') && app.pickResolve) app.pickResolve(null);
}
function closeAllModals() { for (const m of $$('.modal')) closeModal(m.id.replace('modal-', '')); }
const isOpen = name => !$(`#modal-${name}`).classList.contains('hidden');

function maybeShowResults(g, boot) {
  if (g.phase === 'play') {
    if (app.resultsKey) { closeModal('results'); app.resultsKey = null; }
    clearTimeout(app.resultsTimer);
    return;
  }
  const key = `${g.id}:${g.round}:${g.phase}`;
  if (app.resultsKey === key) {
    if (isOpen('results')) renderResultsActions();
    return;
  }
  app.resultsKey = key;
  clearTimeout(app.resultsTimer);
  closeModal('color');
  closeModal('target');
  app.resultsTimer = setTimeout(() => showResults(!boot), boot ? 50 : 1500);
}

function scoreRows(ids, scores, target, extra = () => '') {
  const max = Math.max(1, target || Math.max(...ids.map(id => scores[id] || 0)));
  return ids.map(id => {
    const m = member(id);
    const sc = scores[id] || 0;
    return `<tr data-id="${id}">
      <td><div class="who">${avatarHtml(m)}<span>${esc(m?.name ?? t('someone'))}${id === me() ? esc(t('res.youSuffix')) : ''}</span></div></td>
      ${extra(id)}
      <td class="num">${sc}<div class="score-bar"><i style="width:${Math.min(100, (sc / max) * 100)}%"></i></div></td>
    </tr>`;
  }).join('');
}

function showResults(celebrate) {
  const s = app.state;
  const g = s?.game;
  if (!g || g.phase === 'play') return;
  app.resultsView = 'results';
  const r = g.roundResult;
  const body = $('#results-body');
  if (!r) {
    body.innerHTML = `<p class="results-title">${esc(t('res.gameOverTitle'))}</p><p class="results-sub">${esc(t('res.notEnough'))}</p>`;
  } else {
    const ids = Object.keys(r.scores).sort((a, b) => r.scores[b] - r.scores[a]);
    const champ = ids[0];
    const target = g.settings.targetScore;
    const title = r.gameOver
      ? (champ === me() ? t('res.youWinGame') : t('res.winsGame', { name: nameOf(champ) }))
      : (r.winner === me() ? t('res.youWonRound', { n: g.round }) : t('res.wonRound', { name: nameOf(r.winner), n: g.round }));
    const sub = r.gameOver
      ? t('res.final', { pts: r.scores[champ] }) + (target ? t('res.targetSuffix', { target }) : '')
      : t('res.roundSub', { pts: r.points, target });
    body.innerHTML = `
      <p class="results-title">${esc(title)}</p>
      <p class="results-sub">${esc(sub)}</p>
      <table class="results-table"><tbody>
        ${scoreRows(ids, r.scores, target, id => {
          const left = r.hands[id] || [];
          const cards = left.length
            ? `<div class="left-cards">${left.slice(0, 16).map(c => createCard(c).outerHTML).join('')}${left.length > 16 ? `<small>+${left.length - 16}</small>` : ''}</div>`
            : `<b>${esc(t('res.out'))}</b>`;
          return `<td>${cards}</td><td class="num">${id === r.winner ? `+${r.points}` : ''}</td>`;
        })}
      </tbody></table>`;
    $$('#results-body tr').forEach(tr => tr.classList.toggle('winner', tr.dataset.id === r.winner));
    if (celebrate && r.gameOver && champ === me()) confetti();
    else if (celebrate && r.winner === me()) confetti(2000);
  }
  renderResultsActions();
  openModal('results');
}

function renderResultsActions() {
  const g = app.state?.game;
  const box = $('#results-actions');
  if (!g || app.resultsView !== 'results') return;
  const over = g.phase === 'gameOver';
  let html = `<button class="btn ghost" data-close>${esc(t('res.viewTable'))}</button>`;
  if (isHost()) {
    html += over
      ? `<button class="btn" data-host="lobby">${esc(t('res.lobby'))}</button><button class="btn primary" data-host="start">${esc(t('res.again'))}</button>`
      : `<button class="btn primary" data-host="nextRound">${esc(t('res.next'))}</button>`;
  } else {
    const name = member(app.state.hostId)?.name || t('theHost');
    html += `<p class="muted small" style="width:100%">${esc(t(over ? 'res.waitNew' : 'res.waitNext', { name }))}</p>`;
  }
  box.innerHTML = html;
}

function showScoreboard() {
  const g = app.state?.game;
  if (!g) return;
  app.resultsView = 'scores';
  const scoreOf = id => g.players.find(p => p.id === id).score;
  const ids = g.players.map(p => p.id).sort((a, b) => scoreOf(b) - scoreOf(a));
  const scores = Object.fromEntries(g.players.map(p => [p.id, p.score]));
  const target = g.settings.targetScore;
  $('#results-body').innerHTML = `
    <p class="results-title">${esc(t('sb.title'))}</p>
    <p class="results-sub">${esc(target ? t('sb.subTarget', { n: g.round, target }) : t('sb.subSingle', { n: g.round }))}</p>
    <table class="results-table"><tbody>${scoreRows(ids, scores, target, id => `<td class="num muted">${esc(t('cards.count', { n: g.players.find(p => p.id === id).count }))}</td>`)}</tbody></table>
    ${rulesSummary(g.settings)}`;
  $('#results-actions').innerHTML = `<button class="btn primary" data-close>${esc(t('modal.close'))}</button>`;
  openModal('results');
}

function rulesSummary(st) {
  const on = SETTINGS_UI
    .filter(s => s.type === 'bool' && st[s.key] && !(s.key === 'challenge' && st.stacking))
    .map(s => t(`set.${s.key}`));
  const text = t('sb.rules', { list: on.length ? on.join(', ') : t('sb.classic'), n: st.unoPenalty })
    + (st.turnTimer ? t('sb.timer', { n: st.turnTimer }) : '');
  return `<p class="muted small" style="margin-top:14px">${esc(text)}</p>`;
}

// ================================================================
// chat & reactions
// ================================================================

function chatText(m) {
  return m.system && m.code ? t(`sys.${m.code}`, m.params || {}) : m.text;
}

function chatEl(m) {
  const div = document.createElement('div');
  const mine = m.from && m.from === app.session?.id;
  if (m.system) {
    div.className = 'msg system';
    div.textContent = chatText(m);
  } else {
    div.className = `msg${mine ? ' me' : ''}`;
    div.innerHTML = `<span class="bubble-text"><b style="color:${safeColor(m.color)}">${esc(m.name)}</b>${esc(m.text)}</span>`;
  }
  return div;
}

function addChat(m, live) {
  app.chatMsgs.push(m);
  if (app.chatMsgs.length > 150) app.chatMsgs.shift();
  const list = $('#chat-list');
  list.appendChild(chatEl(m));
  while (list.children.length > 150) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
  if (!live || m.system) return;
  const mine = m.from === app.session?.id;
  if (!(app.drawerOpen && app.drawerTab === 'chat')) {
    app.unread++;
    updateBadge();
  }
  if (!mine) {
    sfx.chat();
    const short = m.text.length > 28 ? `${m.text.slice(0, 27)}…` : m.text;
    bubble(anchorFor(m.from), short);
  }
}

function showReaction(from, emoji) {
  bubble(anchorFor(from), emoji, 'emoji');
}

function updateBadge() {
  for (const b of $$('.chat-btn .badge')) {
    b.textContent = app.unread > 9 ? '9+' : String(app.unread);
    b.classList.toggle('hidden', app.unread === 0);
  }
}

function toggleDrawer(open = !app.drawerOpen) {
  app.drawerOpen = open;
  $('#drawer').classList.toggle('open', open);
  if (open && app.drawerTab === 'chat') {
    app.unread = 0;
    updateBadge();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => $('#chat-input').focus(), 250);
  }
}

function setDrawerTab(tab) {
  app.drawerTab = tab;
  for (const el of $$('.drawer .tab')) el.classList.toggle('active', el.dataset.tab === tab);
  $('#chat-list').classList.toggle('hidden', tab !== 'chat');
  $('#log-list').classList.toggle('hidden', tab !== 'log');
  $('#chat-form').classList.toggle('hidden', tab !== 'chat');
  $('#reactions').classList.toggle('hidden', tab !== 'chat');
  if (tab === 'chat') { app.unread = 0; updateBadge(); }
  const list = tab === 'chat' ? $('#chat-list') : $('#log-list');
  list.scrollTop = list.scrollHeight;
}

// ================================================================
// language switching: redraw everything that was built from text
// ================================================================

function relabel() {
  labelSettingsForm();
  updateMuteButtons();
  renderRoomList();
  renderAddresses($('#home-addresses'));

  const chat = $('#chat-list');
  chat.innerHTML = '';
  for (const m of app.chatMsgs) chat.appendChild(chatEl(m));
  chat.scrollTop = chat.scrollHeight;

  $('#log-list').innerHTML = '';
  for (const ev of app.logEvents) logEvent(ev, false);

  // force the keyed renderers to rebuild
  app.lobbySig = '';
  seatsSig = '';
  drawSig = '';
  discardSig = '';
  $('#hand').innerHTML = '';
  if (app.state) {
    const wasBooting = app.booting;
    app.booting = true; // re-render quietly, no replayed sounds/animations
    render(app.state);
    app.booting = wasBooting;
    if (isOpen('results')) (app.resultsView === 'scores' ? showScoreboard() : showResults(false));
  }
  document.title = t('title.page');
}

// ================================================================
// wiring
// ================================================================

const confirmTaps = new WeakMap();
function confirmTap(btn, prompt) {
  const pending = confirmTaps.get(btn);
  if (pending) {
    clearTimeout(pending.timer);
    confirmTaps.delete(btn);
    btn.textContent = pending.original;
    return true;
  }
  const original = btn.textContent;
  btn.textContent = prompt;
  confirmTaps.set(btn, { original, timer: setTimeout(() => { btn.textContent = original; confirmTaps.delete(btn); }, 3000) });
  return false;
}

function updateMuteButtons() {
  for (const b of $$('.mute-btn')) b.textContent = isMuted() ? '🔇' : '🔊';
}

async function leaveRoom() {
  await act('leave');
  leaveToHome(t('toast.left'));
}

function wire() {
  applyStatic();
  buildSettingsForm();
  $('#reactions').innerHTML = REACTIONS.map(e => `<button type="button" data-react="${e}">${e}</button>`).join('');
  updateMuteButtons();
  onLangChange(relabel);

  const nameInput = $('#name-input');
  nameInput.value = store.get('name', '');
  nameInput.addEventListener('change', () => store.set('name', nameInput.value.trim()));
  $('#btn-create').addEventListener('click', createRoom);
  $('#join-form').addEventListener('submit', e => { e.preventDefault(); joinRoom($('#code-input').value); });
  $('#code-input').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') ($('#code-input').value.length === 4 ? joinRoom($('#code-input').value) : createRoom()); });

  $('#room-list').addEventListener('click', e => {
    const join = e.target.closest('[data-join]');
    if (join) return joinRoom(join.dataset.join);
    if (e.target.closest('[data-rejoin]')) {
      const last = store.get('last', null);
      if (last) enterRoom(last);
    }
  });

  $('#btn-add-bot').addEventListener('click', () => act('addBot'));
  $('#btn-start').addEventListener('click', () => act('start'));
  $('#lobby-players').addEventListener('click', e => {
    const k = e.target.closest('[data-kick]');
    if (k && confirmTap(k, t('confirm.sure'))) act('kick', { target: k.dataset.kick });
  });

  $('#hand').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) onCardClick(card);
  });
  $('#hand').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
      e.preventDefault();
      onCardClick(e.target);
    }
  });
  $('#draw-pile').addEventListener('click', () => { if (app.state?.game?.canDraw) act('draw'); });
  $('#btn-draw').addEventListener('click', () => act('draw'));
  $('#btn-pass').addEventListener('click', () => act('pass'));
  $('#btn-challenge').addEventListener('click', () => act('challenge'));
  $('#btn-uno').addEventListener('click', () => act('uno'));
  $('#btn-sort').addEventListener('click', () => {
    app.sortMode = SORT_MODES[(SORT_MODES.indexOf(app.sortMode) + 1) % SORT_MODES.length];
    store.set('sort', app.sortMode);
    if (app.state?.game) {
      const g = app.state.game;
      renderHand(g, g.current === me() && g.phase === 'play');
      $('#btn-sort').textContent = t(`sort.${app.sortMode}`);
    }
  });
  $('#opponents').addEventListener('click', e => {
    const c = e.target.closest('[data-catch]');
    if (c) act('catch', { target: c.dataset.catch });
  });

  $('#modal-color').addEventListener('click', e => {
    const b = e.target.closest('[data-color]');
    if (b && app.pickResolve) app.pickResolve(b.dataset.color);
  });
  $('#modal-target').addEventListener('click', e => {
    const b = e.target.closest('[data-target]');
    if (b && app.pickResolve) app.pickResolve(b.dataset.target);
  });
  $('#results-actions').addEventListener('click', e => {
    const b = e.target.closest('[data-host]');
    if (b) act(b.dataset.host);
  });

  // modal close: buttons and backdrop
  document.addEventListener('click', e => {
    const closer = e.target.closest('[data-close]');
    const modal = e.target.classList?.contains('modal') ? e.target : closer?.closest('.modal');
    if (modal && (closer || e.target === modal)) closeModal(modal.id.replace('modal-', ''));
  });

  // copy buttons
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]');
    if (c) copyText(c.dataset.copy);
  });

  // generic actions
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'leave':
        if (app.state?.game && app.state.game.phase === 'play' && !confirmTap(btn, t('confirm.leave'))) return;
        closeAllModals();
        leaveRoom();
        break;
      case 'lang':
        setLang(getLang() === 'fr' ? 'en' : 'fr');
        toast(t('toast.lang'), 'good', 1500);
        break;
      case 'rules': openModal('rules'); break;
      case 'mute': setMuted(!isMuted()); updateMuteButtons(); if (!isMuted()) sfx.turn(); break;
      case 'chat': toggleDrawer(); break;
      case 'scores': showScoreboard(); break;
      case 'menu':
        $('#btn-end-game').classList.toggle('hidden', !isHost());
        openModal('menu');
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => toast(t('toast.fullscreenNA'), 'error'));
        closeModal('menu');
        break;
      case 'end-game':
        if (!confirmTap(btn, t('confirm.end'))) return;
        closeModal('menu');
        act('lobby');
        break;
      default: break;
    }
  });

  $$('.drawer .tab').forEach(el => el.addEventListener('click', () => setDrawerTab(el.dataset.tab)));
  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    act('chat', { text });
  });
  $('#reactions').addEventListener('click', e => {
    const b = e.target.closest('[data-react]');
    if (b) act('react', { emoji: b.dataset.react });
  });

  // keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      const open = $$('.modal').find(m => !m.classList.contains('hidden'));
      if (open) closeModal(open.id.replace('modal-', ''));
      else if (app.drawerOpen) toggleDrawer(false);
      return;
    }
    const g = app.state?.game;
    if (!g) return;
    const k = e.key.toLowerCase();
    if (k === 'd' && g.canDraw) act('draw');
    else if (k === 'p' && g.canPass) act('pass');
    else if (k === 'u') act('uno');
    else if (k === 'c' && g.canChallenge) act('challenge');
    else if (k === 't') toggleDrawer();
    else if (k === 's') $('#btn-sort').click();
  });

  window.addEventListener('resize', layoutHand);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.title = t('title.page');
  });
  // Phones kill background connections: reconnect when we come back.
  window.addEventListener('pageshow', () => {
    if (app.session && (!app.es || app.es.readyState === EventSource.CLOSED)) connect();
  });
}

function boot() {
  wire();
  loadInfo();
  const params = new URLSearchParams(location.search);
  const roomParam = (params.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const tabSession = loadTabSession();
  if (tabSession && (!roomParam || roomParam === tabSession.code)) {
    showScreen('home');
    app.session = tabSession;
    recheck();
    return;
  }
  showScreen('home');
  if (roomParam) {
    $('#code-input').value = roomParam;
    const name = $('#name-input');
    if (name.value) toast(t('toast.pressJoin', { code: roomParam }), 'info', 3000);
    else { name.focus(); toast(t('toast.enterNameJoin', { code: roomParam }), 'info', 3500); }
  }
}

boot();
