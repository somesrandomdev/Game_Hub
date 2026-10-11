import { t } from './i18n.js';

// Card rendering: everything is CSS + inline SVG so the game works fully offline.

const SKIP_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="14"/><line x1="26" y1="74" x2="74" y2="26" stroke="currentColor" stroke-width="14" stroke-linecap="round"/></svg>`;
// Skip Everyone: the skip sign inside a ring of arrows
const SKIP_ALL_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="10"/><line x1="35" y1="65" x2="65" y2="35" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M50 6 A44 44 0 0 1 94 50" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M50 94 A44 44 0 0 1 6 50" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M86 38 L94 54 L100 38 Z" fill="currentColor"/><path d="M14 62 L6 46 L0 62 Z" fill="currentColor"/></svg>`;
// Flip: an empty card turning over into a full one, like the real card's icon
const FLIP_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="12" y="36" width="32" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="8" transform="rotate(-12 28 60)"/><rect x="56" y="36" width="32" height="48" rx="6" fill="currentColor" transform="rotate(12 72 60)"/><path d="M22 28 Q50 2 76 24" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M66 12 L86 30 L62 34 Z" fill="currentColor"/></svg>`;
// Wild Draw Color: a little four-color card after the plus
const MINI_WILD = '<i class="mini-wild" aria-hidden="true"></i>';
const REVERSE_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 58 L22 40 Q22 28 34 28 L70 28" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><path d="M62 14 L80 28 L62 42 Z" fill="currentColor"/><path d="M78 42 L78 60 Q78 72 66 72 L30 72" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><path d="M38 58 L20 72 L38 86 Z" fill="currentColor"/></svg>`;

export const COLOR_HEX = {
  red: '#e5322d', yellow: '#f7c600', green: '#2fa84f', blue: '#1f78d1',
  // UNO Flip dark side
  pink: '#e8389a', teal: '#14a3a3', orange: '#f2711c', purple: '#7b3fc4',
};

const PLUS = { draw1: '+1', draw2: '+2', wild2: '+2', wild4: '+4', draw5: '+5', wildColor: `<span class="plus-wild">+${MINI_WILD}</span>` };

export function cardName(card) {
  return card ? t('cardName', card) : '';
}

function centerSymbol(card) {
  switch (card.value) {
    case 'skip': return `<span class="sym icon">${SKIP_SVG}</span>`;
    case 'reverse': return `<span class="sym icon">${REVERSE_SVG}</span>`;
    case 'skipAll': return `<span class="sym icon">${SKIP_ALL_SVG}</span>`;
    case 'flip': return `<span class="sym icon">${FLIP_SVG}</span>`;
    case 'wild': return '';
    default: {
      if (PLUS[card.value]) return `<span class="sym plus">${PLUS[card.value]}</span>`;
      const ul = card.value === '6' || card.value === '9' ? ' ul' : '';
      return `<span class="sym${ul}">${card.value}</span>`;
    }
  }
}

function cornerSymbol(card) {
  switch (card.value) {
    case 'skip': return `<i class="icon">${SKIP_SVG}</i>`;
    case 'reverse': return `<i class="icon">${REVERSE_SVG}</i>`;
    case 'skipAll': return `<i class="icon">${SKIP_ALL_SVG}</i>`;
    case 'flip': return `<i class="icon">${FLIP_SVG}</i>`;
    case 'wild': return 'W';
    default: return PLUS[card.value] || card.value;
  }
}

// UNO Flip: which side is up right now. A colored card says which side it's from by
// its color; a plain Wild exists on both, so `dark` can be passed for the other side.
const DARK = new Set(['pink', 'teal', 'orange', 'purple', 'wildColor']);
let darkUp = false;
export function setSide(side) { darkUp = side === 'dark'; }

export function createCard(card, dark = card.color === 'wild' && card.value === 'wild' ? darkUp : DARK.has(card.color) || DARK.has(card.value)) {
  const el = document.createElement('div');
  el.className = `card face c-${card.color} v-${card.value}${dark ? ' dark' : ''}`;
  el.dataset.id = card.id;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', cardName(card));
  const corner = cornerSymbol(card);
  el.innerHTML =
    `<span class="corner tl">${corner}</span>` +
    `<span class="oval${card.color === 'wild' ? ' wheel' : ''}"></span>` +
    centerSymbol(card) +
    `<span class="corner br">${corner}</span>`;
  return el;
}

export function createBack() {
  const el = document.createElement('div');
  el.className = 'card back';
  el.innerHTML = '<span class="oval"></span><span class="logo">UNO</span>';
  return el;
}

const COLOR_ORDER = { red: 0, yellow: 1, green: 2, blue: 3, pink: 0, teal: 1, orange: 2, purple: 3, wild: 4 };
const VALUE_ORDER = v => (isNaN(Number(v))
  ? { skip: 10, skipAll: 10, reverse: 11, flip: 12, draw1: 13, draw2: 13, draw5: 13, wild: 14, wild2: 15, wild4: 15, wildColor: 15 }[v] ?? 16
  : Number(v));

export function sortHand(hand, mode) {
  const list = hand.slice();
  if (mode === 'color') {
    list.sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color] || VALUE_ORDER(a.value) - VALUE_ORDER(b.value) || a.id - b.id);
  } else if (mode === 'value') {
    list.sort((a, b) => VALUE_ORDER(a.value) - VALUE_ORDER(b.value) || COLOR_ORDER[a.color] - COLOR_ORDER[b.color] || a.id - b.id);
  }
  return list; // 'none' keeps the order cards were drawn in
}

// Stable pseudo-random tilt so the discard pile looks tossed but doesn't jitter on re-render.
export function tiltFor(id) {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * 30;
}
