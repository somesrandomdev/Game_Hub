import { t, has, getLang, setLang, applyStatic, onLangChange } from './i18n.js';
import { sfx, isMuted, setMuted } from './sound.js';
import { toast, bubble, vibrate } from '/shared/fx.js';
import * as vfx from '/shared/vfx.js';
import { qrSvg } from '/shared/qr.js';
import { createVoice } from '/shared/voice.js';

// ================================================================
// helpers
// ================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`ludo.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(`ludo.${key}`);
      else localStorage.setItem(`ludo.${key}`, JSON.stringify(value));
    } catch { /* storage blocked */ }
  },
};

// ---------------- board geometry (15 × 15 cells) ----------------
// Unrotated: red's yard top left, green top right, yellow bottom right, blue bottom
// left; pieces go clockwise. Every board is then turned so that YOUR yard sits
// bottom left, like in Ludo King.

const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_HEX = { red: '#e5322d', green: '#2f9e4f', yellow: '#f5b800', blue: '#1f6fd1' };
const PATH = [];
const seg = (x, y, dx, dy, n) => { for (let i = 0; i < n; i++) PATH.push([x + dx * i, y + dy * i]); };
seg(1, 6, 1, 0, 5); seg(6, 5, 0, -1, 6); seg(7, 0, 1, 0, 2); seg(8, 1, 0, 1, 5);
seg(9, 6, 1, 0, 6); seg(14, 7, 0, 1, 2); seg(13, 8, -1, 0, 5); seg(8, 9, 0, 1, 6);
seg(7, 14, -1, 0, 2); seg(6, 13, 0, -1, 5); seg(5, 8, -1, 0, 6); seg(0, 7, 0, -1, 2);
const HOME_COL = [
  [1, 2, 3, 4, 5].map(i => [i, 7]),
  [1, 2, 3, 4, 5].map(i => [7, i]),
  [13, 12, 11, 10, 9].map(i => [i, 7]),
  [13, 12, 11, 10, 9].map(i => [7, i]),
];
const YARD = [[3, 3], [12, 3], [12, 12], [3, 12]];          // centers
const SLOTS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const HOME_SPOT = [[6.55, 7.5], [7.5, 6.55], [8.45, 7.5], [7.5, 8.45]];
const STARTS = new Set([0, 13, 26, 39]);
const STARS = new Set([8, 21, 34, 47]);
const HOME = 56;
// a piece caught up in someone else's lane (seat s, square c) is RAID + s * 10 + c
const RAID = 100;
const isRaid = p => p >= RAID;

const REACTIONS = ['😂', '😡', '😎', '🔥', '👏', '😭', '🤡', '💀', '🙏', '👀'];
const MAX_PLAYERS = 16;
const NEXT_ROUND_MS = 12000;
const SETTINGS_UI = [
  { key: 'target', hint: true, type: 'select', options: [3, 5, 10, 15, 20, 30].map(n => [n, () => t('opt.points', { n })]) },
  { key: 'pieces', hint: true, type: 'select', options: [2, 3, 4].map(n => [n, () => t('opt.pieces', { n })]) },
  { key: 'quick', hint: true, type: 'bool' },
  { key: 'turnTimer', hint: true, type: 'select', options: [[0, () => t('opt.off')], ...[15, 30, 60].map(n => [n, () => t('opt.seconds', { n })])] },
  { key: 'autoNext', hint: true, type: 'bool' },
];

const app = {
  session: null,
  state: null,
  es: null,
  info: null,
  booting: true,
  lastSeq: 0,
  gameId: null,
  round: 0,
  watch: null,         // the table on screen
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
  shown: {},           // "player:piece" -> progress drawn on screen (pieces walk there)
  walking: Promise.resolve(),
  walkGen: 0,          // bumped to drop queued walks (new round, other table)
  queued: 0,           // walks waiting: when they pile up, pieces jump instead of walking
  rolling: false,
  scores: new Map(),   // last drawn standings: id -> score, for the +points pop
  story: [],
  timerRaf: 0,
  lastTickSec: -1,
  boardSig: '',
  boardSize: 0,
  standingsHtml: '',
};

const me = () => app.state?.me;
const member = id => app.state?.members.find(m => m.id === id);
const isHost = () => Boolean(app.state && app.state.hostId === app.state.me);
const nameOf = (id, you = true) => (id === me() && you ? t('you') : member(id)?.name ?? t('someone'));
const game = () => app.state?.game;
const now = () => Date.now() + app.skew;
const watched = () => game()?.tables.find(x => x.id === app.watch) || null;
const seatOf = (tb, id) => tb?.players.find(p => p.id === id);

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
// network (same as the other games)
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
  return [$(`#standings [data-pid="${id}"]`), $(`#lobby-players li[data-id="${id}"]`)].filter(Boolean);
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
  try { sessionStorage.setItem('ludo.session', JSON.stringify(s)); } catch { /* ignore */ }
  store.set('last', { ...s, name: $('#name-input').value.trim() });
}
function loadTabSession() {
  try { const v = sessionStorage.getItem('ludo.session'); return v ? JSON.parse(v) : null; } catch { return null; }
}
function clearSession() {
  app.session = null;
  try { sessionStorage.removeItem('ludo.session'); } catch { /* ignore */ }
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
      await sleep(1500);
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
      app.state = msg.state;
      app.skew = msg.state.serverTime - Date.now();
      render();
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

function render() {
  const s = app.state;
  if (!s) return;
  voice.sync(s.members, s.me);
  renderVoice();
  if (!s.game) {
    if (app.resultsKey) { closeModal('results'); app.resultsKey = null; }
    stopTimer();
    showScreen('lobby');
    renderLobby(s);
    app.gameId = null;
    return;
  }
  showScreen('game');
  renderGame(s);
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
  const suffix = code ? `/ludo/?room=${code}` : '/ludo/';
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
      const res = await fetch('/api/rooms?game=ludo');
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
  for (const key of ['mono.name', 'uno.name']) {
    try { const v = JSON.parse(localStorage.getItem(key) || '""'); if (v) return v; } catch { /* ignore */ }
  }
  return '';
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
    enterRoom(await api('create', { name, game: 'ludo' }));
  } catch (err) { toast(errorMessage(err), 'error'); }
}

