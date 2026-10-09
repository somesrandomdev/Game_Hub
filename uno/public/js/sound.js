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

function noise({ at = 0, dur = 0.08, vol = 0.15, freq = 2500 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + at;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

const notes = (list, opts) => list.forEach(([f, at, dur]) => tone(f, { ...opts, at, dur }));

export const sfx = {
  play: () => { noise({ dur: 0.07, vol: 0.25, freq: 1800 }); tone(330, { dur: 0.08, type: 'triangle', vol: 0.15 }); },
  draw: (i = 0) => noise({ at: i * 0.07, dur: 0.06, vol: 0.12, freq: 3200 }),
  turn: () => notes([[660, 0, 0.12], [880, 0.1, 0.18]], { type: 'sine', vol: 0.18 }),
  skip: () => { tone(500, { dur: 0.15, type: 'square', vol: 0.08, to: 180 }); },
  reverse: () => { tone(300, { dur: 0.25, type: 'sawtooth', vol: 0.07, to: 900 }); tone(900, { at: 0.12, dur: 0.25, type: 'sawtooth', vol: 0.06, to: 300 }); },
  penalty: () => notes([[400, 0, 0.12], [300, 0.11, 0.12], [200, 0.22, 0.25]], { type: 'square', vol: 0.08 }),
  wild: () => notes([[523, 0, 0.1], [659, 0.06, 0.1], [784, 0.12, 0.1], [1047, 0.18, 0.2]], { type: 'triangle', vol: 0.15 }),
  uno: () => notes([[784, 0, 0.12], [988, 0.1, 0.12], [1319, 0.2, 0.35]], { type: 'square', vol: 0.12 }),
  caught: () => notes([[220, 0, 0.18], [185, 0.16, 0.35]], { type: 'sawtooth', vol: 0.12 }),
  swap: () => { tone(200, { dur: 0.35, type: 'triangle', vol: 0.15, to: 800 }); noise({ at: 0.1, dur: 0.2, vol: 0.1, freq: 900 }); },
  win: () => notes([[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.5], [784, 0.62, 0.12], [1047, 0.75, 0.6]], { type: 'triangle', vol: 0.2 }),
  lose: () => notes([[392, 0, 0.25], [370, 0.25, 0.25], [349, 0.5, 0.25], [330, 0.75, 0.6]], { type: 'triangle', vol: 0.15 }),
  chat: () => tone(1200, { dur: 0.06, type: 'sine', vol: 0.08 }),
  error: () => tone(160, { dur: 0.15, type: 'square', vol: 0.07 }),
  tick: () => tone(1500, { dur: 0.03, type: 'square', vol: 0.04 }),
  deal: (i = 0) => noise({ at: i * 0.05, dur: 0.04, vol: 0.1, freq: 4000 }),
  slam: (power = 1) => { tone(140, { dur: 0.18, type: 'sine', vol: 0.22 * power, to: 55 }); noise({ dur: 0.09, vol: 0.18 * power, freq: 900 }); },
  boom: () => { tone(90, { dur: 0.6, type: 'sine', vol: 0.35, to: 32 }); noise({ dur: 0.35, vol: 0.2, freq: 400 }); tone(60, { at: 0.05, dur: 0.5, type: 'triangle', vol: 0.15, to: 30 }); },
  whoosh: () => { noise({ dur: 0.22, vol: 0.12, freq: 700 }); noise({ at: 0.06, dur: 0.2, vol: 0.08, freq: 1600 }); },
  pick: () => tone(1800, { dur: 0.035, type: 'triangle', vol: 0.08, to: 2400 }),
  shimmer: () => notes([[1319, 0, 0.3], [1568, 0.05, 0.3], [2093, 0.1, 0.4]], { type: 'sine', vol: 0.06 }),
};

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = Boolean(v);
  try { localStorage.setItem('uno.muted', muted ? '1' : '0'); } catch { /* ignore */ }
}
