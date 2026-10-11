import { t, has, getLang, setLang, applyStatic, onLangChange, money, sqName } from './i18n.js';
import { sfx, isMuted, setMuted } from './sound.js';
import { toast, bubble, vibrate } from '/shared/fx.js';
import { qrSvg } from '/shared/qr.js';
import { createVoice } from '/shared/voice.js';

// ================================================================
// helpers
// ================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888');

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`mono.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(`mono.${key}`);
      else localStorage.setItem(`mono.${key}`, JSON.stringify(value));
    } catch { /* storage blocked */ }
  },
};

// The board is the same file the server plays by.
const BOARD = await (await fetch('board.json')).json();
const SQ = BOARD.squares;
const GROUP_SQ = {};
for (const s of SQ) if (s.group) (GROUP_SQ[s.group] ||= []).push(s.i);
const GROUP_COLOR = {
  brown: '#8a5a3b', lightblue: '#9fd6ee', pink: '#d63c95', orange: '#f2921d',
  red: '#e5322d', yellow: '#f5d300', green: '#2f9e4f', darkblue: '#1f4fa8', rail: '#1d1a16', util: '#9a9183',
};
const ICON = { go: '➜', chance: '?', chest: '★', tax: '💰', rail: '🚂', jail: '', parking: '🅿️', gotojail: '👮' };
const utilIcon = i => (i === 12 ? '💡' : '🚰');
const mortgageValue = i => SQ[i].price / 2;
const unmortgageCost = i => Math.ceil((mortgageValue(i) * 11) / 10);

const SETTINGS_UI = [
  { key: 'timeLimit', hint: true, type: 'select', options: [[0, () => t('opt.noLimit')], ...[30, 45, 60, 90].map(n => [n, () => t('opt.minutes', { n })])] },
  { key: 'startCash', type: 'select', options: [1000, 1500, 2000, 2500].map(n => [n, () => money(n)]) },
  { key: 'dealProps', hint: true, type: 'select', options: [[0, () => t('opt.none')], [2, () => t('opt.props', { n: 2 })], [3, () => t('opt.props', { n: 3 })]] },
  { key: 'turnTimer', hint: true, type: 'select', options: [[0, () => t('opt.off')], ...[30, 60, 90].map(n => [n, () => t('opt.seconds', { n })])] },
  { key: 'auctions', hint: true, type: 'bool' },
  { key: 'freeParking', hint: true, type: 'bool' },
  { key: 'doubleGo', hint: true, type: 'bool' },
];
const REACTIONS = ['😂', '😡', '😎', '🔥', '👏', '😭', '🤡', '💀', '🙏', '👀'];
const MAX_PLAYERS = 8;

const app = {
  session: null,
  state: null,
  es: null,
  info: null,
  booting: true,
  lastSeq: 0,
  gameId: null,
  drawerOpen: false,
  drawerTab: 'chat',
  unread: 0,
  resultsKey: null,
  skew: 0,
  lobbySig: '',
  chatMsgs: [],
  logEvents: [],
  lastRooms: [],
  roomPollTimer: 0,
  connBannerTimer: 0,
  deed: null,          // square shown in the deed modal
  sheet: null,         // player shown in the player modal
  trade: null,         // trade being composed: { to, give, take }
  shown: { pos: {} },  // where tokens are drawn (they walk there over time)
  walking: Promise.resolve(),
  auctionSeen: null,
  offerSeen: null,
  timerRaf: 0,
  lastTickSec: -1,
  rolling: false,
  story: [],           // the last few things that happened, told in the board center
};

const me = () => app.state?.me;
const member = id => app.state?.members.find(m => m.id === id);
const isHost = () => Boolean(app.state && app.state.hostId === app.state.me);
const nameOf = (id, you = true) => (id === me() && you ? t('you') : member(id)?.name ?? t('someone'));
const colorOf = id => safeColor(member(id)?.color);
const game = () => app.state?.game;
const playerOf = id => game()?.players.find(p => p.id === id);
const now = () => Date.now() + app.skew;

function errorMessage(err) {
  if (err.code && has(`err.${err.code}`)) return t(`err.${err.code}`, { ...(err.params || {}), amount: err.params?.amount != null ? money(err.params.amount) : '', min: err.params?.min != null ? money(err.params.min) : '' });
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

const voice = createVoice({
  send: (action, extra) => (app.session
    ? api('action', { code: app.session.code, token: app.session.token, action, ...extra }).catch(() => {})
    : Promise.resolve()),
  onChange: renderVoice,
  onSpeaking: (id, on) => { for (const el of speakerEls(id)) el.toggleAttribute('data-speaking', on); },
  notify: key => toast(t(key), 'info', 4500),
});

function speakerEls(id) {
  return [$(`#players [data-pid="${id}"]`), $(`#lobby-players li[data-id="${id}"]`)].filter(Boolean);
}

function renderVoice() {
  for (const b of $$('.voice-btn')) {
    b.classList.toggle('on', voice.on);
    b.title = t(voice.on ? 'voice.leave' : 'voice.join');
  }
  for (const b of $$('.mic-btn')) {
    b.classList.toggle('hidden', !voice.on);
    b.classList.toggle('muted', voice.muted);
    b.textContent = voice.muted ? '🔇' : '🎙️';
    b.title = t(voice.muted ? 'voice.unmute' : 'voice.mute');
  }
}

const voiceTag = m => (m?.voice ? `<span class="voice-tag" title="${esc(t(m.voiceMuted ? 'voice.mutedTag' : 'voice.onTag'))}">${m.voiceMuted ? '🔇' : '🎙️'}</span>` : '');

