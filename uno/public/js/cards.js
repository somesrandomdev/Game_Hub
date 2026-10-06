import { t } from './i18n.js';

// Card rendering: everything is CSS + inline SVG so the game works fully offline.

const SKIP_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="14"/><line x1="26" y1="74" x2="74" y2="26" stroke="currentColor" stroke-width="14" stroke-linecap="round"/></svg>`;
const REVERSE_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 58 L22 40 Q22 28 34 28 L70 28" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><path d="M62 14 L80 28 L62 42 Z" fill="currentColor"/><path d="M78 42 L78 60 Q78 72 66 72 L30 72" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><path d="M38 58 L20 72 L38 86 Z" fill="currentColor"/></svg>`;

export const COLOR_HEX = { red: '#e5322d', yellow: '#f7c600', green: '#2fa84f', blue: '#1f78d1' };

export function cardName(card) {
  return card ? t('cardName', card) : '';
}

function centerSymbol(card) {
  switch (card.value) {
    case 'skip': return `<span class="sym icon">${SKIP_SVG}</span>`;
    case 'reverse': return `<span class="sym icon">${REVERSE_SVG}</span>`;
    case 'draw2': return '<span class="sym plus">+2</span>';
    case 'wild4': return '<span class="sym plus">+4</span>';
    case 'wild': return '';
    default: {
      const ul = card.value === '6' || card.value === '9' ? ' ul' : '';
      return `<span class="sym${ul}">${card.value}</span>`;
    }
  }
}

function cornerSymbol(card) {
  switch (card.value) {
    case 'skip': return `<i class="icon">${SKIP_SVG}</i>`;
    case 'reverse': return `<i class="icon">${REVERSE_SVG}</i>`;
    case 'draw2': return '+2';
    case 'wild4': return '+4';
    case 'wild': return 'W';
    default: return card.value;
  }
}

export function createCard(card) {
  const el = document.createElement('div');
  el.className = `card face c-${card.color} v-${card.value}`;
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

const COLOR_ORDER = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
const VALUE_ORDER = v => (isNaN(Number(v)) ? { skip: 10, reverse: 11, draw2: 12, wild: 13, wild4: 14 }[v] : Number(v));

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
