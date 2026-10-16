// Tiny Web Audio synth: every sound is generated, no audio files needed.

let ctx = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem('uno.muted') === '1'; } catch { /* storage blocked */ }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Browsers only allow audio after a user gesture.
document.addEventListener('pointerdown', () => audio(), { once: true });

function tone(freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.25, to = null, attack = 0.005 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ at = 0, dur = 0.08, vol = 0.15, freq = 2500, type = 'bandpass', q = 1 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + at;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  // sharp attack, fast fall: the sound of paper on a table, not a hiss
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

// A soft wooden mallet (marimba-like): a warm fundamental plus a quick bright overtone.
function mallet(freq, at = 0, vol = 0.2, dur = 0.35) {
  tone(freq, { at, dur, type: 'sine', vol, attack: 0.003 });
  tone(freq * 4, { at, dur: 0.06, type: 'sine', vol: vol * 0.25, attack: 0.002 });
}
const mallets = (list, vol) => list.forEach(([f, at, dur]) => mallet(f, at, vol, dur));

// a card hitting the table: a papery slap with a little body under it
const slap = (power = 1, at = 0) => {
  noise({ at, dur: 0.05 + 0.02 * power, vol: 0.22 * power, freq: 1400, type: 'lowpass' });
  tone(150, { at, dur: 0.07, vol: 0.08 * power, to: 80 });
};
// cards riffling through the fingers
const riffle = (n = 6, at = 0, vol = 0.07) => {
  for (let i = 0; i < n; i++) noise({ at: at + i * 0.028, dur: 0.02, vol: vol * (1 - i / (n * 1.5)), freq: 3000 + i * 150, q: 0.8 });
};

export const sfx = {
  play: () => slap(1),
  draw: (i = 0) => noise({ at: i * 0.08, dur: 0.07, vol: 0.09, freq: 2200, q: 0.7 }),
  turn: () => mallets([[587, 0, 0.3], [880, 0.09, 0.45]], 0.16),
  skip: () => mallet(196, 0, 0.18, 0.25),
  reverse: () => mallets([[440, 0, 0.2], [330, 0.08, 0.2], [440, 0.16, 0.3]], 0.12),
  penalty: () => mallets([[330, 0, 0.25], [262, 0.1, 0.25], [196, 0.2, 0.4]], 0.15),
  wild: () => mallets([[523, 0, 0.2], [659, 0.06, 0.2], [784, 0.12, 0.35]], 0.12),
  uno: () => { slap(0.8); mallets([[784, 0.02, 0.18], [1047, 0.1, 0.4]], 0.2); },
  caught: () => { slap(1.2); mallets([[220, 0.05, 0.25], [165, 0.17, 0.45]], 0.18); },
  swap: () => riffle(10, 0, 0.08),
  win: () => mallets([[523, 0, 0.25], [659, 0.12, 0.25], [784, 0.24, 0.25], [1047, 0.36, 0.7]], 0.18),
  lose: () => mallets([[392, 0, 0.3], [349, 0.18, 0.3], [294, 0.36, 0.6]], 0.14),
  chat: () => mallet(1175, 0, 0.06, 0.12),
  error: () => tone(140, { dur: 0.1, vol: 0.12, to: 100 }),
  tick: () => noise({ dur: 0.012, vol: 0.06, freq: 4000, q: 2 }),
  deal: (i = 0) => noise({ at: i * 0.05, dur: 0.03, vol: 0.07, freq: 3200 }),
  slam: (power = 1) => slap(Math.min(1.4, power)),
  boom: () => slap(1.5, 0.02),
  whoosh: () => noise({ dur: 0.12, vol: 0.05, freq: 900, type: 'lowpass' }),
  pick: () => noise({ dur: 0.015, vol: 0.08, freq: 3500, q: 1.5 }),
  shimmer: () => mallet(1568, 0, 0.05, 0.3),
};

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = Boolean(v);
  try { localStorage.setItem('uno.muted', muted ? '1' : '0'); } catch { /* ignore */ }
}
