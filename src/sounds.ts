// Drop sound — sine oscillator with falling pitch, ~150ms.
// Timbre: soft raindrop landing; used for label toggle acknowledgement.
export function playDrop(volume = 0.22): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // Audio unavailable — silent fail
  }
}

// Snap sound — short noise burst with exponential decay.
// Generated via Web Audio API; no external file needed.
// Reused for: entrance tile snap, discovery credit moment.
export function playSnap(volume = 0.35): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio unavailable — silent fail
  }
}
