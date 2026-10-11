// Game Night hub: pick a game, or jump into a friend's room whatever it's playing.

import { toast } from '/shared/fx.js';
import { qrSvg } from '/shared/qr.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DICT = {
  en: {
    tagline: 'Games to play with friends on the same Wi-Fi or hotspot. No internet needed.',
    'uno.desc': 'The card game. House rules, UNO Flip, bots, voice chat.',
    'uno.players': '2–10 players',
    'uno.time': '10–20 min',
    'mono.desc': 'Buy streets, build hotels, bankrupt your friends. Auctions, trades, bots.',
    'mono.players': '2–8 players',
    'mono.time': '30–90 min',
    'ludo.desc': 'Tournament mode: tables of 4, new opponents every round, first to the score wins.',
    'ludo.players': '2–16 players',
    'ludo.time': '5–10 min a round',
    'join.title': 'Join a friend',
    'join.go': 'Join',
    friends: 'Friends join from',
    lookingUp: 'Looking up addresses…',
    scan: 'Scan with a phone to open the games',
    online: '🌍 Online link',
    onlineWait: '🌍 Opening the online link…',
    none: 'No network found: connect to Wi-Fi or turn on Mobile Hotspot.',
    copy: 'Copy',
    copied: 'Copied!',
    playing: 'playing',
    lobby: 'lobby',
    finished: 'finished',
    hostRoom: p => `${p.host}'s room · ${p.players} player${p.players === 1 ? '' : 's'}`,
    codeLength: 'Room codes have 4 letters',
    notFound: p => `No room called ${p.code}`,
    connection: 'Can\'t reach the server',
  },
  fr: {
    tagline: 'Des jeux entre amis sur le même Wi-Fi ou partage de connexion. Pas besoin d\'internet.',
    'uno.desc': 'Le jeu de cartes. Règles maison, UNO Flip, bots, chat vocal.',
    'uno.players': '2 à 10 joueurs',
    'uno.time': '10–20 min',
    'mono.desc': 'Achète des rues, construis des hôtels, ruine tes amis. Enchères, échanges, bots.',
    'mono.players': '2 à 8 joueurs',
    'mono.time': '30–90 min',
    'ludo.desc': 'Mode tournoi : tables de 4, nouveaux adversaires à chaque manche, le premier au score gagne.',
    'ludo.players': '2 à 16 joueurs',
    'ludo.time': '5–10 min par manche',
    'join.title': 'Rejoindre un ami',
    'join.go': 'Rejoindre',
    friends: 'Tes amis se connectent sur',
    lookingUp: 'Recherche des adresses…',
    scan: 'Scanne avec un téléphone pour ouvrir les jeux',
    online: '🌍 Lien en ligne',
    onlineWait: '🌍 Ouverture du lien en ligne…',
    none: 'Aucun réseau : connecte-toi au Wi-Fi ou active le point d\'accès mobile.',
    copy: 'Copier',
    copied: 'Copié !',
    playing: 'en jeu',
    lobby: 'salon',
    finished: 'terminée',
    hostRoom: p => `Salle de ${p.host} · ${p.players} joueur${p.players === 1 ? '' : 's'}`,
    codeLength: 'Les codes de salle ont 4 lettres',
    notFound: p => `Aucune salle avec le code ${p.code}`,
    connection: 'Impossible de joindre le serveur',
  },
};
const GAME_NAMES = { uno: 'UNO', monopoly: 'Monopoly', ludo: 'Ludo' };

// the language choice is shared by every game on this server
let lang = (() => {
  try { const v = localStorage.getItem('uno.lang'); if (DICT[v]) return v; } catch { /* blocked */ }
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
})();

function t(key, params = {}) {
  const v = DICT[lang][key] ?? DICT.en[key] ?? key;
  return typeof v === 'function' ? v(params) : v;
}

function applyStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  $('[data-action="lang"]').textContent = `🌐 ${lang.toUpperCase()}`;
  renderAddresses();
  renderRooms();
}

let info = null;
let rooms = [];

