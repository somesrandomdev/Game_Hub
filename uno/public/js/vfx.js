// Game-feel effects: one full-screen canvas for particles and shockwaves, plus DOM
// effects (arc flights with a 3D flip, shouts, stamps, color waves, screen shake).
// Everything is skipped when motion is reduced: that follows the system setting until the
// player flips the ✨ switch in the menu (remembered per device).

const systemCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let stored = null;
try { stored = localStorage.getItem('uno.fx'); } catch { /* storage blocked */ }
export const motion = { reduced: stored ? stored === 'off' : systemCalm };
document.documentElement.classList.toggle('calm', motion.reduced);

export function setEffects(on) {
  motion.reduced = !on;
  document.documentElement.classList.toggle('calm', motion.reduced);
  try { localStorage.setItem('uno.fx', on ? 'on' : 'off'); } catch { /* ignore */ }
}

// Effects scale with perf.quality (0.35–1): it starts lower on modest devices and drops on
// its own when frames start running late.
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const BASE_QUALITY = lowEnd ? 0.6 : 1;
export const perf = { quality: BASE_QUALITY };
const scaled = n => Math.max(1, Math.round(n * perf.quality));

export const PALETTE = { red: '#ff5a52', yellow: '#ffd23f', green: '#3ddc84', blue: '#4ea1ff', wild: '#ffffff' };
const RAINBOW = [PALETTE.red, PALETTE.yellow, PALETTE.green, PALETTE.blue];
export const colorsFor = color => (color && PALETTE[color] && color !== 'wild' ? [PALETTE[color], '#ffffff'] : RAINBOW);

// ---------------- one animation loop for everything ----------------
// Particles, shockwaves and card flights all advance in a single requestAnimationFrame
// callback that only runs while something is moving.

let canvas = null;
let ctx = null;
let dpr = 1;
let raf = 0;
let last = 0;
let dirty = false;
let slow = 0;
const parts = [];
const rings = [];
const flights = [];

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'vfx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const size = () => {
    // particles are soft glows: full retina resolution isn't worth the fill cost
    dpr = Math.min(lowEnd ? 1 : 1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  };
  size();
  addEventListener('resize', size);
}

function kick() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

// Frames running late for a while → fewer particles. A long smooth stretch wins the
// quality back, so one hiccup (a tab switch, a GC pause) doesn't dim the effects for good.
let smooth = 0;
function measure(dt) {
  if (dt === 0) return;
  slow = dt > 1 / 40 ? slow + 1 : Math.max(0, slow - 2);
  smooth = dt < 1 / 50 ? smooth + 1 : 0;
  if (slow > 24 && perf.quality > 0.35) {
    perf.quality = Math.max(0.35, perf.quality * 0.75);
    slow = 0;
    smooth = 0;
  } else if (smooth > 180 && perf.quality < BASE_QUALITY) {
    perf.quality = Math.min(BASE_QUALITY, perf.quality * 1.25);
    smooth = 0;
  }
}

