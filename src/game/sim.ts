import {
  CHAPTERS,
  SPRINT_SPEED,
  TESLA,
  WALK_SPEED,
  WALK_TURN,
  ZONES,
  clamp,
  inClub,
  lerp,
  near,
  wrapPi,
  type LeadId,
} from "./constants";
import type { Actions } from "./input";
import { resolveCircle, type AABB } from "./world";

export type Npc = {
  x: number;
  z: number;
  yaw: number;
  kind: "club" | "rapper" | "beard" | "street";
  seed: number;
  mode: "walk" | "dance" | "idle" | "rap";
  speed: number;
};