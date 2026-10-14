import { create } from "zustand";
import type { LeadId } from "./
constants";

export type Phase = "loading" | "title" | "play" | "pause" | "win" | "fail";

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
  score: number;
  strikes: number;
  night: number;
  roomClock: number;
  tookEnvelope: boolean;
};