async function joinRoom(code) {
  const name = myName();
  if (!name) return;
  code = String(code || '').trim().toUpperCase();
  if (code.length !== 4) { toast(t('toast.codeLength'), 'error'); $('#code-input').focus(); return; }
  const last = store.get('last', null);
  try {
    enterRoom(await api('join', { code, name, game: 'ludo', token: last?.code === code ? last.token : undefined }));
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

// same split as the server: as even as possible, never more than 4
function tableSizes(n) {
  if (n < 2) return [];
  const k = Math.ceil(n / 4);
  const base = Math.floor(n / k);
  return Array.from({ length: k }, (_, i) => base + (i < n % k ? 1 : 0));
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
  const sizes = tableSizes(s.members.length);
  $('#lobby-tables').innerHTML = sizes.length
    ? `🎲 ${esc(t(sizes.length === 1 ? 'lobby.oneTable' : 'lobby.tables', { n: sizes.length, sizes: sizes.join(' + ') }))}`
    : '';
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

// quarter turns (clockwise) that put my seat bottom left
function turnsFor(tb) {
  const mine = seatOf(tb, me());
  return mine ? (3 - mine.seat + 4) % 4 : 0;
}
function rot([x, y], k) {
  for (let i = 0; i < k; i++) [x, y] = [15 - y, x];
  return [x, y];
}
const cellCenter = ([x, y]) => [x + 0.5, y + 0.5];

// where a piece is drawn (unrotated board coordinates, cell units, center)
function spot(seat, progress, k) {
  if (progress < 0) { const [cx, cy] = YARD[seat]; const [dx, dy] = SLOTS[k]; return [cx + dx, cy + dy]; }
  if (isRaid(progress)) return cellCenter(HOME_COL[Math.floor((progress - RAID) / 10)][(progress - RAID) % 10 - 1]);
  if (progress <= 50) return cellCenter(PATH[(seat * 13 + progress) % 52]);
  if (progress < HOME) return cellCenter(HOME_COL[seat][progress - 51]);
  return HOME_SPOT[seat];
}

function buildBoard(tb) {
  const k = turnsFor(tb);
  const seats = new Map(tb.players.map(p => [p.seat, p]));
  const sig = JSON.stringify([tb.id, k, tb.players.map(p => [p.id, p.seat]), getLang(), app.round]);
  if (sig === app.boardSig) return;
  app.boardSig = sig;
  const parts = [];
  const at = (center, w = 1, h = 1) => {
    const [cx, cy] = rot(center, k);
    return `left:calc(var(--u) * ${cx - w / 2});top:calc(var(--u) * ${cy - h / 2});`;
  };
  // yards
  for (let s = 0; s < 4; s++) {
    const p = seats.get(s);
    const color = COLORS[s];
    const label = p ? `<span class="yard-name">${esc(p.id === me() ? t('you') : nameOf(p.id))}${p.id === me() ? '' : ''}</span>` : '';
    parts.push(`<div class="yard ${color}${p ? '' : ' empty'}${p?.id === me() ? ' mine' : ''}" data-seat="${s}" style="${at(YARD[s], 6, 6)}"><div class="yard-in"></div>${label}</div>`);
    for (const slot of SLOTS) parts.push(`<i class="slot ${color}" style="${at([YARD[s][0] + slot[0], YARD[s][1] + slot[1]], 1.1, 1.1)}"></i>`);
  }
  // the track
  PATH.forEach((cell, i) => {
    const start = STARTS.has(i) ? COLORS[i / 13] : '';
    const star = STARS.has(i) || STARTS.has(i);
    parts.push(`<div class="cell${start ? ` start ${start}` : ''}" style="${at(cellCenter(cell))}">${star ? '<span class="star">★</span>' : ''}</div>`);
  });
  HOME_COL.forEach((cells, s) => cells.forEach(cell => parts.push(`<div class="cell lane ${COLORS[s]}" style="${at(cellCenter(cell))}"></div>`)));
  // home: four triangles in the middle
  parts.push(`<svg class="home-tri" viewBox="0 0 3 3" style="${at([7.5, 7.5], 3, 3)}rotate:${k * 90}deg">
    <polygon points="0,0 1.5,1.5 0,3" fill="${COLOR_HEX.red}"/><polygon points="0,0 3,0 1.5,1.5" fill="${COLOR_HEX.green}"/>
    <polygon points="3,0 3,3 1.5,1.5" fill="${COLOR_HEX.yellow}"/><polygon points="0,3 1.5,1.5 3,3" fill="${COLOR_HEX.blue}"/></svg>`);
  $('#board').innerHTML = `${parts.join('')}<div id="pieces" class="pieces"></div>`;
  $('#board').dataset.turns = k;
}

function layoutBoard() {
  const area = $('#board-area');
  if (!area || area.offsetParent === null) return;
  const wide = matchMedia('(min-width: 860px), (orientation: landscape) and (min-width: 600px)').matches;
  const bar = $('#watch-bar').offsetHeight || 0;
  const dock = $('#control').offsetHeight + 8;
  const w = area.clientWidth;
  const h = wide ? area.clientHeight - bar - dock : window.innerHeight * 0.6;
  const size = Math.max(260, Math.floor(Math.min(w, h)) - 10);
  // re-placing pieces cuts their walk short: only when the size really changed
  if (size === app.boardSize && $('#pieces')?.childElementCount) return;
  app.boardSize = size;
  $('#board').style.setProperty('--u', `${size / 15}px`);
  area.style.setProperty('--board', `${size}px`);
  placePieces(false);
}

// ---------------- pieces ----------------

function pieceEl(id, k, color) {
  let el = $(`#pieces [data-piece="${id}:${k}"]`);
  if (!el) {
    el = document.createElement('button');
    el.type = 'button';
    el.className = `piece ${color}`;
    el.dataset.piece = `${id}:${k}`;
    el.dataset.k = k;
    el.innerHTML = '<i></i>';
    $('#pieces').appendChild(el);
  }
  return el;
}

function placePieces(animate = true) {
  const g = game();
  const tb = watched();
  if (!g || !tb || !$('#pieces')) return;
  const k = turnsFor(tb);
  const myMoves = tb.id === g.myTable ? g.canMove : [];
  const myRaids = tb.id === g.myTable ? g.canRaid || [] : [];
  const live = new Set();
  const spots = new Map();
  for (const p of tb.players) {
    p.pieces.forEach((real, i) => {
      const key = `${p.id}:${i}`;
      const prog = app.shown[key] ?? real;
      const [x, y] = rot(spot(p.seat, prog, i), k);
      const where = `${x.toFixed(2)},${y.toFixed(2)}`;
      if (!spots.has(where)) spots.set(where, []);
      spots.get(where).push({ p, i, x, y, key });
    });
  }
  for (const list of spots.values()) {
    list.forEach(({ p, i, x, y, key }, n) => {
      live.add(key);
      const el = pieceEl(p.id, i, p.color);
      // several pieces on one square fan out a little
      const off = list.length > 1 ? [(n % 2 ? 0.17 : -0.17), (n > 1 ? 0.17 : -0.17)] : [0, 0];
      el.classList.toggle('no-anim', !animate);
      el.classList.toggle('stacked', list.length > 1);
      el.style.transform = `translate(calc(var(--u) * ${x + off[0]}), calc(var(--u) * ${y + off[1]})) translate(-50%, -78%)`;
      // an opponent I can catch in its lane: tap it to raid
      const raid = app.rolling ? null : myRaids.find(r => r.victim === p.id && r.victimPiece === i);
      const can = p.id === me() && (myMoves.includes(i) || myRaids.some(r => r.piece === i)) && !app.rolling;
      el.classList.toggle('movable', can || Boolean(raid));
      el.classList.toggle('target', Boolean(raid));
      if (raid) el.dataset.raid = raid.piece; else delete el.dataset.raid;
      el.disabled = !can && !raid;
      el.classList.toggle('mine', p.id === me());
      el.title = p.id === me() ? t('you') : nameOf(p.id);
    });
  }
  for (const el of $$('#pieces .piece')) if (!live.has(el.dataset.piece)) el.remove();
  // whose turn: their yard glows
  for (const y of $$('#board .yard')) y.classList.toggle('turn', Number(y.dataset.seat) === seatOf(tb, tb.current)?.seat);
}

// ---------------- effects ----------------

const fxOn = () => !vfx.motion.reduced && !document.hidden;
const hexOf = id => COLOR_HEX[seatOf(watched(), id)?.color] || '#ffffff';
const pieceAt = key => $(`#pieces [data-piece="${key}"]`);
const boardEl = () => $('#board');

// screen position of a point on the drawn board (cell units, already rotated)
function boardPoint([x, y]) {
  const b = boardEl();
  const r = b.getBoundingClientRect();
  const u = b.clientWidth / 15;
  return { x: r.left + b.clientLeft + x * u, y: r.top + b.clientTop + y * u, u };
}
// screen position of a seat's square for a given progress
function spotPoint(id, i, progress) {
  const tb = watched();
  const p = seatOf(tb, id);
  return p ? boardPoint(rot(spot(p.seat, progress, i), turnsFor(tb))) : null;
}

// replay a one-shot CSS animation class on an element; it's removed once done so it
// doesn't hold back the element's other animations (the movable pulse, the ready die)
function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const done = e => {
    if (e.target !== el) return;
    el.classList.remove(cls);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

// Getting a piece home: one soft ring in the player's color, nothing more.
function fxHome(ev) {
  const pt = spotPoint(ev.player, ev.piece, HOME);
  if (!pt || !fxOn()) return;
  vfx.shockwave(pt.x, pt.y, hexOf(ev.player), { from: pt.u * 0.5, to: pt.u * 2.5, width: 3, life: 0.6, alpha: 0.7 });
}

// ---------------- what happens at the table on screen, one thing after the other ----------------
// Rolls, walks, captures and celebrations are queued so they play in order, even when
// several events arrive at once. A new round or another table drops whatever is queued.

function resetQueue() {
  app.walkGen++;
  app.queued = 0;
  app.walking = Promise.resolve();
  app.rolling = false;
}

function queue(fn) {
  const gen = app.walkGen;
  app.queued++;
  app.walking = app.walking.then(async () => {
    app.queued--;
    if (gen !== app.walkGen) return;
    try { await fn(gen); } catch (err) { console.warn(err); }
  });
}

// too much waiting (a slow tab, a burst of bot moves): skip the step-by-step walk
const rushed = () => vfx.motion.reduced || document.hidden || app.queued > 3;

function play(events, tb) {
  for (const ev of events) {
    // other tables now; tournament-wide events (game over) after this table's moves
    if (ev.table != null && ev.table !== tb.id) { animateEvent(ev, tb); continue; }
    if (ev.type === 'move') queue(gen => walkMove(ev, gen));
    else if (ev.type === 'capture') queue(() => showCapture(ev));
    else if (ev.type === 'roll') {
      app.rolling = true; // no movable pieces until the die shows the value
      queue(() => rollDie(ev.value));
    }
    else queue(() => animateEvent(ev, tb));
  }
  queue(() => {
    const cur = watched();
    if (!cur) return;
    for (const p of cur.players) p.pieces.forEach((real, i) => { app.shown[`${p.id}:${i}`] = real; });
    placePieces(true);
    renderControl();
  });
}

async function walkMove(ev, gen) {
  const key = `${ev.player}:${ev.piece}`;
  const el = pieceAt(key);
  if (ev.from === -1) {
    // out of the yard: a jump onto the start square
    app.shown[key] = ev.to;
    if (!rushed()) el?.classList.add('leap');
    placePieces(true);
    sfx.out();
    if (rushed()) { await sleep(150); return; }
    await sleep(400);
    el?.classList.remove('leap');
    return;
  }
  if (rushed()) {
    app.shown[key] = ev.to;
    placePieces(true);
    sfx.step(true);
    await sleep(160);
  } else {
    const steps = ev.path || Array.from({ length: ev.to - ev.from }, (_, i) => ev.from + 1 + i);
    for (const p of steps) {
      if (gen !== app.walkGen) return;
      app.shown[key] = p;
      placePieces(true);
      replay(el, 'hop');
      sfx.step(p === ev.to);
      await sleep(p === ev.to ? 180 : 115);
    }
  }
  if (ev.to === HOME) sfx.home();
}

async function showCapture(ev) {
  const key = `${ev.victim}:${ev.piece}`;
  const el = pieceAt(key);
  bubble(el, t('bubble.captured'), 'bad');
  sfx.capture();
  vibrate(ev.victim === me() ? [80, 50, 80] : 30);
  await sleep(160);
  // slides back to its yard
  app.shown[key] = -1;
  if (!rushed()) el?.classList.add('knocked');
  placePieces(true);
  await sleep(rushed() ? 200 : 650);
  el?.classList.remove('knocked');
}

// ---------------- the die ----------------

const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const dieFace = n => (PIPS[n]
  ? Array.from({ length: 9 }, (_, k) => `<i${PIPS[n].includes(k + 1) ? ' class="on"' : ''}></i>`).join('')
  : `<span class="die-label">${esc(t('die.roll'))}</span>`);

// Tumbles for about half a second, lands with a thud. Resolves once the value shows.
function rollDie(value) {
  const die = $('#die');
  app.rolling = true;
  placePieces(true);
  renderControl();
  sfx.dice();
  const fast = rushed();
  die.classList.add('rolling');
  return new Promise(resolve => {
    let n = 0;
    const spin = setInterval(() => {
      die.innerHTML = dieFace(1 + Math.floor(Math.random() * 6));
      if (++n < (fast ? 2 : 7)) return;
      clearInterval(spin);
      die.classList.remove('rolling');
      die.innerHTML = dieFace(value);
      replay(die, 'landed');
      app.rolling = false;
      if (value === 6) bubble(die, t('bubble.six'), 'good');
      placePieces(true);
      renderControl();
      resolve();
    }, 65);
  });
}

// ================================================================
// game rendering
// ================================================================

function renderGame(s) {
  const g = s.game;
  const fresh = g.id !== app.gameId;
  const newRound = g.round !== app.round;
  if (fresh) {
    app.gameId = g.id;
    app.lastSeq = 0;
    app.logEvents = [];
    app.story = [];
    $('#log-list').innerHTML = '';
    closeModal('results');
    app.resultsKey = null;
  }
  if (fresh || newRound) {
    app.round = g.round;
    app.shown = {};
    resetQueue();
    app.watch = g.myTable ?? g.tables[0]?.id ?? null;
    app.boardSig = '';
    app.story = [];
    if (!fresh) {
      closeModal('results');
      app.resultsKey = null;
      const tb = g.tables.find(x => x.id === g.myTable);
      if (tb) {
        const others = tb.players.filter(p => p.id !== me()).map(p => nameOf(p.id)).join(', ');
        toast(t('toast.newTable', { round: g.round, names: others }), 'good', 4500);
        sfx.turn();
      }
    }
  }
  if (!g.tables.some(x => x.id === app.watch)) app.watch = g.myTable ?? g.tables[0]?.id ?? null;
  $('#g-code').textContent = s.code;
  $('#g-round').textContent = t('top.round', { n: g.round, target: g.settings.target });

  const boot = app.booting || fresh;
  const news = g.events.filter(e => e.seq > app.lastSeq);
  app.lastSeq = Math.max(app.lastSeq, ...g.events.map(e => e.seq), 0);
  for (const ev of news) logEvent(ev);

  const tb = watched();
  if (tb) {
    buildBoard(tb);
    requestAnimationFrame(layoutBoard);
    if (boot || newRound) {
      for (const p of tb.players) p.pieces.forEach((real, i) => { app.shown[`${p.id}:${i}`] = real; });
      $('#die').innerHTML = dieFace(tb.die || 0);
      placePieces(false);
      if ((fresh || newRound) && !app.booting) dealIn(g);
    } else {
      play(news, tb);
    }
  } else {
    for (const ev of news) animateEvent(ev, null);
  }
  renderWatchBar(g);
  renderControl();
  renderStandings(g);
  renderTables(g);
  renderStory();
  startTimer();
  maybeShowResults(g, boot);
  if (fresh && g.myTable !== null && !store.get('introSeen', false)) {
    store.set('introSeen', true);
    showIntro();
  }
}

function renderWatchBar(g) {
  const bar = $('#watch-bar');
  const away = g.myTable !== null && app.watch !== g.myTable;
  const spectator = g.myTable === null;
  bar.classList.toggle('hidden', !away && !spectator);
  bar.innerHTML = spectator
    ? esc(t('watch.spectator', { n: app.watch + 1 }))
    : `${esc(t('watch.other', { n: app.watch + 1 }))} <button class="btn sm primary" data-watch="${g.myTable}">${esc(t('watch.back'))}</button>`;
}

// ---------------- the control card: whose turn, the die, what to do ----------------

function colorName(tb, id) {
  const p = seatOf(tb, id);
  return p ? t(`color.${p.color}`) : '';
}

function renderControl() {
  const g = game();
  const tb = watched();
  if (!g || !tb) return;
  const mineTable = tb.id === g.myTable;
  const cur = tb.current;
  const myTurn = mineTable && cur === me();
  const turnLine = $('#turn-line');
  if (g.phase !== 'play') turnLine.innerHTML = esc(t(g.phase === 'gameOver' ? 'turn.over' : 'turn.roundOver'));
  else if (tb.done) turnLine.innerHTML = esc(t('turn.tableDone'));
  else {
    const p = seatOf(tb, cur);
    turnLine.innerHTML = `<span class="dot ${p?.color}"></span>${esc(myTurn ? t('turn.yours') : t('turn.theirs', { name: nameOf(cur) }))}`;
  }
  const die = $('#die');
  const canRoll = myTurn && g.canRoll && !app.rolling;
  die.disabled = !canRoll;
  die.classList.toggle('ready', canRoll);
  die.className = die.className.replace(/\b(red|green|yellow|blue)\b/g, '').trim();
  const cp = seatOf(tb, cur);
  if (cp) die.classList.add(cp.color);
  if (!app.rolling && !die.classList.contains('rolling') && !die.innerHTML) die.innerHTML = dieFace(tb.die || 0);

  // what's going on, and what to do about it
  let status = '';
  let explain = '';
  const meP = seatOf(tb, me());
  if (g.phase === 'roundOver') { status = t('status.roundOver'); explain = t('explain.nextRound'); }
  else if (g.phase === 'gameOver') { status = t('status.champion', { name: nameOf(g.winner) }); }
  else if (tb.done) {
    const place = tb.places?.find(x => x.id === me());
    status = place ? t('status.youPlaced', { place: t(`place.${place.place}`), points: place.points }) : t('status.tableDone');
    explain = t('explain.waitTables');
  } else if (myTurn && g.canRoll) {
    status = t('status.roll');
    explain = t(meP.pieces.some(isRaid) ? 'explain.trapped' : meP.pieces.every(p => p < 0 || p === HOME) ? 'explain.needSix' : 'explain.roll');
  } else if (myTurn && g.canRaid?.length) {
    status = t('status.move', { n: tb.die });
    explain = t('explain.raid', { n: tb.die });
  } else if (myTurn && g.canMove.length) {
    status = t('status.move', { n: tb.die });
    explain = t('explain.move', { n: tb.die });
  } else if (cur) {
    status = t('status.waiting', { name: nameOf(cur), color: colorName(tb, cur) });
    explain = mineTable ? t('explain.youAre', { color: colorName(tb, me()) }) : t('explain.watching');
  }
  const auto = Boolean(member(me())?.autoplay);
  if (auto && mineTable && g.phase === 'play' && !tb.done) status = t('status.autoplay');
  $('#status').textContent = status;
  $('#explain').textContent = explain;
  const ab = $('#btn-autoplay');
  ab.classList.toggle('hidden', !mineTable || g.phase !== 'play' || Boolean(tb.done));
  ab.classList.toggle('on', auto);
  ab.textContent = t(auto ? 'autoplay.off' : 'autoplay.on');
  ab.title = t('autoplay.title');
  $('#control').classList.toggle('my-turn', myTurn);
  if (meP) $('#control').style.setProperty('--mine', COLOR_HEX[meP.color]);
}

function renderStandings(g) {
  const target = g.settings.target;
  $('#target-pill').textContent = t('side.target', { n: target });
  const where = id => {
    const tb = g.tables.find(x => x.players.some(p => p.id === id));
    return tb ? tb.id : null;
  };
  const list = $('#standings');
  const before = new Map($$('li', list).map(li => [li.dataset.pid, li.getBoundingClientRect().top]));
  const old = app.scores;
  const pct = n => Math.min(100, (n / target) * 100);
  const html = g.standings.map((s, i) => {
    const m = member(s.id);
    const tb = where(s.id);
    return `<li data-pid="${s.id}" class="${s.id === me() ? 'me' : ''}">
      <span class="rank">${i + 1}</span>${avatarHtml(m)}
      <span class="st-main"><span class="st-name">${esc(nameOf(s.id))}${m?.autoplay ? ` <small class="auto-tag">${esc(t('tag.autoplay'))}</small>` : ''}${voiceTag(m)}</span>
        <span class="bar"><i style="width:${pct(old.get(s.id) ?? s.score)}%"></i></span></span>
      <span class="st-score"><b>${s.score}</b><small>${tb !== null ? esc(t('side.atTable', { n: tb + 1 })) : esc(t('side.waiting'))}${s.wins ? ` · 🏆${s.wins}` : ''}</small></span>
    </li>`;
  }).join('');
  if (html === app.standingsHtml) return;
  app.standingsHtml = html;
  list.innerHTML = html;
  app.scores = new Map(g.standings.map(s => [s.id, s.score]));
  for (const s of g.standings) {
    const li = $(`[data-pid="${s.id}"]`, list);
    if (voice.isSpeaking(s.id)) li.setAttribute('data-speaking', '');
    const was = old.get(s.id);
    if (was === undefined || was === s.score) continue;
    requestAnimationFrame(() => { li.querySelector('.bar i').style.width = `${pct(s.score)}%`; });
    if (s.score > was && !vfx.motion.reduced) {
      const plus = document.createElement('span');
      plus.className = 'plus';
      plus.textContent = `+${s.score - was}`;
      li.querySelector('.st-score').appendChild(plus);
      plus.addEventListener('animationend', () => plus.remove(), { once: true });
    }
    // slide from where the row was
    const top = before.get(s.id);
    const dy = top === undefined ? 0 : top - li.getBoundingClientRect().top;
    if (dy && !vfx.motion.reduced) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  }
}

function renderTables(g) {
  $('#tables-panel').classList.toggle('hidden', g.tables.length < 2);
  $('#tables').innerHTML = g.tables.map(tb => {
    const status = tb.done
      ? `✅ ${esc(t('tables.won', { name: nameOf(tb.places?.[0]?.id) }))}`
      : `▶ ${esc(t('tables.turn', { name: nameOf(tb.current) }))}`;
    const home = p => p.pieces.filter(x => x === HOME).length;
    return `<button class="tbl${tb.id === app.watch ? ' on' : ''}${tb.id === g.myTable ? ' mine' : ''}" data-watch="${tb.id}">
      <span class="tbl-h"><b>${esc(t('tables.name', { n: tb.id + 1 }))}</b>${tb.id === g.myTable ? `<span class="tag you">${esc(t('tag.you'))}</span>` : ''}</span>
      <span class="tbl-p">${tb.players.map(p => `<span class="tp"><i class="dot ${p.color}"></i>${esc(nameOf(p.id))} <small>${home(p)}/${p.pieces.length}</small></span>`).join('')}</span>
      <span class="tbl-s">${status}</span>
    </button>`;
  }).join('');
}

function startTimer() {
  cancelAnimationFrame(app.timerRaf);
  const tick = () => {
    const g = game();
    const tb = watched();
    if (!g || !tb) return;
    const bar = $('#timer');
    const limit = g.settings.turnTimer;
    if (g.phase === 'play' && limit && !tb.done && tb.current) {
      const left = Math.max(0, tb.turnStartedAt + limit * 1000 - now());
      bar.classList.remove('hidden');
      bar.firstElementChild.style.width = `${(left / (limit * 1000)) * 100}%`;
      bar.classList.toggle('low', left < 6000);
      const sec = Math.ceil(left / 1000);
      if (tb.current === me() && sec <= 5 && sec > 0 && sec !== app.lastTickSec) { app.lastTickSec = sec; sfx.tick(); }
    } else bar.classList.add('hidden');
    const cd = $('#next-countdown');
    if (cd && g.phase === 'roundOver' && g.roundEndedAt) {
      cd.textContent = Math.max(0, Math.ceil((g.roundEndedAt + NEXT_ROUND_MS - now()) / 1000));
    }
    app.timerRaf = requestAnimationFrame(tick);
  };
  tick();
}
function stopTimer() { cancelAnimationFrame(app.timerRaf); }

// ================================================================
// events: sounds, bubbles, the story
// ================================================================

// Sounds and effects for one event. Events at the table on screen come here through the
// queue, in order with the walks; `tb` is null when no table is on screen.
function animateEvent(ev, tb) {
  const g = game();
  if (!g) return;
  const mine = ev.player === me();
  const here = Boolean(tb) && ev.table === tb.id;
  const die = $('#die');
  switch (ev.type) {
    case 'gameOver': {
      if (ev.winner === me()) {
        sfx.win();
        if (fxOn()) { vfx.shout(t('fx.champion'), { color: '#ffd23f', glow: '#ffd23f', at: boardEl().getBoundingClientRect() }); vfx.confetti(5000); vfx.fireworks(3500); }
      } else {
        sfx.lose();
        if (fxOn() && ev.winner) vfx.shout(t('fx.winner', { name: nameOf(ev.winner) }), { size: 0.55, at: boardEl().getBoundingClientRect() });
      }
      return;
    }
    case 'tableDone': {
      const place = ev.places?.find(p => p.id === me());
      if (!place) return;
      toast(t('toast.placed', { place: t(`place.${place.place}`), points: place.points }), place.place === 1 ? 'good' : 'info', 4000);
      if (place.place === 1) {
        sfx.win();
        if (fxOn()) { vfx.shout(t('fx.first'), { color: '#ffd23f', glow: '#ffd23f', size: 0.8, at: boardEl().getBoundingClientRect() }); vfx.confetti(3000); }
      }
      return;
    }
    case 'turn':
      if (mine && ev.table === g.myTable) {
        sfx.turn();
        vibrate(50);
        if (document.hidden) document.title = t('title.yourTurn');
      }
      return;
    case 'timeout':
      if (mine) toast(t('toast.timeout'), 'info');
      return;
    default: break;
  }
  if (!here) return;
  switch (ev.type) {
    case 'noMove':
      bubble(die, t('bubble.noMove'), 'bad');
      break;
    case 'threeSixes':
      bubble(die, t('bubble.threeSixes'), 'bad');
      break;
    case 'again':
      if (ev.why !== 'six') bubble(die, t(`bubble.again.${ev.why}`), 'good');
      break;
    case 'home':
      fxHome(ev);
      break;
    case 'finished':
      sfx.home();
      toast(mine ? t('fx.youFinished') : t('fx.finished', { name: nameOf(ev.player) }), mine ? 'good' : 'info', 2500);
      break;
    default: break;
  }
}

// a new round: pieces drop into their yards one after the other
function dealIn(g) {
  if (!fxOn()) return;
  $$('#pieces .piece').forEach((el, i) => {
    el.style.setProperty('--d', `${300 + i * 45}ms`);
    replay(el, 'deal');
  });
}

function describe(ev) {
  const p = {
    name: esc(nameOf(ev.player)),
    victim: ev.victim ? esc(nameOf(ev.victim)) : '',
    victimMe: ev.victim === me(),
    value: ev.value,
    steps: ev.path ? ev.path.length : ev.to - Math.max(ev.from ?? 0, 0),
    place: ev.place ? t(`place.${ev.place}`) : '',
    n: ev.round,
    table: ev.table != null ? ev.table + 1 : '',
    why: ev.why,
    me: ev.player === me(),
  };
  if (ev.type === 'move') {
    if (ev.from === -1) return t('ev.out', p);
    if (ev.raid) return t('ev.raid', { ...p, victim: esc(nameOf(ev.raid)), victimMe: ev.raid === me() });
    if (isRaid(ev.from)) return t(isRaid(ev.to) ? 'ev.back' : 'ev.backOut', p);
    if (ev.to === HOME) return null; // the 'home' event tells it
    return t('ev.move', p);
  }
  if (ev.type === 'tableDone') {
    return t('ev.tableDone', { table: p.table, places: ev.places.map(x => `${esc(nameOf(x.id))} +${x.points}`).join(', ') });
  }
  const key = `ev.${ev.type}`;
  return has(key) ? t(key, p) : null;
}

const STORY_ICON = {
  roll: '🎲', out: '🚀', move: '👣', capture: '💥', home: '🏠', finished: '🏁', noMove: '🙅', threeSixes: '🚫', again: '🔁',
  timeout: '⏱', tableDone: '✅', round: '🎲', gameOver: '🏆', leave: '👋', roundOver: '⏸',
};
const iconFor = ev => STORY_ICON[ev.type === 'move' && ev.from === -1 ? 'out' : ev.type] || '•';

function logEvent(ev, keep = true) {
  if (keep) {
    app.logEvents.push(ev);
    if (app.logEvents.length > 300) app.logEvents.shift();
  }
  const text = describe(ev);
  if (!text) return;
  const g = game();
  const showTable = g && g.tables.length > 1 && ev.table != null;
  const div = document.createElement('div');
  div.className = 'log-line';
  div.innerHTML = `${showTable ? `<small class="muted">[${esc(t('tables.short', { n: ev.table + 1 }))}]</small> ` : ''}${iconFor(ev)} ${text}`;
  const list = $('#log-list');
  list.appendChild(div);
  while (list.children.length > 300) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
  if (ev.table === app.watch && ev.type !== 'turn') {
    const icon = iconFor(ev);
    const tb = watched();
    const color = ev.player ? seatOf(tb, ev.player)?.color : '';
    app.story.push({ seq: ev.seq, html: `<span class="si">${icon}</span><span>${text}</span>`, color });
    if (app.story.length > 4) app.story.shift();
  }
}

function renderStory() {
  const newest = app.story.at(-1)?.seq;
  $('#story').innerHTML = app.story.map(s => `<li class="${s.seq === newest ? 'new' : ''} ${s.color || ''}">${s.html}</li>`).join('');
}

// ================================================================
// results between rounds and at the end
// ================================================================

function maybeShowResults(g, boot) {
  if (g.phase === 'play') return;
  const key = `${g.id}:${g.round}:${g.phase}`;
  if (app.resultsKey === key) { if (isOpen('results')) renderResultsActions(); return; }
  app.resultsKey = key;
  if (boot) { showResults(false); return; }
  // let the last walk and the celebration play first
  const gen = app.walkGen;
  app.walking.then(() => setTimeout(() => {
    if (app.resultsKey === key && gen === app.walkGen) showResults(true);
  }, 1400));
}

function showResults(celebrate) {
  const g = game();
  if (!g || g.phase === 'play') return;
  const over = g.phase === 'gameOver';
  const tables = (g.lastRound || []).map(r => `
    <div class="res-table"><h4>${esc(t('tables.name', { n: r.table + 1 }))}</h4>
      ${(r.places || []).map(p => `<div class="res-row${p.id === me() ? ' me' : ''}"><span>${esc(t(`place.${p.place}`))}</span><span>${esc(nameOf(p.id))}</span><b>+${p.points}</b></div>`).join('')}
    </div>`).join('');
  const standings = g.standings.map((s, i) => `
    <tr class="${s.id === g.winner ? 'winner' : ''}${s.id === me() ? ' me' : ''}">
      <td class="num">${i + 1}</td><td><span class="who">${avatarHtml(member(s.id))}${esc(nameOf(s.id))}</span></td>
      <td class="num">${s.score} <small class="muted">/ ${g.settings.target}</small></td><td class="num">${s.wins ? `🏆${s.wins}` : ''}</td>
    </tr>`).join('');
  $('#results-body').innerHTML = `
    <h2 class="results-title">${esc(over ? (g.winner === me() ? t('results.youWin') : t('results.champion', { name: nameOf(g.winner) })) : t('results.round', { n: g.round }))}</h2>
    ${tables ? `<div class="res-tables">${tables}</div>` : ''}
    <table class="results-table">${standings}</table>
    ${!over && g.settings.autoNext ? `<p class="results-sub">${esc(t('results.nextIn'))} <b id="next-countdown"></b>s · ${esc(t('results.mixed'))}</p>` : ''}`;
  renderResultsActions();
  openModal('results');
  if (celebrate && over && g.winner === me()) vibrate([80, 60, 80]);
}

function renderResultsActions() {
  const g = game();
  const over = g?.phase === 'gameOver';
  $('#results-actions').innerHTML = isHost()
    ? (over
      ? `<button class="btn primary" data-host="start">${esc(t('results.again'))}</button><button class="btn" data-host="lobby">${esc(t('results.lobby'))}</button>`
      : `<button class="btn primary" data-host="nextRound">${esc(t('results.nextNow'))}</button><button class="btn ghost" data-close>${esc(t('modal.close'))}</button>`)
    : `<p class="muted">${esc(over ? t('results.waitHost', { name: member(app.state.hostId)?.name || t('theHost') }) : '')}</p><button class="btn ghost" data-close>${esc(t('modal.close'))}</button>`;
}

function showIntro() {
  const g = game();
  const tb = g?.tables.find(x => x.id === g.myTable);
  const mine = seatOf(tb, me());
  $('#intro-you').innerHTML = mine
    ? `<span class="pawn-icon ${mine.color}"></span>${esc(t('intro.you', { color: t(`color.${mine.color}`) }))}`
    : '';
  openModal('intro');
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

const anchorFor = id => $(`#standings [data-pid="${id}"]`) || $(`#lobby-players li[data-id="${id}"]`);

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
    bubble(anchorFor(m.from), m.text.length > 28 ? `${m.text.slice(0, 27)}…` : m.text);
  }
}

function showReaction(from, emoji) { bubble(anchorFor(from), emoji, 'emoji'); }

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
function closeModal(name) { $(`#modal-${name}`)?.classList.add('hidden'); }
function closeAllModals() { for (const m of $$('.modal')) m.classList.add('hidden'); }
const isOpen = name => !$(`#modal-${name}`).classList.contains('hidden');

function relabel() {
  labelSettingsForm();
  updateMuteButtons();
  updateFxButton();
  renderRoomList();
  renderAddresses($('#home-addresses'));
  const chat = $('#chat-list');
  chat.innerHTML = '';
  for (const m of app.chatMsgs) chat.appendChild(chatEl(m));
  $('#log-list').innerHTML = '';
  app.story = [];
  for (const ev of app.logEvents) logEvent(ev, false);
  app.lobbySig = '';
  app.boardSig = '';
  if (app.state) {
    const was = app.booting;
    app.booting = true;
    render();
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

function updateFxButton() {
  $('#btn-fx').textContent = t('menu.fx', { on: !vfx.motion.reduced });
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

// A glowing piece was tapped: one of mine moves (or raids, when that's all it can do),
// or an opponent's piece in its lane gets caught.
function movePiece(el) {
  const g = game();
  if (!g) return;
  if (el.dataset.raid != null) { act('move', { piece: Number(el.dataset.raid), raid: true }); return; }
  const k = Number(el.dataset.k);
  if (g.canMove.includes(k)) act('move', { piece: k });
  else if ((g.canRaid || []).some(r => r.piece === k)) act('move', { piece: k, raid: true });
}

function roll() {
  if (!game()?.canRoll || app.rolling) return;
  act('roll');
}

function wire() {
  applyStatic();
  buildSettingsForm();
  $('#reactions').innerHTML = REACTIONS.map(e => `<button type="button" data-react="${e}">${e}</button>`).join('');
  updateMuteButtons();
  onLangChange(relabel);
  updateFxButton();

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

  $('#die').addEventListener('click', roll);
  $('#board').addEventListener('click', e => {
    const piece = e.target.closest('.piece.movable');
    if (piece) { movePiece(piece); return; }
    // tapping the board on your turn rolls too
    if (game()?.canRoll && watched()?.id === game().myTable) roll();
  });
  document.addEventListener('click', e => {
    const w = e.target.closest('[data-watch]');
    if (!w) return;
    const id = Number(w.dataset.watch);
    if (id === app.watch) return;
    app.watch = id;
    app.shown = {};
    app.story = [];
    app.boardSig = '';
    resetQueue();
    const was = app.booting;
    app.booting = true;
    renderGame(app.state);
    app.booting = was;
  });
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
      case 'intro': if (game()) showIntro(); else openModal('rules'); break;
      case 'mute': setMuted(!isMuted()); updateMuteButtons(); if (!isMuted()) sfx.turn(); break;
      case 'autoplay': act('autoplay', { on: !member(me())?.autoplay }); break;
      case 'fx':
        vfx.setEffects(vfx.motion.reduced);
        updateFxButton();
        toast(t(vfx.motion.reduced ? 'toast.fxOff' : 'toast.fxOn'), 'good', 1600);
        break;
      case 'chat': toggleDrawer(); break;
      case 'voice': if (voice.on) voice.leave(); else voice.join(); break;
      case 'mic': voice.toggleMute(); break;
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

  // keyboard: space/R roll, 1-4 move that piece, T chat
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
    if ((k === 'r' || k === ' ') && g.canRoll) { e.preventDefault(); roll(); } else if (/^[1-4]$/.test(k) && !app.rolling) movePiece({ dataset: { k: Number(k) - 1 } });
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
