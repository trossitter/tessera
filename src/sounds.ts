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

// Click sound — shaped noise burst, 12ms, bandpass ~3kHz.
// Placeholder for a real iPod WAV; crisper than a sine but still synthetic.
export function playDrop(volume = 0.35): void {
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
