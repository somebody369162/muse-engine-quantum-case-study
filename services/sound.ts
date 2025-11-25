
let audioContext: AudioContext | null = null;
let isEnabled = false;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext || audioContext.state === 'closed') {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.", e);
      return null;
    }
  }
  return audioContext;
};

export const setSoundEnabled = (enabled: boolean) => {
  isEnabled = enabled;
  const ctx = getContext();
  if (enabled && ctx && ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Could not resume AudioContext:", e));
  }
};

const playSound = (type: OscillatorType, frequency: number, duration: number, volume: number) => {
  if (!isEnabled) return;
  const ctx = getContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Could not resume AudioContext on play:", e));
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

export const playClick = () => playSound('triangle', 380, 0.1, 0.04);
export const playToggleOn = () => playSound('sine', 520, 0.12, 0.06);
export const playToggleOff = () => playSound('sine', 440, 0.12, 0.05);
export const playSend = () => playSound('square', 300, 0.15, 0.03);
export const playReceive = () => playSound('sine', 600, 0.1, 0.05);