function frame(now) {
  // the rAF timestamp is when the frame began, which can be a hair before the
  // performance.now() taken in kick(): never let time run backwards
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  try {
    measure(dt);
    for (let i = flights.length - 1; i >= 0; i--) {
      let alive = false;
      try { alive = flights[i](now); } catch (err) { console.warn(err); }
      if (!alive) flights.splice(i, 1);
    }
    if (ctx && (parts.length || rings.length || dirty)) draw(dt);
  } catch (err) {
    // a broken effect must never stop the loop for good (kick() would think it's running)
    console.warn(err);
    parts.length = 0;
    rings.length = 0;
  } finally {
    if (parts.length || rings.length || flights.length || dirty) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
}

function draw(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  dirty = parts.length > 0 || rings.length > 0; // one more clear after the last particle dies
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    const k = r.t / r.life;
    if (k >= 1) { rings.splice(i, 1); continue; }
    const ease = 1 - (1 - k) ** 3;
    ctx.globalAlpha = (1 - k) * r.alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(0.5, r.width * (1 - k));
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0, r.from + (r.to - r.from) * ease), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    const k = p.t / p.life;
    if (k >= 1) { parts.splice(i, 1); continue; }
    const drag = p.drag ** (dt * 60);
    p.vx *= drag;
    p.vy = p.vy * drag + p.grav * dt * 60;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    ctx.globalAlpha = (1 - k) ** 1.5;
    if (p.streak) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * (1 - k * 0.6);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * p.streak, p.y - p.vy * p.streak);
      ctx.stroke();
    } else if (p.flutter) {
      // confetti: a paper strip that spins and flips as it falls
      p.spin += p.flutter * dt * 60;
      const c = Math.cos(p.spin);
      const s = Math.sin(p.spin);
      ctx.fillStyle = p.color;
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
      ctx.fillRect(-p.size / 2, -p.size * 0.7, p.size, p.size * 1.4 * Math.cos(p.spin * 2));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      // squares are much cheaper than arcs and look the same at this size
      const sz = p.size * (1 - k * 0.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - sz, p.y - sz, sz * 2, sz * 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function add(p) {
  if (parts.length >= 600 * perf.quality) parts.shift();
  parts.push(p);
}

// A spray of sparks. `angle`/`spread` aim it (radians), default is all round.
export function burst(x, y, colors = RAINBOW, { n = 36, speed = 7, angle = 0, spread = Math.PI * 2, grav = 0.12, life = 0.85, size = 2.6, streak = 2.2, drag = 0.93 } = {}) {
  if (motion.reduced) return;
  ensureCanvas();
  n = scaled(n);
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.75);
    add({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      t: 0, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8),
      color: colors[i % colors.length], grav, drag, streak: Math.random() < 0.75 ? streak : 0,
    });
  }
  kick();
}

export function shockwave(x, y, color = '#fff', { from = 10, to = 180, width = 7, life = 0.55, alpha = 0.9 } = {}) {
  if (motion.reduced) return;
  ensureCanvas();
  rings.push({ x, y, from, to, width, life, alpha, color, t: 0 });
  kick();
}

// Soft glowing dots that drift up, e.g. along a flying card's path.
export function mote(x, y, color, { size = 3, life = 0.5, speed = 0.6 } = {}) {
  if (motion.reduced || Math.random() > perf.quality) return;
  ensureCanvas();
  add({ x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed - 0.4, t: 0, life, size, color, grav: -0.01, drag: 0.96, streak: 0 });
  kick();
}

const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Card hitting the pile: ring + sparks + a little dust.
export function impact(rect, color, power = 1) {
  if (!rect) return;
  const { x, y } = center(rect);
  const cols = colorsFor(color);
  shockwave(x, y, cols[0], { from: rect.width * 0.4, to: rect.width * (1.6 + power * 0.6), width: 6 + power * 3 });
  if (power > 1.2) shockwave(x, y, '#ffffff', { from: rect.width * 0.3, to: rect.width * 2.6, width: 3, life: 0.8, alpha: 0.5 });
  burst(x, y, cols, { n: Math.round(26 * power), speed: 6 + power * 2.5 });
}

export function firework(x, y) {
  const palette = [RAINBOW[Math.floor(Math.random() * 4)], '#ffffff', RAINBOW[Math.floor(Math.random() * 4)]];
  shockwave(x, y, palette[0], { to: 120, width: 4, life: 0.7, alpha: 0.6 });
  burst(x, y, palette, { n: 70, speed: 8, grav: 0.07, life: 1.5, drag: 0.95, streak: 3 });
}

// Paper confetti raining down from above the screen.
export function confetti(duration = 4000) {
  if (motion.reduced) return;
  ensureCanvas();
  const colors = ['#e5322d', '#f5b800', '#2f9e4f', '#1f6fd1', '#ffffff'];
  for (let i = 0; i < scaled(220); i++) {
    add({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
      t: 0, life: duration / 1000, size: 7 + Math.random() * 7,
      color: colors[i % colors.length], grav: 0.05, drag: 1, streak: 0,
      spin: Math.random() * Math.PI, flutter: (Math.random() - 0.5) * 0.3 || 0.1,
    });
  }
  kick();
}

