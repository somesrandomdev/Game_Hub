// Visual effects: toasts and speech bubbles (game-feel effects live in vfx.js).

export function toast(text, kind = 'info', ms = 2600) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = text;
  box.appendChild(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// Floating label above an element (UNO!, Skipped, emoji reactions...)
export function bubble(anchor, text, kind = '') {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  if (!r.width) return;
  const b = document.createElement('div');
  b.className = `bubble ${kind}`;
  b.textContent = text;
  b.style.left = `${r.left + r.width / 2}px`;
  b.style.top = `${r.top}px`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1800);
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}
