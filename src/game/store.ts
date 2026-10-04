import { create } from "zustand";
import type { LeadId } from "./constants";

export type Phase = "loading" | "title" | "play" | "pause" | "win";

export type HudSnap = {
  phase: Phase;
  chapter: number;
  chapterTitle: string;
  objective: string;
  prompt: string;
  toast: string;
  speed: number;
  inVehicle: boolean;
  muted: boolean;
  x: number;
  z: number;
  yaw: number;
  blipX: number | null;
  blipZ: number | null;
  hold: number;
  vehicleName: string;
  reel: "alley" | null;
  caption: string;
  slate: string;
  lead: LeadId;
};

const empty: HudSnap = {
  phase: "loading",
  chapter: 0,
  chapterTitle: "Arrival",
  objective: "",
  prompt: "",
  toast: "",
  speed: 0,
  inVehicle: true,
  muted: false,
  x: 0,
  z: 0,
  yaw: 0,
  blipX: null,
  blipZ: null,
  hold: 0,
  vehicleName: "Night",
  reel: null,
  caption: "",
  slate: "",
  lead: "lead",
};

type Bindings = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  toggleMute: () => void;
  setTouch: (steer: number, throttle: number) => void;
  tapEnter: () => void;
  tapHandbrake: () => void;
  setActionHold: (v: boolean) => void;
  skipReel: () => void;
};

type Store = HudSnap & {
  bindings: Bindings | null;
  bind: (b: Bindings) => void;
  patch: (p: Partial<HudSnap>) => void;
  setLead: (lead: LeadId) => void;
};

export const useGameStore = create<Store>((set) => ({
  ...empty,
  bindings: null,
  bind: (bindings) => set({ bindings }),
  patch: (p) => set(p),
  setLead: (lead) => set({ lead }),
}));