export function fireworks(duration = 3500) {
  if (motion.reduced) return;
  const end = performance.now() + duration;
  const go = () => {
    if (performance.now() > end) return;
    firework(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.15 + Math.random() * 0.4));
    setTimeout(go, 260 + Math.random() * 380);
  };
  go();
}

// ---------------- flights ----------------

// Fly `el` from rect `from` to rect `to` on a curved path. With flip, the card starts
// face down and turns over mid-air. A glowing trail follows it; onLand fires on arrival.
export function flyArc(el, from, to, { duration = 520, delay = 0, rotFrom = 0, rotTo = 0, lift = 0.28, flip = false, trail = null, onLand, onDone } = {}) {
  if (!from || !to || motion.reduced) { onLand?.(); onDone?.(); return Promise.resolve(); }
  let node = el;
  if (flip) {
    node = document.createElement('div');
    node.className = 'flip3d';
    const back = el.ownerDocument.createElement('div');
    back.className = 'card back flip-back';
    back.innerHTML = '<span class="oval"></span><span class="logo">UNO</span>';
    el.classList.add('flip-face');
    node.append(back, el);
  }
  Object.assign(node.style, {
    position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
    margin: '0', zIndex: '900', pointerEvents: 'none', willChange: 'transform', visibility: 'hidden',
  });
  node.style.setProperty('--cw', `${to.width}px`);
  for (const c of [node, ...node.querySelectorAll('.card')]) c.style.setProperty('--cw', `${to.width}px`);
  node.classList.add('flying');
  document.body.appendChild(node);

  const sx = from.left + from.width / 2 - (to.left + to.width / 2);
  const sy = from.top + from.height / 2 - (to.top + to.height / 2);
  const dist = Math.hypot(sx, sy);
  // control point: halfway, pushed up (and a bit sideways) to make an arc
  const cx = sx / 2 + (sy > 0 ? -1 : 1) * dist * 0.08;
  const cy = sy / 2 - dist * lift;
  const s0 = from.width / to.width;
  const ox = to.left + to.width / 2;
  const oy = to.top + to.height / 2;

  return new Promise(resolve => {
    let start = 0;
    let landed = false;
    const step = now => {
      if (!start) start = now + delay;
      const raw = (now - start) / duration;
      if (raw < 0) return true;
      node.style.visibility = '';
      const t = Math.min(1, raw);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; // ease in-out cubic
      const u = 1 - e;
      const x = u * u * sx + 2 * u * e * cx;
      const y = u * u * sy + 2 * u * e * cy;
      const sc = (s0 + (1 - s0) * e) * (1 + Math.sin(Math.PI * e) * 0.18);
      const rot = rotFrom + (rotTo - rotFrom) * e;
      const ry = flip ? 180 * (1 - Math.min(1, e * 1.25)) : 0;
      node.style.transform = `translate(${x}px, ${y}px) perspective(800px) rotateY(${ry}deg) rotate(${rot}deg) scale(${sc})`;
      if (trail && t < 0.95) mote(ox + x + (Math.random() - 0.5) * 14, oy + y + (Math.random() - 0.5) * 14, trail[Math.floor(Math.random() * trail.length)], { size: 2 + Math.random() * 2.5 });
      if (t < 1) return true;
      if (!landed) { landed = true; onLand?.(); }
      node.remove();
      onDone?.();
      resolve();
      return false;
    };
    flights.push(step);
    kick();
  });
}

// ---------------- DOM effects ----------------

