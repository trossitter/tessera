type AC = typeof AudioContext;
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctor: AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
    if (!_ctx || _ctx.state === "closed") _ctx = new Ctor();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

// --- Ambient loop ---
// Drop the encoded file at /public/assets/ambient.ogg (or .mp3).
// Call preloadAmbient() early to fetch in the background;
// call startAmbient() on first interaction; stopAmbient() to fade out.

const AMBIENT_PATH = "/assets/ambient.ogg";
const AMBIENT_VOLUME = 0.18;
const FADE_IN_S = 2.5;
const FADE_OUT_S = 1.5;

let _ambientBuffer: AudioBuffer | null = null;
let _loadPromise: Promise<AudioBuffer | null> | null = null;
let _ambientSource: AudioBufferSourceNode | null = null;
let _ambientGain: GainNode | null = null;

function loadAmbient(): Promise<AudioBuffer | null> {
  if (_ambientBuffer) return Promise.resolve(_ambientBuffer);
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await fetch(AMBIENT_PATH);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const ctx = getCtx();
      if (!ctx) return null;
      _ambientBuffer = await ctx.decodeAudioData(buf);
      return _ambientBuffer;
    } catch {
      return null;
    }
  })();
  return _loadPromise;
}

export function preloadAmbient(): void {
  loadAmbient();
}

export async function startAmbient(): Promise<void> {
  if (_ambientSource) return;
  const ctx = getCtx();
  if (!ctx) return;
  const buffer = await loadAmbient();
  if (!buffer || _ambientSource) return; // guard against race
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, ctx.currentTime + FADE_IN_S);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    _ambientSource = source;
    _ambientGain = gain;
  } catch {
    // silent fail
  }
}

export function stopAmbient(): void {
  const ctx = getCtx();
  if (!ctx || !_ambientSource || !_ambientGain) return;
  try {
    const stopAt = ctx.currentTime + FADE_OUT_S;
    _ambientGain.gain.linearRampToValueAtTime(0, stopAt);
    _ambientSource.stop(stopAt);
    _ambientSource = null;
    _ambientGain = null;
  } catch {
    // silent fail
  }
}

// --- Click sound — shaped noise burst, 12ms, bandpass ~3kHz.
// Placeholder for a real iPod WAV; crisper than a sine but still synthetic.
export function playDrop(volume = 0.28): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const sampleRate = ctx.sampleRate;
    const duration = 0.012;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.003);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2800;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Audio unavailable — silent fail
  }
}

// Snap sound — short noise burst with exponential decay.
// Generated via Web Audio API; no external file needed.
// Reused for: entrance tile snap, discovery credit moment.
export function playSnap(volume = 0.35): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const sampleRate = ctx.sampleRate;
    const duration = 0.07;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.012);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Audio unavailable — silent fail
  }
}
