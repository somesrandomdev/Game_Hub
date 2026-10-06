// Visual effects: flying cards, toasts, speech bubbles, confetti.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animate `el` from rect `from` to rect `to` (both DOMRects), then remove it.
export function fly(el, from, to, { duration = 420, delay = 0, rotFrom = 0, rotTo = 0, onDone } = {}) {
  if (!from || !to || reduceMotion) { onDone?.(); return Promise.resolve(); }
  Object.assign(el.style, {
    position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
    margin: '0', zIndex: '900', pointerEvents: 'none',
  });
  el.style.setProperty('--cw', `${to.width}px`);
  el.classList.add('flying');
  document.body.appendChild(el);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = from.width / to.width;
  const anim = el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${rotFrom}deg)` },
      { transform: `translate(0, 0) scale(1) rotate(${rotTo}deg)` },
    ],
    { duration, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' },
  );
  const done = () => { el.remove(); onDone?.(); };
  return anim.finished.then(done, done);
}

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

export function confetti(duration = 4000) {
  if (reduceMotion) return;
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.display = 'block';
  ctx.scale(dpr, dpr);
  const colors = ['#e5322d', '#f7c600', '#2fa84f', '#1f78d1', '#ffffff'];
  const parts = Array.from({ length: 220 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.5,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.r * 2));
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  requestAnimationFrame(frame);
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}