async function loadInfo() {
  try { info = await (await fetch('/api/info')).json(); } catch { info = null; }
  renderAddresses();
  if (info?.online) setTimeout(loadInfo, info.publicUrl ? 30000 : 3000);
}

function renderAddresses() {
  const box = $('#addresses');
  const port = info?.port || location.port || 80;
  const pub = info?.publicUrl;
  const viaPublic = pub && location.origin === new URL(pub).origin;
  const lan = viaPublic ? [] : (info?.addresses || []).map(a => ({ url: `http://${a.address}:${port}/`, iface: a.iface, weak: a.address.startsWith('169.254.') }));
  const list = pub ? [{ url: `${pub}/`, iface: t('online'), online: true }, ...lan] : lan;
  const pending = info?.online && !pub ? `<div class="addr pending"><small>${esc(t('onlineWait'))}</small></div>` : '';
  if (!info) return;
  if (!list.length) {
    box.innerHTML = `${pending}<div class="addr"><a href="/">${esc(location.origin)}/</a></div><p class="muted small">${esc(t('none'))}</p>`;
  } else {
    box.innerHTML = pending + list.map(a => `
      <div class="addr${a.weak ? ' weak' : ''}${a.online ? ' online' : ''}">
        <div><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url.replace(/^https?:\/\//, ''))}</a><br><small>${esc(a.iface)}</small></div>
        <button class="btn ghost sm" data-copy="${esc(a.url)}">${esc(t('copy'))}</button>
      </div>`).join('');
  }
  const qrUrl = list.find(a => !a.weak)?.url;
  const qr = $('#hub-qr');
  qr.classList.toggle('hidden', !qrUrl);
  if (qrUrl && qr.dataset.url !== qrUrl) {
    qr.dataset.url = qrUrl;
    qr.querySelector('.qr-img').innerHTML = qrSvg(qrUrl);
  }
}

async function pollRooms() {
  try { rooms = (await (await fetch('/api/rooms')).json()).rooms; } catch { rooms = []; }
  renderRooms();
}

function renderRooms() {
  $('#room-list').innerHTML = rooms.map(r => `
    <button class="room-item" data-room="${esc(r.code)}" data-game="${esc(r.game)}">
      <span><span class="game-tag ${esc(r.game)}">${esc(GAME_NAMES[r.game] || r.game)}</span><b>${esc(r.code)}</b><br>
      <small>${esc(t('hostRoom', { host: r.host, players: r.players }))}</small></span>
      <span class="status ${r.status === 'playing' ? 'playing' : ''}">${esc(t(r.status))}</span>
    </button>`).join('');
}

const goTo = (game, code) => { location.href = `/${encodeURIComponent(game)}/?room=${encodeURIComponent(code)}`; };

async function joinCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { toast(t('codeLength'), 'error'); return; }
  try {
    const res = await fetch(`/api/room?code=${code}`);
    if (res.status === 404) { toast(t('notFound', { code }), 'error'); return; }
    const { game } = await res.json();
    goTo(game, code);
  } catch { toast(t('connection'), 'error'); }
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast(t('copied'), 'good', 1500);
}

$('[data-action="lang"]').addEventListener('click', () => {
  lang = lang === 'en' ? 'fr' : 'en';
  try { localStorage.setItem('uno.lang', lang); } catch { /* ignore */ }
  applyStatic();
});
$('#join-form').addEventListener('submit', e => { e.preventDefault(); joinCode($('#code-input').value); });
$('#code-input').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
document.addEventListener('click', e => {
  const room = e.target.closest('[data-room]');
  if (room) goTo(room.dataset.game, room.dataset.room);
  const copy = e.target.closest('[data-copy]');
  if (copy) copyText(copy.dataset.copy);
});

applyStatic();
loadInfo();
pollRooms();
setInterval(pollRooms, 3000);

// an invite link to a room that's gone ends up here
const missing = new URLSearchParams(location.search).get('room');
if (missing) {
  toast(t('notFound', { code: missing.toUpperCase().slice(0, 4) }), 'error', 3500);
  history.replaceState(null, '', '/');
}