function saveSession(s) {
  app.session = s;
  try { sessionStorage.setItem('mono.session', JSON.stringify(s)); } catch { /* ignore */ }
  store.set('last', { ...s, name: $('#name-input').value.trim() });
}
function loadTabSession() {
  try { const v = sessionStorage.getItem('mono.session'); return v ? JSON.parse(v) : null; } catch { return null; }
}
function clearSession() {
  app.session = null;
  try { sessionStorage.removeItem('mono.session'); } catch { /* ignore */ }
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

// Live updates come over an event stream; proxies that hold streams back (the online
// link) get long polling instead (see the UNO client for the long story).
const STREAM_WATCHDOG_MS = 4000;
let usePolling = false;

function disconnect() {
  clearTimeout(app.streamWatchdog);
  if (app.es) { app.es.close(); app.es = null; }
  app.pollGen = (app.pollGen || 0) + 1;
}

function connect() {
  disconnect();
  if (usePolling) { pollLoop(app.pollGen); return; }
  const { code, token } = app.session;
  const es = new EventSource(`/api/stream?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);
  app.es = es;
  let heard = false;
  app.streamWatchdog = setTimeout(() => {
    if (heard || app.es !== es) return;
    usePolling = true;
    connect();
  }, STREAM_WATCHDOG_MS);
  es.onopen = () => setConn(true);
  es.onmessage = ev => {
    heard = true;
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

async function pollLoop(gen) {
  let cid = '';
  while (app.pollGen === gen && app.session) {
    const { code, token } = app.session;
    try {
      const res = await fetch(`/api/poll?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}&cid=${cid}`, { cache: 'no-store' });
      if (app.pollGen !== gen) return;
      if (res.status === 404) { recheck(); return; }
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      cid = data.cid;
      setConn(true);
      for (const msg of data.messages) {
        if (app.pollGen !== gen) return;
        onMessage(msg);
      }
    } catch {
      if (app.pollGen !== gen) return;
      setConn(false);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
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
  voice.leave(true);
  clearTimeout(recheckTimer);
  disconnect();
  clearSession();
  app.state = null;
  app.resultsKey = null;
  app.logEvents = [];
  app.chatMsgs = [];
  $('#log-list').innerHTML = '';
  $('#chat-list').innerHTML = '';
  closeAllModals();
  setConn(true);
  stopTimer();
  history.replaceState(null, '', location.pathname);
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
    case 'signal': voice.onSignal(msg.from, msg.data); break;
    case 'kicked':
      disconnect();
      leaveToHome(has(`kick.${msg.reason}`) ? t(`kick.${msg.reason}`) : msg.reason);
      break;
    default: break;
  }
}

// ================================================================
// screens
// ================================================================

let wakeLock = null;
function keepAwake(on) {
  if (!on || document.hidden) { wakeLock?.then(l => l?.release()); wakeLock = null; return; }
  if (!wakeLock && navigator.wakeLock) wakeLock = navigator.wakeLock.request('screen').catch(() => null);
}

function showScreen(name) {
  for (const s of ['home', 'lobby', 'game']) $(`#screen-${s}`).classList.toggle('hidden', s !== name);
  const changed = document.body.dataset.screen !== name;
  document.body.dataset.screen = name;
  keepAwake(name === 'game');
  if (name === 'home') startRoomPolling(); else stopRoomPolling();
  if (changed && name === 'game') requestAnimationFrame(layoutBoard);
}

function render(prev) {
  const s = app.state;
  if (!s) return;
  voice.sync(s.members, s.me);
  renderVoice();
  if (!s.game) {
    if (app.resultsKey) { closeModal('results'); app.resultsKey = null; }
    stopTimer();
    for (const m of ['deed', 'player', 'auction', 'trade', 'offer']) closeModal(m);
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
  if (app.info?.online) setTimeout(loadInfo, app.info.publicUrl ? 30000 : 3000);
}

function renderAddresses(box, code) {
  if (!box) return;
  const suffix = code ? `/monopoly/?room=${code}` : '/monopoly/';
  const port = app.info?.port || location.port || 80;
  const pub = app.info?.publicUrl;
  const viaPublic = pub && location.origin === new URL(pub).origin;
  const lan = viaPublic ? [] : (app.info?.addresses || []).map(a => ({ url: `http://${a.address}:${port}${suffix}`, iface: a.iface, weak: a.address.startsWith('169.254.') }));
  const list = pub ? [{ url: pub + suffix, iface: t('addr.online'), online: true }, ...lan] : lan;
  if (code) renderQr(list.find(a => !a.weak)?.url);
  const pending = app.info?.online && !pub ? `<div class="addr pending"><small>${esc(t('addr.onlineWait'))}</small></div>` : '';
  if (!list.length) {
    box.innerHTML = `${pending}<div class="addr"><a href="${esc(location.origin + suffix)}">${esc(location.origin + suffix)}</a></div>
      <p class="muted small">${esc(t('addr.none'))}</p>`;
    return;
  }
  box.innerHTML = pending + list.map(a => `
    <div class="addr${a.weak ? ' weak' : ''}${a.online ? ' online' : ''}">
      <div><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url.replace(/^https?:\/\//, ''))}</a><br><small>${esc(a.iface)}${a.weak ? ` · ${esc(t('addr.weak'))}` : ''}</small></div>
      <button class="btn ghost sm" data-copy="${esc(a.url)}">${esc(t('btn.copy'))}</button>
    </div>`).join('');
}

function renderQr(url) {
  const box = $('#lobby-qr');
  box.classList.toggle('hidden', !url);
  if (!url || box.dataset.url === url) return;
  box.dataset.url = url;
  box.querySelector('.qr-img').innerHTML = qrSvg(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
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
      const res = await fetch('/api/rooms?game=monopoly');
      app.lastRooms = (await res.json()).rooms;
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

// the name is shared with the other games on this server
function storedName() {
  const own = store.get('name', '');
  if (own) return own;
  try { return JSON.parse(localStorage.getItem('uno.name') || '""'); } catch { return ''; }
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
    enterRoom(await api('create', { name, game: 'monopoly' }));
  } catch (err) { toast(errorMessage(err), 'error'); }
}

async function joinRoom(code) {
  const name = myName();
  if (!name) return;
  code = String(code || '').trim().toUpperCase();
  if (code.length !== 4) { toast(t('toast.codeLength'), 'error'); $('#code-input').focus(); return; }
  const last = store.get('last', null);
  try {
    enterRoom(await api('join', { code, name, game: 'monopoly', token: last?.code === code ? last.token : undefined }));
  } catch (err) {
    if (err.code === 'wrongGame' && /^[a-z]+$/.test(err.params?.game || '')) { location.href = `/${err.params.game}/?room=${code}`; return; }
    toast(errorMessage(err), 'error');
  }
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
    for (const [v, label] of s.options) {
      const opt = [...form.elements[s.key].options].find(o => o.value === String(v));
      if (opt) opt.textContent = label();
    }
  }
}

function fillSettings(settings, editable) {
  const form = $('#settings-form');
  for (const s of SETTINGS_UI) {
    const el = form.elements[s.key];
    if (s.type === 'bool') el.checked = Boolean(settings[s.key]);
    else el.value = String(settings[s.key]);
    el.disabled = !editable;
  }
}

function renderLobby(s) {
  $('#lobby-code').textContent = s.code;
  $('#lobby-code-2').textContent = s.code;
  const host = isHost();
  const sig = JSON.stringify([s.members, s.hostId, host, getLang()]);
  if (sig !== app.lobbySig) {
    app.lobbySig = sig;
    $('#lobby-count').textContent = `${s.members.length}/${MAX_PLAYERS}`;
    $('#lobby-players').innerHTML = s.members.map(m => `
      <li data-id="${m.id}">
        ${avatarHtml(m)}
        <span class="pname">${esc(m.name)}</span>
        <span class="tags">
          ${m.id === s.hostId ? `<span class="tag host">${t('tag.host')}</span>` : ''}
          ${m.id === s.me ? `<span class="tag you">${t('tag.you')}</span>` : ''}
          ${m.isBot ? `<span class="tag">${t('tag.bot')}</span>` : ''}
          ${!m.connected ? `<span class="tag off">${t('tag.away')}</span>` : ''}
          ${voiceTag(m)}
        </span>
        ${host && m.id !== s.me ? `<button class="btn ghost sm kick" data-kick="${m.id}" title="${esc(t('lobby.remove', { name: m.name }))}">✕</button>` : ''}
      </li>`).join('');
    for (const m of s.members) if (voice.isSpeaking(m.id)) $(`#lobby-players li[data-id="${m.id}"]`)?.setAttribute('data-speaking', '');
  }
  $('#btn-add-bot').classList.toggle('hidden', !host || s.members.length >= MAX_PLAYERS);
  fillSettings(s.settings, host);
  $('#rules-lock').textContent = host ? t('lobby.youPick') : t('lobby.hostPicks');
  const start = $('#btn-start');
  start.classList.toggle('hidden', !host);
  start.disabled = s.members.length < 2;
  start.textContent = s.members.length < 2 ? t('lobby.needPlayers') : t('lobby.start', { n: s.members.length });
  const hostName = member(s.hostId)?.name || t('theHost');
  $('#lobby-wait').textContent = host ? t('lobby.hint') : t('lobby.waiting', { name: hostName });
  const addrBox = $('#lobby-addresses');
  if (!addrBox.children.length || addrBox.dataset.code !== s.code || addrBox.dataset.lang !== getLang()) {
    addrBox.dataset.code = s.code;
    addrBox.dataset.lang = getLang();
    renderAddresses(addrBox, s.code);
  }
}

// ================================================================
// the board
// ================================================================

// grid cell of each square: GO bottom right, then clockwise
function cellOf(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: 'b' };
  if (i <= 20) return { row: 11 - (i - 10), col: 1, side: 'l' };
  if (i <= 30) return { row: 1, col: 1 + (i - 20), side: 't' };
  return { row: 1 + (i - 30), col: 11, side: 'r' };
}
const isCorner = i => i % 10 === 0;

function buildBoard() {
  const board = $('#board');
  for (const el of $$('.tile', board)) el.remove();
  const frag = document.createDocumentFragment();
  for (const sq of SQ) {
    const { row, col, side } = cellOf(sq.i);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tile ${isCorner(sq.i) ? 'corner' : `side-${side}`} t-${sq.type}`;
    el.dataset.sq = sq.i;
    el.style.gridArea = `${row} / ${col}`;
    el.innerHTML = tileInner(sq);
    frag.appendChild(el);
  }
  board.prepend(frag);
}

function tileInner(sq) {
  const name = esc(sqName(sq.i));
  if (isCorner(sq.i)) {
    if (sq.type === 'jail') {
      return `<div class="tile-in"><div class="cell"><span>${esc(t('board.inJail'))}</span></div><div class="visit">${esc(t('board.visiting'))}</div></div>`;
    }
    return `<div class="tile-in"><div class="big">${ICON[sq.type]}</div><div class="nm">${name}</div>${sq.type === 'go' ? `<div class="sub">${esc(t('board.collect', { amount: money(200) }))}</div>` : ''}</div>`;
  }
  const band = sq.type === 'street' ? `<div class="band" style="--g:${GROUP_COLOR[sq.group]}"><span class="bld"></span></div>` : '';
  const icon = sq.type === 'street' ? '' : `<div class="ic">${sq.type === 'util' ? utilIcon(sq.i) : ICON[sq.type]}</div>`;
  const price = sq.price ? money(sq.price) : sq.type === 'tax' ? money(sq.amount) : '';
  const long = sqName(sq.i).split(/\s+/).some(w => w.length > 10) ? ' long' : '';
  return `<div class="tile-in">${band}<div class="nm${long}">${name}</div>${icon}<div class="pr">${price}</div><div class="own"></div></div>`;
}

let boardSig = '';
function renderBoard(g) {
  const sig = JSON.stringify([g.owner, g.houses, g.mortgaged, g.offer, g.auction?.square, g.players.map(p => member(p.id)?.color), getLang()]);
  if (sig === boardSig) return;
  boardSig = sig;
  for (const el of $$('#board .tile')) {
    const i = Number(el.dataset.sq);
    const owner = g.owner[i];
    el.classList.toggle('owned', Boolean(owner));
    el.classList.toggle('mortgaged', Boolean(g.mortgaged[i]));
    el.classList.toggle('offer', g.offer === i || g.auction?.square === i);
    el.classList.toggle('mine', owner === me());
    if (owner) el.style.setProperty('--owner', colorOf(owner)); else el.style.removeProperty('--owner');
    const own = $('.own', el);
    if (own) own.textContent = owner ? (member(owner)?.name ?? '') : '';
    const bld = $('.bld', el);
    if (bld) {
      const h = g.houses[i];
      bld.innerHTML = h === 5 ? '<i class="hotel"></i>' : '<i class="house"></i>'.repeat(h);
    }
  }
}

// Sizes everything from one number: the cell width.
function layoutBoard() {
  const area = $('#board-area');
  if (!area || area.offsetParent === null) return;
  const wide = matchMedia('(min-width: 860px), (orientation: landscape) and (min-width: 600px)').matches;
  const w = area.clientWidth;
  const h = wide ? area.clientHeight : window.innerHeight * 0.9;
  // room for the border and the drop shadow
  const size = Math.max(280, Math.floor(Math.min(w, h)) - 14);
  const c = size / 12.2;
  const board = $('#board');
  board.style.setProperty('--c', `${c}px`);
  board.style.setProperty('--S', `${c * 12.2}px`);
  placeTokens(false);
}

// pixel center of a square (board coordinates)
function tileCenter(i) {
  const c = parseFloat($('#board').style.getPropertyValue('--c')) || 40;
  const edge = k => (k === 1 ? 0 : 1.6 * c + (k - 2) * c);
  const size = k => (k === 1 || k === 11 ? 1.6 * c : c);
  const { row, col } = cellOf(i);
  return { x: edge(col) + size(col) / 2, y: edge(row) + size(row) / 2, c };
}

// ---------------- tokens ----------------

function tokenEl(id) {
  let el = $(`#tokens [data-token="${id}"]`);
  if (!el) {
    el = document.createElement('div');
    el.className = 'token';
    el.dataset.token = id;
    $('#tokens').appendChild(el);
  }
  return el;
}

const SPREAD = [[0, 0], [-1, -1], [1, 1], [1, -1], [-1, 1], [0, -1.4], [0, 1.4], [-1.4, 0], [1.4, 0]];

function placeTokens(animate = true) {
  const g = game();
  if (!g) return;
  const myPos = playerOf(me()) && !playerOf(me()).bankrupt ? (app.shown.pos[me()] ?? playerOf(me()).pos) : -1;
  for (const el of $$('#board .tile.here')) if (Number(el.dataset.sq) !== myPos) el.classList.remove('here');
  const here = $(`#board .tile[data-sq="${myPos}"]`);
  if (here) { here.classList.add('here'); here.style.setProperty('--me', colorOf(me())); }
  const alive = g.players.filter(p => !p.bankrupt);
  const live = new Set(alive.map(p => p.id));
  for (const el of $$('#tokens .token')) if (!live.has(el.dataset.token)) el.remove();
  // tokens sharing a square spread out a little
  const groups = {};
  for (const p of alive) {
    const pos = app.shown.pos[p.id] ?? p.pos;
    const key = pos === 10 && p.jailed ? 'jail' : String(pos);
    (groups[key] ||= []).push(p.id);
  }
  for (const [key, ids] of Object.entries(groups)) {
    ids.forEach((id, k) => {
      const pos = key === 'jail' ? 10 : Number(key);
      const { x, y, c } = tileCenter(pos);
      const [dx, dy] = SPREAD[k % SPREAD.length];
      let ox = dx * c * 0.24;
      let oy = dy * c * 0.24;
      if (pos === 10) {
        // in the cell (top right of the corner) or just visiting (along the edges)
        if (key === 'jail') { ox = ox * 0.7 + c * 0.22; oy = oy * 0.7 - c * 0.22; } else { ox = -c * 0.55 + (k % 4) * c * 0.36; oy = c * 0.55; if (k >= 4) { ox = -c * 0.55; oy = c * 0.55 - (k - 3) * c * 0.36; } }
      }
      const el = tokenEl(id);
      el.classList.toggle('no-anim', !animate);
      el.style.transform = `translate(${x + ox}px, ${y + oy}px) translate(-50%, -50%)`;
      const m = member(id);
      el.style.setProperty('--av', colorOf(id));
      el.textContent = [...(m?.name || '?')][0].toUpperCase();
      el.title = m?.name || '';
      el.classList.toggle('current', g.current === id);
      el.classList.toggle('me', id === me());
      el.classList.toggle('jailed', key === 'jail');
    });
  }
}

// Walk tokens along the board for new move events, one square at a time.
function walk(events) {
  for (const ev of events) {
    if (ev.type !== 'move') continue;
    app.walking = app.walking.then(async () => {
      const steps = ev.forward ? (ev.to - ev.from + 40) % 40 : 0;
      if (ev.via === 'roll' && steps > 0 && steps <= 12 && !app.calm) {
        for (let k = 1; k <= steps; k++) {
          app.shown.pos[ev.player] = (ev.from + k) % 40;
          placeTokens(true);
          tokenEl(ev.player).classList.remove('hop');
          void tokenEl(ev.player).offsetWidth;
          tokenEl(ev.player).classList.add('hop');
          sfx.step(k === steps);
          await sleep(k === steps ? 200 : 130);
        }
      } else {
        app.shown.pos[ev.player] = ev.to;
        placeTokens(true);
        sfx.whoosh();
        await sleep(450);
      }
    });
  }
  // end exactly where the server says
  app.walking = app.walking.then(() => {
    const g = game();
    if (!g) return;
    for (const p of g.players) app.shown.pos[p.id] = p.pos;
    placeTokens(true);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- dice ----------------

const PIPS = {
  1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
};
function dieHtml(n) {
  return Array.from({ length: 9 }, (_, k) => `<i${PIPS[n]?.includes(k + 1) ? ' class="on"' : ''}></i>`).join('');
}
function showDice(d, animate) {
  const dice = $$('#dice .die');
  if (!d) { dice.forEach(el => { el.innerHTML = dieHtml(0); }); return; }
  if (!animate) { dice.forEach((el, k) => { el.innerHTML = dieHtml(d[k]); }); return; }
  app.rolling = true;
  sfx.dice();
  let n = 0;
  const spin = setInterval(() => {
    dice.forEach(el => { el.innerHTML = dieHtml(1 + Math.floor(Math.random() * 6)); el.classList.add('rolling'); });
    if (++n >= 7) {
      clearInterval(spin);
      dice.forEach((el, k) => { el.innerHTML = dieHtml(d[k]); el.classList.remove('rolling'); });
      app.rolling = false;
      if (d[0] === d[1]) bubble($('#dice'), t('bubble.doubles'), 'good');
    }
  }, 70);
}

// ================================================================
// game rendering
// ================================================================

function renderGame(s, prev) {
  const g = s.game;
  const fresh = g.id !== app.gameId;
  if (fresh) {
    app.gameId = g.id;
    app.lastSeq = 0;
    app.shown.pos = {};
    app.walking = Promise.resolve();
    app.logEvents = [];
    app.story = [];
    $('#log-list').innerHTML = '';
    boardSig = '';
    if (!$('#board .tile')) buildBoard();
    closeModal('results');
    app.resultsKey = null;
    requestAnimationFrame(layoutBoard);
  }
  $('#g-code').textContent = s.code;
  const boot = app.booting || fresh;
  const news = g.events.filter(e => e.seq > app.lastSeq);
  app.lastSeq = Math.max(app.lastSeq, ...g.events.map(e => e.seq), 0);

  renderBoard(g);
  for (const ev of news) logEvent(ev);
  if (boot) {
    for (const p of g.players) app.shown.pos[p.id] = p.pos;
    placeTokens(false);
    showDice(g.dice, false);
  } else {
    walk(news);
    for (const ev of news) animateEvent(ev, g);
  }
  renderPlayers(g);
  renderMine(g);
  renderSideInfo(g);
  renderCenter(g);
  renderAuction(g);
  renderOffer(g);
  if (app.deed !== null && isOpen('deed')) renderDeed(app.deed);
  if (app.sheet && isOpen('player')) renderSheet(app.sheet);
  if (isOpen('trade')) renderTradeComposer();
  renderStory();
  startTimer();
  maybeShowResults(g, boot);
  if (fresh && g.phase === 'play' && playerOf(me()) && !store.get('introSeen', false)) {
    store.set('introSeen', true);
    showIntro();
  }
  void prev;
}

function stepText(g) {
  const cur = g.current;
  if (g.debt) return t(g.debt.player === me() ? 'status.youOwe' : 'status.owes', { name: nameOf(g.debt.player), amount: money(g.debt.amount), to: debtTo(g.debt) });
  if (g.auction) return t('status.auction', { square: sqName(g.auction.square) });
  if (cur === me()) {
    if (g.step === 'roll') return playerOf(me()).jailed ? t('status.jailChoice', { n: playerOf(me()).jailTurns + 1 }) : t('status.yourRoll');
    if (g.step === 'buy') return t('status.youLanded', { square: sqName(g.offer) });
    return t('status.youDone');
  }
  if (g.step === 'buy') return t('status.deciding', { name: nameOf(cur), square: sqName(g.offer) });
  return t(g.step === 'roll' ? 'status.rolling' : 'status.finishing', { name: nameOf(cur) });
}
const debtTo = d => (d.to && d.to !== 'pot' ? nameOf(d.to) : t('theBank'));

// One sentence on what the choice in front of you means. Returns HTML.
function explain(g) {
  const meP = playerOf(me());
  if (!meP || meP.bankrupt) return esc(t('explain.watching'));
  if (g.debt) return g.debt.player === me() ? esc(t(g.debt.canCover ? 'hint.debt' : 'hint.debtHopeless')) : esc(t('explain.wait', { name: nameOf(g.debt.player) }));
  if (g.auction) return esc(t('explain.auction'));
  if (g.current !== me()) return esc(t('explain.wait', { name: nameOf(g.current) }));
  if (g.step === 'roll') return esc(t(meP.jailed ? 'explain.jail' : g.doubles ? 'explain.doubles' : 'explain.roll'));
  if (g.step === 'buy') {
    const sq = SQ[g.offer];
    const rent = sq.type === 'street' ? money(sq.rents[0]) : sq.type === 'rail' ? money(25) : '';
    const why = t(`explain.buy.${sq.type}`, { square: sqName(g.offer), price: money(sq.price), rent });
    const alt = g.settings.auctions ? t('explain.orAuction') : t('explain.orSkip');
    const poor = g.canBuy ? '' : ` <b>${esc(t('hint.raise'))}</b>`;
    return `${esc(why)} ${esc(alt)}${poor}`;
  }
  const canBuild = Object.values(GROUP_SQ).some(list => SQ[list[0]].type === 'street' && list.every(i => g.owner[i] === me()) && list.some(i => g.houses[i] < 5));
  return esc(t(canBuild ? 'explain.doneBuild' : 'explain.done'));
}

function showIntro() {
  const meP = playerOf(me());
  $('#intro-you').innerHTML = meP
    ? `<span class="token-demo" style="--av:${colorOf(me())}">${esc([...(member(me())?.name || '?')][0].toUpperCase())}</span>${esc(t('intro.you'))}`
    : '';
  openModal('intro');
}

function renderCenter(g) {
  const meP = playerOf(me());
  const playing = g.phase === 'play';
  const cur = g.current;
  $('#turn-line').innerHTML = playing && cur
    ? `<span class="dot" style="background:${colorOf(cur)}"></span>${esc(cur === me() ? t('turn.yours') : t('turn.theirs', { name: nameOf(cur) }))}`
    : esc(t('turn.over'));
  $('#status').textContent = playing ? stepText(g) : (g.winner ? t('status.winner', { name: nameOf(g.winner) }) : '');
  $('#explain').innerHTML = playing ? explain(g) : '';

  const btns = [];
  const b = (action, label, cls = '', disabled = false, title = '') => btns.push(`<button class="btn ${cls}" data-act="${action}"${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${esc(label)}</button>`);
  if (!playing) {
    b('results', t('btn.results'), 'primary');
  } else if (g.debt?.player === me()) {
    b('payDebt', t('btn.pay', { amount: money(g.debt.amount) }), 'primary', meP.cash < g.debt.amount);
    b('bankrupt', t('btn.bankrupt'), 'danger');
  } else if (g.auction) {
    if (meP && !meP.bankrupt) b('openAuction', t('btn.openAuction'), 'primary');
  } else if (cur === me() && !g.debt) {
    if (g.canUseCard) b('jailCard', t('btn.useCard'));
    if (g.canPayJail) b('payJail', t('btn.payJail', { amount: money(50) }));
    if (g.canRoll) b('roll', meP.jailed ? t('btn.rollDoubles') : t('btn.roll'), 'primary big-roll');
    if (g.step === 'buy') {
      const price = SQ[g.offer].price;
      b('buy', t('btn.buy', { amount: money(price) }), 'primary', !g.canBuy, g.canBuy ? '' : t('hint.raise'));
      b('decline', g.settings.auctions ? t('btn.auction') : t('btn.skip'));
      b('deed', t('btn.deed'), 'ghost');
    }
    if (g.canEnd) b('endTurn', t('btn.endTurn'), 'primary');
  }
  const t2 = g.trade;
  if (t2 && t2.from === me()) btns.push(`<button class="btn ghost sm" data-act="tradeCancel">${esc(t('btn.cancelOffer', { name: nameOf(t2.to) }))}</button>`);
  else if (t2 && t2.to === me()) btns.push(`<button class="btn warn sm" data-act="openOffer">${esc(t('btn.seeOffer', { name: nameOf(t2.from) }))}</button>`);
  const html = btns.join('');
  const box = $('#actions');
  if (box.innerHTML !== html) box.innerHTML = html;

  // the deed of the square on offer peeks out
  const hint = g.debt?.player === me() ? t(g.debt.canCover ? 'hint.debt' : 'hint.debtHopeless') : '';
  box.dataset.hint = hint;
  $('#center-panel').classList.toggle('my-turn', playing && (g.actor === me()));
}

function renderPlayers(g) {
  const order = g.players;
  $('#players').innerHTML = order.map(p => {
    const m = member(p.id);
    const props = g.owner.map((o, i) => (o === p.id ? i : -1)).filter(i => i >= 0);
    const chips = props.map(i => `<i style="--g:${GROUP_COLOR[SQ[i].group]}"${g.mortgaged[i] ? ' class="mort"' : ''}></i>`).join('');
    const cls = ['pl', g.current === p.id && g.phase === 'play' ? 'current' : '', p.bankrupt ? 'out' : '', p.id === me() ? 'me' : ''].join(' ');
    const tags = [
      p.jailed ? `<span class="tag" title="${esc(t('tag.jail'))}">🔒</span>` : '',
      p.jailCards ? `<span class="tag" title="${esc(t('tag.jailCard'))}">🎫${p.jailCards > 1 ? `×${p.jailCards}` : ''}</span>` : '',
      m && !m.connected && !m.isBot ? `<span class="tag off">${t('tag.away')}</span>` : '',
      p.bankrupt ? `<span class="tag off">${t('tag.bankrupt')}</span>` : '',
      voiceTag(m),
    ].join('');
    return `<button class="${cls}" data-pid="${p.id}" style="--pc:${colorOf(p.id)}">
      ${avatarHtml(m)}
      <span class="pl-main"><span class="pl-name">${esc(m?.name ?? '?')}${p.id === me() ? ` <small>(${esc(t('you'))})</small>` : ''}</span>
      <span class="pl-where">${p.bankrupt ? '' : p.jailed ? `🔒 ${esc(t('where.jail'))}` : `📍 ${esc(sqName(p.pos))}`}</span>
      <span class="pl-props">${chips}</span></span>
      <span class="pl-money"><b>${money(p.cash)}</b><small>${esc(t('worth', { amount: money(p.worth) }))}</small></span>
      <span class="pl-tags">${tags}</span>
    </button>`;
  }).join('');
  for (const p of order) if (voice.isSpeaking(p.id)) $(`#players [data-pid="${p.id}"]`)?.setAttribute('data-speaking', '');
}

function renderMine(g) {
  const mine = g.owner.map((o, i) => (o === me() ? i : -1)).filter(i => i >= 0);
  const meP = playerOf(me());
  $('#my-worth').textContent = meP ? t('worth', { amount: money(meP.worth) }) : '';
  if (!mine.length) { $('#my-props').innerHTML = `<p class="muted small">${esc(t(meP ? 'side.noProps' : 'side.watching'))}</p>`; return; }
  const groups = {};
  for (const i of mine) (groups[SQ[i].group] ||= []).push(i);
  $('#my-props').innerHTML = Object.entries(groups).map(([gr, list]) => {
    const full = list.length === GROUP_SQ[gr].length;
    return `<div class="pgroup${full ? ' full' : ''}" style="--g:${GROUP_COLOR[gr]}">
      ${list.map(i => `<button class="pchip${g.mortgaged[i] ? ' mort' : ''}" data-deed="${i}">
        <span class="pc-name">${esc(sqName(i))}</span>
        <span class="pc-bld">${g.houses[i] === 5 ? '🏨' : '🏠'.repeat(g.houses[i])}${g.mortgaged[i] ? `<em>${esc(t('deed.mortgagedShort'))}</em>` : ''}</span>
      </button>`).join('')}
      ${full ? `<span class="pg-tag">${esc(t(gr === 'rail' || gr === 'util' ? 'side.allOf' : 'side.canBuild'))}</span>` : ''}
    </div>`;
  }).join('');
}

function renderSideInfo(g) {
  const bits = [`<span>🏠 ${g.bank.houses}</span><span>🏨 ${g.bank.hotels}</span>`];
  if (g.settings.freeParking) bits.push(`<span title="${esc(t('set.freeParking'))}">🅿️ ${money(g.pot)}</span>`);
  if (g.trade && g.trade.from !== me() && g.trade.to !== me()) bits.push(`<span>🤝 ${esc(t('side.trading', { a: nameOf(g.trade.from), b: nameOf(g.trade.to) }))}</span>`);
  $('#side-info').innerHTML = bits.join('');
}

// countdowns: turn timer, auction clock, time limit
function startTimer() {
  cancelAnimationFrame(app.timerRaf);
  const tick = () => {
    const g = game();
    if (!g) return;
    const n = now();
    const bar = $('#timer');
    const limit = g.settings.turnTimer;
    if (g.phase === 'play' && limit && !g.auction && g.actor) {
      const left = Math.max(0, g.turnStartedAt + limit * 1000 - n);
      bar.classList.remove('hidden');
      bar.firstElementChild.style.width = `${(left / (limit * 1000)) * 100}%`;
      bar.classList.toggle('low', left < 8000);
      const sec = Math.ceil(left / 1000);
      if (g.actor === me() && sec <= 5 && sec > 0 && sec !== app.lastTickSec) { app.lastTickSec = sec; sfx.tick(); }
    } else bar.classList.add('hidden');
    if (g.auction) {
      const a = g.auction;
      const left = Math.max(0, a.endsAt - n);
      const el = $('#auction-clock');
      if (el) {
        el.firstElementChild.style.width = `${Math.min(100, (left / 10000) * 100)}%`;
        el.dataset.left = `${Math.ceil(left / 1000)}s`;
      }
    }
    const clock = $('#g-clock');
    if (g.endsAt && g.phase === 'play') {
      const left = Math.max(0, g.endsAt - n);
      const mm = Math.floor(left / 60000);
      const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      clock.textContent = left ? t('clock.left', { time: `${mm}:${ss}` }) : t('clock.lastTurn');
      clock.classList.toggle('low', left < 120000);
    } else clock.textContent = g.phase === 'play' ? t('clock.noLimit') : '';
    app.timerRaf = requestAnimationFrame(tick);
  };
  tick();
}
function stopTimer() { cancelAnimationFrame(app.timerRaf); }

// ================================================================
// events: sounds, bubbles, card pop-ups
// ================================================================

const tokenAnchor = id => $(`#tokens [data-token="${id}"]`) || $(`#players [data-pid="${id}"]`);
const playerAnchor = id => $(`#players [data-pid="${id}"] .pl-money`) || tokenAnchor(id);

function animateEvent(ev, g) {
  const mine = ev.player === me();
  switch (ev.type) {
    case 'roll':
      if (!ev.forRent) showDice(ev.dice, true);
      break;
    case 'collect':
      setTimeout(() => bubble(playerAnchor(ev.player), `+${money(ev.amount)}`, 'good'), ev.reason === 'go' ? 600 : 0);
      if (mine) sfx.coin();
      break;
    case 'buy':
    case 'auctionWon':
      sfx.buy();
      flashTile(ev.square);
      break;
    case 'rent':
      if (mine) toast(t('toast.paidRent', { amount: money(ev.amount), name: nameOf(ev.owner), square: sqName(ev.square) }), 'error', 3500);
      else if (ev.owner === me()) toast(t('toast.gotRent', { amount: money(ev.amount), name: nameOf(ev.player), square: sqName(ev.square) }), 'good', 3500);
      bubble(playerAnchor(ev.player), `−${money(ev.amount)}`, 'bad');
      setTimeout(() => bubble(playerAnchor(ev.owner), `+${money(ev.amount)}`, 'good'), 350);
      if (mine || ev.owner === me()) sfx.cash();
      break;
    case 'tax':
      bubble(playerAnchor(ev.player), `−${money(ev.amount)}`, 'bad');
      if (mine) sfx.cash();
      break;
    case 'card':
      // once the token has arrived
      app.walking = app.walking.then(() => showCard(ev));
      break;
    case 'jail':
      sfx.jail();
      setTimeout(() => bubble(tokenAnchor(ev.player), t('bubble.jail'), 'bad'), 500);
      break;
    case 'speeding':
      bubble(tokenAnchor(ev.player), t('bubble.speeding'), 'bad');
      break;
    case 'jailFree':
      bubble(tokenAnchor(ev.player), t('bubble.free'), 'good');
      break;
    case 'build': case 'sell':
      sfx.build();
      flashTile(ev.square);
      break;
    case 'mortgage': case 'unmortgage':
      sfx.coin();
      break;
    case 'auction':
      sfx.gavel();
      break;
    case 'bid':
      sfx.tick();
      bubble(playerAnchor(ev.player), money(ev.amount));
      break;
    case 'debt':
      if (mine) { sfx.error(); toast(t('toast.debt', { amount: money(ev.amount) }), 'error', 4000); vibrate([60, 40, 60]); }
      break;
    case 'bankrupt':
      sfx.lose();
      toast(t('toast.bankrupt', { name: nameOf(ev.player) }), 'error', 4000);
      break;
    case 'tradeOffer':
      if (ev.target === me()) { sfx.turn(); vibrate(80); }
      break;
    case 'tradeDone':
      sfx.buy();
      toast(t('toast.tradeDone', { a: nameOf(ev.player), b: nameOf(ev.target) }), 'good');
      break;
    case 'tradeDeclined':
      if (ev.target === me()) toast(t('toast.tradeDeclined', { name: nameOf(ev.player) }), 'info');
      break;
    case 'turn':
      if (mine) {
        sfx.turn();
        vibrate(60);
        if (document.hidden) document.title = t('title.yourTurn');
      }
      break;
    case 'timeout':
      if (mine) toast(t('toast.timeout'), 'info');
      break;
    case 'gameOver':
      if (ev.winner === me()) sfx.win(); else sfx.lose();
      break;
    default: break;
  }
  void g;
}

function flashTile(i) {
  const el = $(`#board .tile[data-sq="${i}"]`);
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

let cardTimer = 0;
function showCard(ev) {
  const pop = $('#card-pop');
  clearTimeout(cardTimer);
  pop.className = `card-pop ${ev.deck}`;
  pop.innerHTML = `<div class="cp-head">${esc(t(ev.deck === 'chance' ? 'deck.chance' : 'deck.chest'))}</div>
    <p>${esc(t(`${ev.deck}.${ev.card}`))}</p><small>${esc(nameOf(ev.player))}</small>`;
  sfx.card();
  cardTimer = setTimeout(() => pop.classList.add('hidden'), 4200);
}

// ================================================================
// deed cards & managing property
// ================================================================

function deedHtml(i) {
  const sq = SQ[i];
  const g = game();
  const color = GROUP_COLOR[sq.group] || '#ccc';
  let rows = '';
  if (sq.type === 'street') {
    const r = sq.rents;
    rows = `
      <tr><td>${esc(t('deed.rent'))}</td><td>${money(r[0])}</td></tr>
      <tr><td>${esc(t('deed.withSet'))}</td><td>${money(r[0] * 2)}</td></tr>
      ${[1, 2, 3, 4].map(h => `<tr><td>${esc(t('deed.withHouses', { n: h }))}</td><td>${money(r[h])}</td></tr>`).join('')}
      <tr><td>${esc(t('deed.withHotel'))}</td><td>${money(r[5])}</td></tr>
      <tr class="sep"><td>${esc(t('deed.houseCost'))}</td><td>${money(sq.house)}</td></tr>`;
  } else if (sq.type === 'rail') {
    rows = [1, 2, 3, 4].map(n => `<tr><td>${esc(t('deed.rails', { n }))}</td><td>${money(25 * 2 ** (n - 1))}</td></tr>`).join('');
  } else {
    rows = `<tr><td colspan="2" class="util-text">${esc(t('deed.util1'))}</td></tr><tr><td colspan="2" class="util-text">${esc(t('deed.util2'))}</td></tr>`;
  }
  rows += `<tr><td>${esc(t('deed.mortgage'))}</td><td>${money(mortgageValue(i))}</td></tr>`;
  const owner = g?.owner[i];
  const status = owner
    ? `<p class="deed-owner"><span class="dot" style="background:${colorOf(owner)}"></span>${esc(t('deed.ownedBy', { name: nameOf(owner) }))}${g.mortgaged[i] ? ` · <b class="mort-tag">${esc(t('deed.mortgaged'))}</b>` : ''}${g.houses[i] ? ` · ${g.houses[i] === 5 ? '🏨' : '🏠'.repeat(g.houses[i])}` : ''}</p>`
    : `<p class="deed-owner muted">${esc(t('deed.forSale', { amount: money(sq.price) }))}</p>`;
  return `<div class="deed ${sq.type}" style="--g:${color}">
    <div class="deed-head"><small>${esc(t(sq.type === 'street' ? 'deed.title' : 'deed.titlePlain'))}</small><b>${sq.type === 'rail' ? '🚂 ' : sq.type === 'util' ? `${utilIcon(i)} ` : ''}${esc(sqName(i))}</b></div>
    <table>${rows}</table>
  </div>${status}`;
}

// What I may do with one of my properties right now (mirrors the server's rules).
function manageOptions(i) {
  const g = game();
  const sq = SQ[i];
  if (!g || g.phase !== 'play' || g.owner[i] !== me()) return [];
  const meP = playerOf(me());
  const busy = Boolean(g.auction);
  const owed = g.debt?.player === me();
  const group = GROUP_SQ[sq.group];
  const opts = [];
  if (sq.type === 'street') {
    const full = group.every(j => g.owner[j] === me());
    const anyMort = group.some(j => g.mortgaged[j]);
    const h = g.houses[i];
    const minH = Math.min(...group.map(j => g.houses[j]));
    const maxH = Math.max(...group.map(j => g.houses[j]));
    let why = '';
    if (!full) why = t('err.needGroup');
    else if (anyMort) why = t('err.groupMortgaged');
    else if (h >= 5) why = t('err.maxBuilt');
    else if (h > minH) why = t('err.buildEvenly');
    else if (h === 4 ? g.bank.hotels < 1 : g.bank.houses < 1) why = t(h === 4 ? 'err.noHotelsLeft' : 'err.noHousesLeft');
    else if (meP.cash < sq.house) why = t('err.cantAfford');
    else if (owed) why = t('hint.payFirst');
    if (full) opts.push({ action: 'build', label: t(h === 4 ? 'deed.buildHotel' : 'deed.build', { amount: money(sq.house) }), why: busy ? t('err.auctionRunning') : why, primary: true });
    if (h > 0) opts.push({ action: 'sell', label: t('deed.sell', { amount: money(sq.house / 2) }), why: busy ? t('err.auctionRunning') : h < maxH ? t('err.sellEvenly') : '' });
  }
  if (!g.mortgaged[i]) {
    const blocked = sq.type === 'street' && group.some(j => g.houses[j] > 0);
    opts.push({ action: 'mortgage', label: t('deed.doMortgage', { amount: money(mortgageValue(i)) }), why: busy ? t('err.auctionRunning') : blocked ? t('err.sellBuildingsFirst') : '' });
  } else {
    const cost = unmortgageCost(i);
    opts.push({ action: 'unmortgage', label: t('deed.unmortgage', { amount: money(cost) }), why: busy ? t('err.auctionRunning') : owed ? t('hint.payFirst') : meP.cash < cost ? t('err.cantAfford') : '', primary: true });
  }
  return opts;
}

function renderDeed(i) {
  $('#deed-body').innerHTML = deedHtml(i);
  const opts = manageOptions(i);
  $('#deed-actions').innerHTML = opts.map(o => `<button class="btn ${o.primary ? 'primary' : ''}" data-manage="${o.action}" data-sq="${i}"${o.why ? ' disabled' : ''}>${esc(o.label)}</button>${o.why ? `<small class="why">${esc(o.why)}</small>` : ''}`).join('');
}

function openDeed(i) {
  if (!SQ[i]?.price) return;
  app.deed = i;
  renderDeed(i);
  openModal('deed');
}

function renderSheet(id) {
  const g = game();
  const p = playerOf(id);
  const m = member(id);
  if (!g || !p) { closeModal('player'); return; }
  const props = g.owner.map((o, i) => (o === id ? i : -1)).filter(i => i >= 0);
  $('#player-body').innerHTML = `
    <div class="sheet-head">${avatarHtml(m)}<div><h2>${esc(m?.name ?? '?')}</h2>
    <p class="muted">${money(p.cash)} · ${esc(t('worth', { amount: money(p.worth) }))}${p.jailed ? ` · 🔒 ${esc(t('tag.jail'))}` : ''}${p.jailCards ? ` · 🎫×${p.jailCards}` : ''}</p></div></div>
    <div class="sheet-props">${props.length ? props.map(i => `<button class="pchip${g.mortgaged[i] ? ' mort' : ''}" data-deed="${i}" style="--g:${GROUP_COLOR[SQ[i].group]}"><span class="pc-name">${esc(sqName(i))}</span><span class="pc-bld">${g.houses[i] === 5 ? '🏨' : '🏠'.repeat(g.houses[i])}</span></button>`).join('') : `<p class="muted">${esc(t('side.noPropsThem'))}</p>`}</div>`;
  const tradeBtn = $('#btn-trade-with');
  const canTrade = g.phase === 'play' && id !== me() && !p.bankrupt && playerOf(me()) && !playerOf(me()).bankrupt;
  tradeBtn.classList.toggle('hidden', !canTrade);
  tradeBtn.textContent = t('trade.with', { name: m?.name ?? '?' });
}

function openSheet(id) {
  if (id === me()) { $('#my-props').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  app.sheet = id;
  renderSheet(id);
  openModal('player');
}

// ================================================================
// auctions
// ================================================================

function renderAuction(g) {
  const a = g.auction;
  if (!a) {
    if (isOpen('auction')) closeModal('auction');
    app.auctionSeen = null;
    return;
  }
  const meP = playerOf(me());
  const inIt = meP && !meP.bankrupt && !a.out.includes(me());
  // pops up once per auction for everyone still in it
  if (app.auctionSeen !== a.id) {
    app.auctionSeen = a.id;
    if (inIt) openModal('auction');
  }
  const high = a.bidder ? t('auction.high', { amount: money(a.high), name: nameOf(a.bidder) }) : t('auction.noBids');
  const steps = [10, 50, 100].map(d => a.high + d).filter(v => meP && v <= meP.cash);
  const outList = a.out.map(id => esc(nameOf(id))).join(', ');
  // bids keep coming in: don't lose an amount being typed
  const typing = document.activeElement?.id === 'bid-input';
  const typed = $('#bid-input')?.value || '';
  $('#auction-body').innerHTML = `
    <div class="auction-deed">${deedHtml(a.square)}</div>
    <div class="auction-high${a.bidder === me() ? ' mine' : ''}">${esc(high)}</div>
    <div id="auction-clock" class="auction-clock"><i></i></div>
    ${inIt ? `
      <p class="muted small">${esc(t('auction.yourCash', { amount: money(meP.cash) }))}</p>
      <div class="bid-row">${steps.map(v => `<button class="btn ${v === steps[0] ? 'primary' : ''}" data-bid="${v}">${money(v)}</button>`).join('')}</div>
      <form id="bid-form" class="bid-form"><input id="bid-input" type="number" inputmode="numeric" min="${a.high + 1}" max="${meP.cash}" placeholder="${esc(t('auction.custom'))}"><button class="btn" type="submit">${esc(t('auction.bid'))}</button></form>
      <button class="btn ghost sm" data-act="passAuction"${a.bidder === me() ? ' disabled' : ''}>${esc(t('auction.pass'))}</button>`
    : `<p class="muted">${esc(t(meP && !meP.bankrupt ? 'auction.youreOut' : 'auction.watching'))}</p>`}
    ${outList ? `<p class="muted small">${esc(t('auction.outList'))} ${outList}</p>` : ''}`;
  const input = $('#bid-input');
  if (input && typed) input.value = typed;
  if (input && typing) input.focus();
}

// ================================================================
// trades
// ================================================================

function tradable(i) {
  const g = game();
  const sq = SQ[i];
  return !(sq.type === 'street' && GROUP_SQ[sq.group].some(j => g.houses[j] > 0));
}

function openTrade(to) {
  const g = game();
  if (!g || g.phase !== 'play') return;
  if (g.trade) { toast(t('err.tradeBusy'), 'error'); return; }
  const others = g.players.filter(p => p.id !== me() && !p.bankrupt);
  if (!others.length) return;
  app.trade = { to: to || others[0].id, give: { cash: 0, props: [], cards: 0 }, take: { cash: 0, props: [], cards: 0 } };
  closeModal('player');
  renderTradeComposer();
  openModal('trade');
}

function sideHtml(side, owner, key) {
  const g = game();
  const p = playerOf(owner);
  const props = g.owner.map((o, i) => (o === owner ? i : -1)).filter(i => i >= 0);
  return `<div class="trade-side" data-side="${key}">
    <h3>${esc(t(key === 'give' ? 'trade.youGive' : 'trade.theyGive', { name: nameOf(owner, false) }))}</h3>
    <div class="trade-props">${props.length ? props.map(i => {
      const ok = tradable(i);
      return `<label class="tprop${ok ? '' : ' locked'}" style="--g:${GROUP_COLOR[SQ[i].group]}" title="${ok ? '' : esc(t('err.sellBuildingsFirst'))}">
        <input type="checkbox" data-prop="${i}"${side.props.includes(i) ? ' checked' : ''}${ok ? '' : ' disabled'}>
        <span>${esc(sqName(i))}${g.mortgaged[i] ? ` <em>${esc(t('deed.mortgagedShort'))}</em>` : ''}</span></label>`;
    }).join('') : `<p class="muted small">${esc(t('trade.noProps'))}</p>`}</div>
    <label class="trade-cash">${esc(t('trade.cash'))} <input type="number" inputmode="numeric" min="0" max="${p.cash}" value="${side.cash || ''}" placeholder="0" data-cash><small>/ ${money(p.cash)}</small></label>
    ${p.jailCards ? `<label class="trade-cash">🎫 ${esc(t('trade.cards'))} <input type="number" min="0" max="${p.jailCards}" value="${side.cards || ''}" placeholder="0" data-cards></label>` : ''}
  </div>`;
}

function renderTradeComposer() {
  const g = game();
  const tr = app.trade;
  if (!g || !tr || g.phase !== 'play' || !playerOf(tr.to) || playerOf(tr.to).bankrupt) { closeModal('trade'); return; }
  const others = g.players.filter(p => p.id !== me() && !p.bankrupt);
  $('#trade-partners').innerHTML = others.map(p => `<button class="btn sm${p.id === tr.to ? ' primary' : ''}" data-partner="${p.id}">${esc(nameOf(p.id))}</button>`).join('');
  // keep only what's still valid
  const keep = (side, owner) => { side.props = side.props.filter(i => g.owner[i] === owner && tradable(i)); };
  keep(tr.give, me());
  keep(tr.take, tr.to);
  // don't redraw under someone typing an amount
  if (!$('#trade-body').contains(document.activeElement) || !$('#trade-body').children.length) {
    $('#trade-body').innerHTML = sideHtml(tr.give, me(), 'give') + '<div class="trade-swap" aria-hidden="true">⇄</div>' + sideHtml(tr.take, tr.to, 'take');
  }
}

function readTradeForm() {
  const tr = app.trade;
  if (!tr) return;
  for (const key of ['give', 'take']) {
    const box = $(`#trade-body [data-side="${key}"]`);
    if (!box) continue;
    tr[key].props = $$('[data-prop]', box).filter(x => x.checked).map(x => Number(x.dataset.prop));
    tr[key].cash = Math.max(0, Math.floor(Number($('[data-cash]', box)?.value) || 0));
    tr[key].cards = Math.max(0, Math.floor(Number($('[data-cards]', box)?.value) || 0));
  }
}

async function sendTrade() {
  readTradeForm();
  const tr = app.trade;
  if (!tr) return;
  if (await act('trade', { to: tr.to, give: tr.give, take: tr.take })) {
    closeModal('trade');
    toast(t('toast.offerSent', { name: nameOf(tr.to) }), 'good');
  }
}

function listSide(side) {
  const bits = [];
  if (side.cash) bits.push(`<li>💵 ${money(side.cash)}</li>`);
  for (const i of side.props) bits.push(`<li><i class="sw" style="--g:${GROUP_COLOR[SQ[i].group]}"></i>${esc(sqName(i))}${game().mortgaged[i] ? ` <em>${esc(t('deed.mortgagedShort'))}</em>` : ''}</li>`);
  if (side.cards) bits.push(`<li>🎫 ${esc(t('trade.cardsN', { n: side.cards }))}</li>`);
  return bits.length ? `<ul class="offer-list">${bits.join('')}</ul>` : `<p class="muted">${esc(t('trade.nothing'))}</p>`;
}

function renderOffer(g) {
  const tr = g.trade;
  if (!tr || tr.to !== me()) {
    if (isOpen('offer')) closeModal('offer');
    return;
  }
  $('#offer-body').innerHTML = `<h2>${esc(t('offer.title', { name: nameOf(tr.from) }))}</h2>
    <div class="offer-cols"><div><h3>${esc(t('offer.youGet'))}</h3>${listSide(tr.give)}</div><div><h3>${esc(t('offer.youGive'))}</h3>${listSide(tr.take)}</div></div>`;
  $('#offer-actions').innerHTML = `<button class="btn primary" data-act="accept">${esc(t('offer.accept'))}</button><button class="btn" data-act="reject">${esc(t('offer.decline'))}</button>`;
  if (app.offerSeen !== tr.id) {
    app.offerSeen = tr.id;
    openModal('offer');
  }
}

// ================================================================
// results
// ================================================================

function maybeShowResults(g, boot) {
  if (g.phase === 'play') return;
  const key = `${g.id}`;
  if (app.resultsKey === key) { if (isOpen('results')) renderResultsActions(); return; }
  app.resultsKey = key;
  setTimeout(() => showResults(!boot), boot ? 0 : 1600);
}

function showResults(celebrate) {
  const g = game();
  if (!g?.standings) return;
  const win = g.winner === me();
  $('#results-body').innerHTML = `
    <h2 class="results-title">${esc(win ? t('results.youWin') : t('results.wins', { name: nameOf(g.winner) }))}</h2>
    <p class="results-sub">${esc(t(g.endReason === 'time' ? 'results.byTime' : 'results.byBankrupt'))}</p>
    <table class="results-table">${g.standings.map(s => `
      <tr class="${s.id === g.winner ? 'winner' : ''}">
        <td class="num">${s.place}</td>
        <td><span class="who">${avatarHtml(member(s.id))}${esc(nameOf(s.id))}</span></td>
        <td class="num">${s.bankrupt ? `<span class="tag off">${esc(t('tag.bankrupt'))}</span>` : money(s.worth)}</td>
      </tr>`).join('')}</table>`;
  renderResultsActions();
  openModal('results');
  if (celebrate && win) vibrate([80, 60, 80]);
}

function renderResultsActions() {
  $('#results-actions').innerHTML = isHost()
    ? `<button class="btn primary" data-host="start">${esc(t('results.again'))}</button><button class="btn" data-host="lobby">${esc(t('results.lobby'))}</button>`
    : `<p class="muted">${esc(t('results.waitHost', { name: member(app.state.hostId)?.name || t('theHost') }))}</p><button class="btn ghost" data-close>${esc(t('modal.close'))}</button>`;
}

// ================================================================
// log, chat, reactions
// ================================================================

function describe(ev) {
  const p = {
    name: esc(nameOf(ev.player)),
    target: ev.target ? esc(nameOf(ev.target)) : '',
    owner: ev.owner ? esc(nameOf(ev.owner)) : '',
    square: ev.square != null ? esc(sqName(ev.square)) : '',
    to: typeof ev.to === 'number' ? esc(sqName(ev.to)) : ev.to === 'pot' ? esc(t('thePot')) : ev.to ? esc(nameOf(ev.to)) : esc(t('theBank')),
    amount: (ev.amount ?? ev.price) != null ? money(ev.amount ?? ev.price) : '',
    dice: ev.dice ? ev.dice.join(' + ') : '',
    total: ev.dice ? ev.dice[0] + ev.dice[1] : 0,
    card: ev.card != null ? esc(t(`${ev.deck}.${ev.card}`)) : '',
    deck: ev.deck ? esc(t(ev.deck === 'chance' ? 'deck.chance' : 'deck.chest')) : '',
    houses: ev.houses,
    reason: ev.reason,
    how: ev.how,
    tries: ev.tries,
    heir: Boolean(ev.to),
    me: ev.player === me(),
  };
  const key = `ev.${ev.type}`;
  return has(key) ? t(key, p) : null;
}

// What's worth telling in the board center (the log has everything).
const STORY = new Set(['start', 'roll', 'move', 'buy', 'decline', 'rent', 'tax', 'card', 'jail', 'jailFree', 'jailStay', 'speeding',
  'auction', 'auctionWon', 'auctionNone', 'build', 'sell', 'mortgage', 'unmortgage', 'paid', 'bankrupt', 'tradeOffer', 'tradeDone',
  'collect', 'timeout', 'gameOver']);
const STORY_ICON = {
  roll: '🎲', move: '👣', buy: '🏠', decline: '🙅', rent: '💸', tax: '💸', card: '🃏', jail: '🚓', jailFree: '🔓', jailStay: '🔒',
  speeding: '🚨', auction: '🔨', auctionWon: '🔨', auctionNone: '🔨', build: '🏗️', sell: '🏚️', mortgage: '🏦', unmortgage: '🏦',
  paid: '💸', bankrupt: '💀', tradeOffer: '🤝', tradeDone: '🤝', collect: '💰', timeout: '⏱', start: '🏁', gameOver: '🏆',
};

function tellStory(ev, text) {
  if (!STORY.has(ev.type) || ev.forRent) return;
  app.story.push({ seq: ev.seq, html: `<span class="si">${STORY_ICON[ev.type] || '•'}</span><span>${text}</span>`, player: ev.player });
  if (app.story.length > 4) app.story.shift();
}

function renderStory() {
  const newest = app.story.at(-1)?.seq;
  $('#story').innerHTML = app.story.map(s => `<li class="${s.seq === newest ? 'new' : ''}" style="--pc:${s.player ? colorOf(s.player) : '#888'}">${s.html}</li>`).join('');
}

function logEvent(ev, keep = true) {
  if (keep) {
    app.logEvents.push(ev);
    if (app.logEvents.length > 300) app.logEvents.shift();
  }
  const text = describe(ev);
  if (!text) return;
  tellStory(ev, text);
  const div = document.createElement('div');
  div.className = 'log-line';
  const color = ev.player ? colorOf(ev.player) : '#888';
  div.innerHTML = `<span class="dot" style="background:${color}"></span>${text}`;
  const list = $('#log-list');
  list.appendChild(div);
  while (list.children.length > 300) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
}

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
    bubble(tokenAnchor(m.from) || $(`#lobby-players li[data-id="${m.from}"]`), short);
  }
}

function showReaction(from, emoji) {
  bubble(tokenAnchor(from) || $(`#lobby-players li[data-id="${from}"]`), emoji, 'emoji');
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
// modals
// ================================================================

function openModal(name) { $(`#modal-${name}`).classList.remove('hidden'); }
function closeModal(name) {
  const el = $(`#modal-${name}`);
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  if (name === 'deed') app.deed = null;
  if (name === 'player') app.sheet = null;
  if (name === 'trade') app.trade = null;
}
function closeAllModals() { for (const m of $$('.modal')) closeModal(m.id.replace('modal-', '')); }
const isOpen = name => !$(`#modal-${name}`).classList.contains('hidden');

// ================================================================
// language switching
// ================================================================

function relabel() {
  labelSettingsForm();
  updateMuteButtons();
  renderRoomList();
  renderAddresses($('#home-addresses'));
  const chat = $('#chat-list');
  chat.innerHTML = '';
  for (const m of app.chatMsgs) chat.appendChild(chatEl(m));
  $('#log-list').innerHTML = '';
  app.story = [];
  for (const ev of app.logEvents) logEvent(ev, false);
  app.lobbySig = '';
  buildBoard();
  boardSig = '';
  if (app.state) {
    const was = app.booting;
    app.booting = true;
    render(app.state);
    app.booting = was;
    if (isOpen('results')) showResults(false);
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
  for (const b of $$('.mute-btn')) {
    b.textContent = b.classList.contains('icon') ? (isMuted() ? '🔇' : '🔊') : t('menu.sound', { on: !isMuted() });
  }
}

async function leaveRoom() {
  await act('leave');
  leaveToHome(t('toast.left'));
}

// the buttons in the board center and the pop-ups
async function onAct(btn) {
  const g = game();
  const a = btn.dataset.act;
  switch (a) {
    case 'roll': if (!app.rolling) act('roll'); break;
    case 'buy': act('buy'); break;
    case 'decline': act('decline'); break;
    case 'endTurn': act('endTurn'); break;
    case 'payJail': act('payJail'); break;
    case 'jailCard': act('jailCard'); break;
    case 'payDebt': act('payDebt'); break;
    case 'bankrupt':
      if (confirmTap(btn, t('confirm.bankrupt'))) act('bankrupt');
      break;
    case 'openAuction': openModal('auction'); break;
    case 'passAuction': act('passAuction'); break;
    case 'deed': if (g?.offer != null) openDeed(g.offer); break;
    case 'results': showResults(false); break;
    case 'tradeCancel': act('tradeCancel'); break;
    case 'openOffer': openModal('offer'); break;
    case 'accept': if (await act('tradeAnswer', { accept: true })) closeModal('offer'); break;
    case 'reject': if (await act('tradeAnswer', { accept: false })) closeModal('offer'); break;
    default: break;
  }
}

function wire() {
  applyStatic();
  buildSettingsForm();
  buildBoard();
  $('#reactions').innerHTML = REACTIONS.map(e => `<button type="button" data-react="${e}">${e}</button>`).join('');
  updateMuteButtons();
  onLangChange(relabel);
  app.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nameInput = $('#name-input');
  nameInput.value = storedName();
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

  document.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-act]');
    if (actBtn && !actBtn.disabled) { onAct(actBtn); return; }
    const tile = e.target.closest('#board .tile');
    if (tile) { openDeed(Number(tile.dataset.sq)); return; }
    const deed = e.target.closest('[data-deed]');
    if (deed) { closeModal('player'); openDeed(Number(deed.dataset.deed)); return; }
    const pl = e.target.closest('#players [data-pid]');
    if (pl) { openSheet(pl.dataset.pid); return; }
    const manage = e.target.closest('[data-manage]');
    if (manage && !manage.disabled) { act(manage.dataset.manage, { square: Number(manage.dataset.sq) }); return; }
    const bid = e.target.closest('[data-bid]');
    if (bid) { act('bid', { amount: Number(bid.dataset.bid) }); return; }
    const partner = e.target.closest('[data-partner]');
    if (partner && app.trade) {
      readTradeForm();
      app.trade = { to: partner.dataset.partner, give: app.trade.give, take: { cash: 0, props: [], cards: 0 } };
      $('#trade-body').innerHTML = '';
      renderTradeComposer();
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'bid-form') return;
    e.preventDefault();
    const v = Math.floor(Number($('#bid-input').value));
    if (v > 0) act('bid', { amount: v });
  });
  $('#trade-body').addEventListener('change', readTradeForm);
  $('#btn-trade-send').addEventListener('click', sendTrade);
  $('#btn-trade-with').addEventListener('click', () => openTrade(app.sheet));
  $('#results-actions').addEventListener('click', e => {
    const b = e.target.closest('[data-host]');
    if (b) act(b.dataset.host);
  });

  document.addEventListener('click', e => {
    const closer = e.target.closest('[data-close]');
    const modal = e.target.classList?.contains('modal') ? e.target : closer?.closest('.modal');
    if (modal && (closer || e.target === modal)) closeModal(modal.id.replace('modal-', ''));
  });
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]');
    if (c) copyText(c.dataset.copy);
  });
  $('#card-pop').addEventListener('click', () => $('#card-pop').classList.add('hidden'));

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'leave':
        if (game()?.phase === 'play' && !confirmTap(btn, t('confirm.leave'))) return;
        closeAllModals();
        leaveRoom();
        break;
      case 'lang':
        setLang(getLang() === 'fr' ? 'en' : 'fr');
        toast(t('toast.lang'), 'good', 1500);
        break;
      case 'rules': closeModal('menu'); closeModal('intro'); openModal('rules'); break;
      case 'mute': setMuted(!isMuted()); updateMuteButtons(); if (!isMuted()) sfx.turn(); break;
      case 'chat': toggleDrawer(); break;
      case 'voice': if (voice.on) voice.leave(); else voice.join(); break;
      case 'mic': voice.toggleMute(); break;
      case 'trade': openTrade(); break;
      case 'intro': if (game()) showIntro(); else openModal('rules'); break;
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

  // keyboard: R/space roll, B buy, A auction, E end turn, T chat
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      const open = $$('.modal').filter(m => !m.classList.contains('hidden')).pop();
      if (open) closeModal(open.id.replace('modal-', ''));
      else if (app.drawerOpen) toggleDrawer(false);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'v' && voice.on) { voice.toggleMute(); return; }
    const g = game();
    if (!g || $$('.modal').some(m => !m.classList.contains('hidden'))) return;
    if ((k === 'r' || k === ' ') && g.canRoll) { e.preventDefault(); if (!app.rolling) act('roll'); } else if (k === 'b' && g.canBuy) act('buy');
    else if (k === 'a' && g.canDecline) act('decline');
    else if (k === 'e' && g.canEnd) act('endTurn');
    else if (k === 't') toggleDrawer();
  });

  window.addEventListener('resize', layoutBoard);
  document.addEventListener('visibilitychange', () => {
    keepAwake(document.body.dataset.screen === 'game');
    if (!document.hidden) document.title = t('title.page');
  });
  window.addEventListener('pageshow', () => {
    if (app.session && !usePolling && (!app.es || app.es.readyState === EventSource.CLOSED)) connect();
  });
}

function boot() {
  wire();
  loadInfo();
  document.title = t('title.page');
  const params = new URLSearchParams(location.search);
  const roomParam = (params.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const tabSession = loadTabSession();
  showScreen('home');
  if (tabSession && (!roomParam || roomParam === tabSession.code)) {
    app.session = tabSession;
    recheck();
    return;
  }
  if (roomParam) {
    $('#code-input').value = roomParam;
    const name = $('#name-input');
    if (name.value) toast(t('toast.pressJoin', { code: roomParam }), 'info', 3000);
    else { name.focus(); toast(t('toast.enterNameJoin', { code: roomParam }), 'info', 3500); }
  }
}

boot();
