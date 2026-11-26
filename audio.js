// Small synthesized sound kit (Web Audio, no sound files).
// Browsers only allow audio after the visitor's first click or key press, so the context starts then.
const KEY = "gear-sound";
let ctx = null, master = null, noiseBuf = null, hum = null;
let enabled = localStorage.getItem(KEY) !== "off"; // on by default

function start() {
  if (ctx || !enabled) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  // one second of white noise, reused by every noisy sound
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startHum();
}
for (const ev of ["pointerdown", "keydown", "touchstart"]) addEventListener(ev, start, { once: false, passive: true });

function noise(dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = dur > 1;
  return s;
}
function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
const ready = () => enabled && ctx && ctx.state === "running";

/** PC fan hum: soft filtered noise whose volume follows how close the camera is to the PC. */
function startHum() {
  const src = noise(2);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 0.3;
  const bp = ctx.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 180; bp.gain.value = 6;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(lp).connect(bp).connect(g).connect(master);
  src.start();
  hum = g;
}

export const sfx = {
  get enabled() { return enabled; },
  setEnabled(on) {
    enabled = on;
    localStorage.setItem(KEY, on ? "on" : "off");
    if (on) { start(); ctx?.resume(); } else ctx?.suspend();
  },
  /** Hall-effect key press: a short filtered tick plus a low thock. */
  key() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const n = noise(0.05), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = "bandpass"; bp.frequency.value = 2600 + Math.random() * 1400; bp.Q.value = 1.2;
    env(g, t, 0.18, 0.002, 0.03);
    n.connect(bp).connect(g).connect(master); n.start(t); n.stop(t + 0.06);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(170 + Math.random() * 40, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.05);
    env(og, t, 0.16, 0.002, 0.05);
    o.connect(og).connect(master); o.start(t); o.stop(t + 0.08);
  },
  /** UI tick for opening cards and buttons. */
  click() {
    if (!ready()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.04);
    env(g, t, 0.08, 0.002, 0.05);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.07);
  },
  /** Camera fly-over: a soft air sweep. */
  whoosh(dur = 0.7, peak = 0.05) {
    if (!ready()) return;
    const t = ctx.currentTime, n = noise(dur + 0.1), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass"; f.Q.value = 0.8;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.45); f.frequency.exponentialRampToValueAtTime(400, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(master); n.start(t); n.stop(t + dur + 0.05);
  },
  /** PC opening up: two staggered sweeps and a latch click. */
  explode() {
    if (!ready()) return;
    sfx.whoosh(0.5, 0.06);
    setTimeout(() => sfx.whoosh(0.6, 0.04), 140);
    setTimeout(() => sfx.click(), 60);
  },
  /** 0..1 fan hum level. */
  hum(level) {
    if (!hum || !ctx) return;
    hum.gain.setTargetAtTime(enabled ? 0.05 * level : 0, ctx.currentTime, 0.3);
  },
};