// Giant text slammed onto the middle of the table.
export function shout(text, { color = '#fff', glow = color, size = 1, at = null } = {}) {
  if (motion.reduced) return;
  const el = document.createElement('div');
  el.className = 'shout';
  el.textContent = text;
  el.style.setProperty('--c', color);
  el.style.setProperty('--g', glow);
  el.style.setProperty('--s', size);
  const table = document.getElementById('table');
  const r = at || (table ? table.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight });
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(3.2) rotate(-8deg)', opacity: 0, easing: 'cubic-bezier(.5,0,.75,0)' },
      { transform: 'translate(-50%, -50%) scale(.9) rotate(-3deg)', opacity: 1, offset: 0.16, easing: 'cubic-bezier(.3,1.6,.5,1)' },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1.03) rotate(-3deg)', opacity: 1, offset: 0.72, easing: 'ease-in' },
      { transform: 'translate(-50%, -85%) scale(1.15) rotate(-3deg)', opacity: 0 },
    ],
    { duration: 1300 },
  ).finished.then(() => el.remove(), () => el.remove());
  setTimeout(() => {
    const b = el.getBoundingClientRect();
    if (!b.width) return;
    shockwave(b.left + b.width / 2, b.top + b.height / 2, glow, { from: 30, to: Math.max(b.width, 200), width: 8, life: 0.6 });
  }, 200);
}

// A symbol stamped onto a player's avatar (⊘ for skipped, +4, ...).
export function stamp(anchor, text, color = '#fff') {
  if (!anchor || motion.reduced) return;
  const r = anchor.getBoundingClientRect();
  if (!r.width) return;
  const el = document.createElement('div');
  el.className = 'stamp';
  el.textContent = text;
  el.style.setProperty('--c', color);
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(2.6) rotate(-25deg)', opacity: 0, easing: 'cubic-bezier(.5,0,.75,0)' },
      { transform: 'translate(-50%, -50%) scale(.9) rotate(-12deg)', opacity: 1, offset: 0.18, easing: 'cubic-bezier(.3,1.6,.5,1)' },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-12deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-12deg)', opacity: 1, offset: 0.75, easing: 'ease-in' },
      { transform: 'translate(-50%, -50%) scale(1.3) rotate(-12deg)', opacity: 0 },
    ],
    { duration: 1100 },
  ).finished.then(() => el.remove(), () => el.remove());
  setTimeout(() => shockwave(r.left + r.width / 2, r.top + r.height / 2, color, { from: r.width * 0.4, to: r.width * 1.6, width: 4 }), 200);
}

// A wave of color spreading from a point (the new color after a wild).
export function colorWave(rect, color) {
  if (!rect || motion.reduced) return;
  const { x, y } = center(rect);
  const el = document.createElement('div');
  el.className = 'color-wave';
  el.style.setProperty('--c', PALETTE[color] || '#fff');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 50;
  el.animate(
    [{ transform: 'translate(-50%, -50%) scale(.2)', opacity: 0.9 }, { transform: `translate(-50%, -50%) scale(${reach})`, opacity: 0 }],
    { duration: 900, easing: 'cubic-bezier(.15,.7,.3,1)' },
  ).finished.then(() => el.remove(), () => el.remove());
}

export function flash(color = '#ff3b30', opacity = 0.35) {
  if (motion.reduced) return;
  const el = document.createElement('div');
  el.className = 'screen-flash';
  el.style.background = `radial-gradient(ellipse at center, transparent 30%, ${color})`;
  document.body.appendChild(el);
  el.animate([{ opacity }, { opacity: 0 }], { duration: 650, easing: 'ease-out' }).finished.then(() => el.remove(), () => el.remove());
}

export function shake(el, power = 1) {
  if (!el || motion.reduced) return;
  const p = 7 * power;
  const keys = Array.from({ length: 8 }, (_, i) => {
    const k = 1 - i / 8;
    return { transform: `translate(${(Math.random() - 0.5) * 2 * p * k}px, ${(Math.random() - 0.5) * 2 * p * k}px)` };
  });
  // `transform`, not `translate`: seats are centered with translate and would jump away
  el.animate([...keys, { transform: 'none' }], { duration: 420, easing: 'linear' });
}
