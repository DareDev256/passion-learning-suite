import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};

// ─── Web Audio API mock ───
const mockGainNode = () => ({
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
  connect: vi.fn(),
});
const mockOscNode = () => ({
  type: "sine" as OscillatorType,
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

const mockAudioCtx = {
  state: "running" as string,
  currentTime: 0,
  resume: vi.fn(),
  destination: {},
  createOscillator: vi.fn(mockOscNode),
  createGain: vi.fn(mockGainNode),
};

// Stub globals before import (same pattern as achievements.test.ts)
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true, configurable: true });
// Must be a regular function (not arrow) so `new AudioContext()` works
Object.defineProperty(globalThis, "AudioContext", {
  value: function AudioContext() { return mockAudioCtx; },
  writable: true, configurable: true,
});

import {
  loadSoundPrefs,
  saveSoundPrefs,
  playCorrect,
  playIncorrect,
  playCelebration,
  playTick,
  playAchievement,
} from "@/lib/soundEngine";

beforeEach(() => {
  localStorageMock.clear();
  mockAudioCtx.createOscillator.mockClear();
  mockAudioCtx.createGain.mockClear();
  mockAudioCtx.createOscillator.mockImplementation(mockOscNode);
  mockAudioCtx.createGain.mockImplementation(mockGainNode);
});

describe("loadSoundPrefs", () => {
  it("returns defaults when nothing stored", () => {
    const prefs = loadSoundPrefs();
    expect(prefs).toEqual({ muted: false, volume: 0.7 });
  });

  it("loads saved preferences", () => {
    localStorageMock.setItem("pl_sound_prefs", JSON.stringify({ muted: true, volume: 0.3 }));
    const prefs = loadSoundPrefs();
    expect(prefs.muted).toBe(true);
    expect(prefs.volume).toBe(0.3);
  });

  it("recovers from malformed JSON", () => {
    localStorageMock.setItem("pl_sound_prefs", "not-json{{{");
    const prefs = loadSoundPrefs();
    expect(prefs).toEqual({ muted: false, volume: 0.7 });
  });

  it("rejects invalid volume (out of range)", () => {
    localStorageMock.setItem("pl_sound_prefs", JSON.stringify({ muted: false, volume: 5 }));
    expect(loadSoundPrefs().volume).toBe(0.7);
  });

  it("rejects negative volume", () => {
    localStorageMock.setItem("pl_sound_prefs", JSON.stringify({ muted: false, volume: -1 }));
    expect(loadSoundPrefs().volume).toBe(0.7);
  });

  it("rejects non-boolean muted", () => {
    localStorageMock.setItem("pl_sound_prefs", JSON.stringify({ muted: "yes", volume: 0.5 }));
    expect(loadSoundPrefs().muted).toBe(false);
  });

  it("handles missing fields gracefully", () => {
    localStorageMock.setItem("pl_sound_prefs", JSON.stringify({}));
    const prefs = loadSoundPrefs();
    expect(prefs.muted).toBe(false);
    expect(prefs.volume).toBe(0.7);
  });
});

describe("saveSoundPrefs", () => {
  it("persists preferences to localStorage", () => {
    saveSoundPrefs({ muted: true, volume: 0.5 });
    const stored = JSON.parse(localStorageMock.getItem("pl_sound_prefs")!);
    expect(stored.muted).toBe(true);
    expect(stored.volume).toBe(0.5);
  });

  it("overwrites previous preferences", () => {
    saveSoundPrefs({ muted: false, volume: 0.9 });
    saveSoundPrefs({ muted: true, volume: 0.1 });
    const stored = JSON.parse(localStorageMock.getItem("pl_sound_prefs")!);
    expect(stored.muted).toBe(true);
    expect(stored.volume).toBe(0.1);
  });
});

describe("playCorrect", () => {
  it("creates 3 oscillators for ascending chime", () => {
    playCorrect();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(3);
  });

  it("does not play when muted", () => {
    saveSoundPrefs({ muted: true, volume: 0.7 });
    playCorrect();
    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
  });
});

describe("playIncorrect", () => {
  it("creates 2 oscillators for soft descending tone", () => {
    playIncorrect();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("does not play when muted", () => {
    saveSoundPrefs({ muted: true, volume: 0.7 });
    playIncorrect();
    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
  });
});

describe("playCelebration", () => {
  it("creates 7 oscillators for chord + arpeggio", () => {
    playCelebration();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(7);
  });
});

describe("playTick", () => {
  it("creates 1 oscillator for UI tick", () => {
    playTick();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(1);
  });
});

describe("playAchievement", () => {
  it("creates 5 oscillators for shimmering rise", () => {
    playAchievement();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(5);
  });
});

describe("volume scaling", () => {
  it("applies volume multiplier to gain values", () => {
    saveSoundPrefs({ muted: false, volume: 0.5 });
    playTick();
    const gainNode = mockAudioCtx.createGain.mock.results[0]?.value;
    expect(gainNode).toBeDefined();
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(
      0.1 * 0.5, // tick gain (0.1) * volume (0.5)
      expect.any(Number),
    );
  });
});
