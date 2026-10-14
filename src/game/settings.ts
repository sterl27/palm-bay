import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualityPreset = "low" | "medium" | "high" | "ultra";

export type Settings = {
  quality: QualityPreset;
  pixelRatio: number;
  shadowsEnabled: boolean;
  bloomEnabled: boolean;
  filmGrain: boolean;
  letterbox: boolean;
  fov: number;
  crowdDensity: number;
  frameCap: 0 | 30 | 60;
  masterVolume: number;
  radioVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muteOnBackground: boolean;
  cameraSpeed: number;
  invertLook: boolean;
  touchStickSide: "left" | "right";
  vibration: boolean;
  subtitles: boolean;
  subtitleSize: "small" | "medium" | "large";
  reduceMotion: boolean;
  hudOpacity: number;
  skipCinematics: boolean;
  minimapEnabled: boolean;
  controlHints: boolean;
};

export const QUALITY_PRESETS: Record<QualityPreset, Partial<Settings>> = {
  low: { quality: "low", pixelRatio: 1.0, shadowsEnabled: false, bloomEnabled: false, crowdDensity: 0.4, fov: 52 },
  medium: { quality: "medium", pixelRatio: 1.25, shadowsEnabled: false, bloomEnabled: true, crowdDensity: 0.65, fov: 52 },
  high: { quality: "high", pixelRatio: 1.75, shadowsEnabled: true, bloomEnabled: true, crowdDensity: 1.0, fov: 52 },
  ultra: { quality: "ultra", pixelRatio: 2.0, shadowsEnabled: true, bloomEnabled: true, crowdDensity: 1.0, fov: 52 },
};

function detectDefaults(): Settings {
  const phone =
    (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const preset = phone ? QUALITY_PRESETS.low : QUALITY_PRESETS.high;

  return {
    quality: phone ? "low" : "high",
    pixelRatio: preset.pixelRatio ?? 1.75,
    shadowsEnabled: preset.shadowsEnabled ?? true,
    bloomEnabled: preset.bloomEnabled ?? true,
    filmGrain: true,
    letterbox: true,
    fov: 52,
    crowdDensity: phone ? 0.4 : 1.0,
    frameCap: 0,
    masterVolume: 0.72,
    radioVolume: 70,
    sfxVolume: 0.32,
    musicVolume: 0.2,
    muteOnBackground: false,
    cameraSpeed: 1.0,
    invertLook: false,
    touchStickSide: "left",
    vibration: true,
    subtitles: true,
    subtitleSize: "medium",
    reduceMotion,
    hudOpacity: 1.0,
    skipCinematics: false,
    minimapEnabled: true,
    controlHints: true,
  };
}

type SettingsStore = Settings & {
  set: (patch: Partial<Settings>) => void;
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...detectDefaults(),
      set: (patch) => set(patch),
    }),
    {
      name: "ds_settings",
      version: 1,
    },
  ),
);

// Mute-on-background: wire the Page Visibility API. The engine toggleMute binding is
// accessed lazily so this file doesn't create a circular dep with store.ts at import time.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    const { muteOnBackground } = useSettings.getState();
    if (!muteOnBackground) return;
    void import("./store").then(({ useGameStore }) => {
      const { bindings, muted } = useGameStore.getState();
      const hidden = document.visibilityState === "hidden";
      if (hidden && !muted) bindings?.toggleMute();
      if (!hidden && muted) bindings?.toggleMute();
    });
  });
}
