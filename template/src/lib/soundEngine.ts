// ─── Passionate Learning — Sound Engine ───
// Web Audio API synthesized game sounds. Zero external audio files.
// Spec: ascending chime on correct, soft low tone on incorrect (NOT a buzzer),
// celebration chord on level complete, lo-fi ambient option.
// SSR-safe. Mute toggle + volume control persisted to localStorage.

const STORAGE_KEY = "pl_sound_prefs";

export interface SoundPrefs {
  muted: boolean;
  volume: number; // 0-1
}

const DEFAULT_PREFS: SoundPrefs = { muted: false, volume: 0.7 };

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// ─── Persistence ───

export function loadSoundPrefs(): SoundPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_PREFS.muted,
      volume: typeof parsed.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume : DEFAULT_PREFS.volume,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveSoundPrefs(prefs: SoundPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ─── Tone Primitives ───

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gainVal: number,
  startOffset = 0,
): void {
  const ac = getContext();
  if (!ac) return;
  const prefs = loadSoundPrefs();
  if (prefs.muted) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainVal * prefs.volume, ac.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + startOffset);
  osc.stop(ac.currentTime + startOffset + duration);
}

// ─── Game Sounds ───

/** Ascending three-note chime — correct answer */
export function playCorrect(): void {
  playTone(523.25, 0.15, "sine", 0.3, 0);     // C5
  playTone(659.25, 0.15, "sine", 0.3, 0.08);   // E5
  playTone(783.99, 0.2, "sine", 0.35, 0.16);    // G5
}

/** Soft descending tone — incorrect answer (gentle, NOT a buzzer) */
export function playIncorrect(): void {
  playTone(311.13, 0.3, "triangle", 0.2, 0);    // Eb4
  playTone(261.63, 0.35, "triangle", 0.15, 0.12); // C4
}

/** Major chord burst + ascending arpeggio — level complete */
export function playCelebration(): void {
  // Chord hit
  playTone(261.63, 0.4, "sine", 0.2, 0);       // C4
  playTone(329.63, 0.4, "sine", 0.2, 0);       // E4
  playTone(392.00, 0.4, "sine", 0.2, 0);       // G4
  // Rising arpeggio
  playTone(523.25, 0.18, "sine", 0.25, 0.2);   // C5
  playTone(659.25, 0.18, "sine", 0.25, 0.3);   // E5
  playTone(783.99, 0.18, "sine", 0.25, 0.4);   // G5
  playTone(1046.50, 0.35, "sine", 0.3, 0.5);   // C6
}

/** Subtle tick for UI interactions */
export function playTick(): void {
  playTone(880, 0.05, "sine", 0.1, 0);          // A5
}

/** Achievement unlock — shimmering rise */
export function playAchievement(): void {
  playTone(440.00, 0.2, "sine", 0.2, 0);       // A4
  playTone(554.37, 0.2, "sine", 0.2, 0.1);     // C#5
  playTone(659.25, 0.2, "sine", 0.25, 0.2);    // E5
  playTone(880.00, 0.3, "sine", 0.3, 0.3);     // A5
  playTone(1108.73, 0.4, "sine", 0.2, 0.4);    // C#6
}
