let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function isEnabled(): boolean {
  return localStorage.getItem('soundEnabled') === 'true';
}

function tone(freq: number, durationSec: number, type: OscillatorType = 'sine', volume = 0.08) {
  if (!isEnabled()) return;
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + durationSec);
  osc.start(audio.currentTime);
  osc.stop(audio.currentTime + durationSec);
}

export const sfx = {
  click: () => tone(600, 0.05, 'square', 0.03),
  place: () => {
    tone(440, 0.1, 'sine', 0.06);
    setTimeout(() => tone(554, 0.1, 'sine', 0.05), 50);
  },
  error: () => tone(220, 0.18, 'sawtooth', 0.04),
  win: () => {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.08), i * 100));
  },
};
