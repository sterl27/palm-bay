export const FIXED = 1 / 60;

export const WALK_SPEED = 4.6;
export const SPRINT_SPEED = 7.4;
export const WALK_TURN = 2.55;

export const TESLA = {
  name: "Night",
  max: 12,
  accel: 9,
  brake: 18,
  turn: 2.55,
  reverse: 6,
};

export const BOUNDS = {
  minX: -22,
  maxX: 46,
  minZ: -24,
  maxZ: 48,
};

export const ZONES = {
  curb: { x: 4.2, z: 2, r: 8 },
  door: { x: 8.3, z: 2, r: 2.1 },
  vip: { x: 19.5, z: 2, r: 3.2 },
  back: { x: 25.7, z: 2, r: 2.1 },
  standoff: { x: 36.2, z: 1.6, r: 3.4 },
};


export type LeadId = "lead" | "voice" | "quiet";

export const LEADS = [
  {
    id: "lead",
    label: "Lead",
    line: "The car. The rope. The walk.",
    face: "/avatars/hero-face.png",
  },
  {
    id: "voice",
    label: "The Voice",
    line: "Owns the room. The floor answers.",
    face: "/avatars/rapper-face.png",
  },
  {
    id: "quiet",
    label: "The Quiet",
    line: "Slower step. The alley is yours.",
    face: "/avatars/beard-face.png",
  },
] as const;

export const BEATS = [
  "Pull the car to the rope",
  "Step out",
  "Walk the carpet",
  "Own the floor",
  "Hold the alley",
] as const;

export const CHAPTERS = [
  {
    id: "arrival",
    title: "Arrival",
    line: "Pull up to Molt 54.",
  },
  {
    id: "carpet",
    title: "The Carpet",
    line: "Walk the velvet rope.",
  },
  {
    id: "floor",
    title: "The Floor",
    line: "Cross the night. Own the room.",
  },
  {
    id: "alley",
    title: "After Hours",
    line: "Face him in the alley.",
  },
] as const;

export function inClub(x: number, z: number) {
  return x > 8.15 && x < 25.85 && z > -7.6 && z < 11.6;
}

export function inAlley(x: number, z: number) {
  return x > 26 && x < 45 && z > -12 && z < 14;
}

export function dist2(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function near(
  x: number,
  z: number,
  zone: { x: number; z: number; r: number },
) {
  return dist2(x, z, zone.x, zone.z) <= zone.r * zone.r;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function wrapPi(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
