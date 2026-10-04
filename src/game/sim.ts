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

export type Sim = {
  player: {
    x: number;
    z: number;
    yaw: number;
    speed: number;
    inCar: boolean;
    carX: number;
    carZ: number;
    carYaw: number;
  };
  npcs: Npc[];
  chapter: number;
  hold: number;
  prompt: string;
  toast: string;
  toastT: number;
  trauma: number;
  ended: boolean;
  failed: boolean;
  time: number;
  lead: LeadId;
  score: number;
  strikes: number;
  night: number;
  parkedClean: boolean;
  roomOwned: boolean;
};

export function createSim(): Sim {
  const npcs: Npc[] = [];
  const line: [number, number][] = [
    [7.55, 4.6],
    [7.55, 6.1],
    [7.55, 7.6],
    [7.55, 9.1],
    [7.55, 10.6],
    [7.55, -1.0],
    [7.55, -2.6],
    [7.55, -4.2],
    [7.55, -5.8],
  ];
  line.forEach(([x, z], i) => {
    npcs.push({
      x,
      z,
      yaw: Math.PI / 2,
      kind: "club",
      seed: i + 2,
      mode: "idle",
      speed: 0,
    });
  });
  const carpet: [number, number, number][] = [
    [4.2, 3.62, 0],
    [5.5, 3.62, 0],
    [6.75, 3.62, 0],
    [4.2, 0.38, Math.PI],
    [5.5, 0.38, Math.PI],
    [6.75, 0.38, Math.PI],
  ];
  carpet.forEach(([x, z, yaw], i) => {
    npcs.push({
      x,
      z,
      yaw,
      kind: "club",
      seed: 60 + i,
      mode: "idle",
      speed: 0,
    });
  });
  const dancers: [number, number][] = [
    [12.2, 1.2],
    [13.8, 3.4],
    [15.1, 0.4],
    [16.6, 2.8],
    [18.2, 1.0],
    [14.4, 5.5],
    [17.4, 5.2],
    [13.2, -1.6],
    [16.0, -2.2],
    [20.4, 3.6],
  ];
  dancers.forEach(([x, z], i) => {
    npcs.push({
      x,
      z,
      yaw: Math.random() * Math.PI * 2,
      kind: "club",
      seed: 20 + i,
      mode: "dance",
      speed: 0,
    });
  });
  npcs.push({
    x: 36.6,
    z: 1.2,
    yaw: Math.PI * 0.72,
    kind: "rapper",
    seed: 1,
    mode: "rap",
    speed: 0,
  });
  npcs.push({
    x: 37.4,
    z: 3.35,
    yaw: -Math.PI * 0.85,
    kind: "beard",
    seed: 2,
    mode: "idle",
    speed: 0,
  });
  const street: [number, number, number][] = [
    [-8.6, 30, 0],
    [-8.8, 16, 0.2],
    [-8.4, 4, -0.1],
    [5.4, 36, Math.PI],
  ];
  street.forEach(([x, z, yaw], i) => {
    npcs.push({
      x,
      z,
      yaw,
      kind: "street",
      seed: 40 + i,
      mode: "idle",
      speed: 0,
    });
  });

  return {
    player: {
      x: 0,
      z: 28,
      yaw: 0,
      speed: 0,
      inCar: true,
      carX: 0,
      carZ: 28,
      carYaw: 0,
    },
    npcs,
    chapter: 0,
    hold: 0,
    prompt: "",
    toast: "",
    toastT: 0,
    trauma: 0,
    ended: false,
    failed: false,
    time: 0,
    lead: "lead",
    score: 0,
    strikes: 0,
    night: 1,
    parkedClean: false,
    roomOwned: false,
  };
}

export function applyLead(sim: Sim, lead: LeadId) {
  sim.lead = lead;
}

export function resetSim(sim: Sim) {
  const fresh = createSim();
  Object.assign(sim, fresh);
}

export function blipOf(sim: Sim) {
  if (sim.ended) return null;
  if (sim.chapter === 0) return ZONES.curb;
  if (sim.chapter === 1) return ZONES.door;
  if (sim.chapter === 2) return ZONES.vip;
  return ZONES.standoff;
}

export function objectiveOf(sim: Sim) {
  if (sim.failed) return "Cut. Three strikes.";
  if (sim.ended) return sim.night === 2 ? "Both nights. The alley remembers." : "The night is yours.";
  if (sim.chapter === 2 && !sim.roomOwned) return "Take the floor before the alley.";
  return CHAPTERS[sim.chapter]?.line ?? "";
}

export function beginNight(sim: Sim, night: number) {
  const score = sim.score;
  const lead = sim.lead;
  const fresh = createSim();
  Object.assign(sim, fresh);
  sim.night = night;
  sim.score = score;
  sim.lead = lead;
}

export type SimEvent =
  | { type: "enter" }
  | { type: "exit" }
  | { type: "door" }
  | { type: "chapter" }
  | { type: "win" }
  | { type: "fail" }
  | { type: "step" };

function bust(sim: Sim, events: SimEvent[], line: string) {
  sim.strikes += 1;
  sim.score = Math.max(0, sim.score - 12);
  sim.toast = line;
  sim.toastT = 1.8;
  if (sim.strikes >= 3) {
    sim.failed = true;
    sim.ended = true;
    sim.toast = "Cut. Three strikes.";
    sim.toastT = 3;
    events.push({ type: "fail" });
  }
}

export function stepSim(sim: Sim, dt: number, actions: Actions, colliders: AABB[]): SimEvent[] {
  const events: SimEvent[] = [];
  sim.time += dt;
  sim.trauma = Math.max(0, sim.trauma - dt * 2.4);
  if (sim.toastT > 0) {
    sim.toastT -= dt;
    if (sim.toastT <= 0) sim.toast = "";
  }

  if (sim.ended || sim.failed) {
    sim.player.speed = lerp(sim.player.speed, 0, 1 - Math.exp(-6 * dt));
    sim.prompt = "";
    return events;
  }

  const p = sim.player;
  const steer = actions.steer;
  const throttle = actions.throttle;

  if (p.inCar) {
    const reverse = p.speed >= 0 ? 1 : -1;
    const speedFactor = clamp(Math.abs(p.speed) / TESLA.max, 0.32, 1);
    p.yaw = wrapPi(p.yaw + steer * TESLA.turn * speedFactor * reverse * dt);
    if (actions.handbrake) {
      p.speed = lerp(p.speed, 0, 1 - Math.exp(-8 * dt));
    } else if (throttle > 0) {
      p.speed = Math.min(TESLA.max, p.speed + TESLA.accel * (sim.lead === "lead" ? 1.16 : sim.lead === "quiet" ? 0.86 : 1) * throttle * dt);
    } else if (throttle < 0) {
      p.speed = Math.max(-TESLA.reverse, p.speed + TESLA.brake * throttle * dt);
    } else {
      p.speed = lerp(p.speed, 0, 1 - Math.exp(-1.8 * dt));
    }
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    let nx = p.x + fx * p.speed * dt;
    let nz = p.z + fz * p.speed * dt;
    const hit = resolveCircle(nx, nz, 1.35, colliders);
    if (Math.abs(hit.x - nx) > 0.01 || Math.abs(hit.z - nz) > 0.01) {
      const hard = Math.abs(p.speed) > 6;
      p.speed *= 0.35;
      sim.trauma = Math.min(1, sim.trauma + (hard ? 0.45 : 0.12));
      if (hard) bust(sim, events, sim.lead === "lead" ? "The car can take it. Once." : "Too hot. Ease the nose.");
    }
    p.x = hit.x;
    p.z = hit.z;
    p.carX = p.x;
    p.carZ = p.z;
    p.carYaw = p.yaw;
  } else {
    p.yaw = wrapPi(p.yaw + steer * WALK_TURN * dt);
    const walkMul = sim.lead === "voice" ? 1.18 : sim.lead === "quiet" ? 0.8 : 1;
    const want = throttle * (actions.sprint ? SPRINT_SPEED : WALK_SPEED) * walkMul;
    p.speed = lerp(p.speed, want, 1 - Math.exp(-10 * dt));
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const carBox: AABB = {
      minX: p.carX - 1.05,
      maxX: p.carX + 1.05,
      minZ: p.carZ - 2.25,
      maxZ: p.carZ + 2.25,
    };
    const hit = resolveCircle(p.x + fx * p.speed * dt, p.z + fz * p.speed * dt, 0.38, [...colliders, carBox]);
    p.x = hit.x;
    p.z = hit.z;
  }

  sim.prompt = "";

  if (p.inCar) {
    if (near(p.x, p.z, ZONES.curb) && Math.abs(p.speed) < 4) {
      sim.prompt = "Park · F to step out";
    }
    if (actions.enter && Math.abs(p.speed) < 5.5) {
      p.inCar = false;
      p.speed = 0;
      p.x += -Math.cos(p.yaw) * 1.7;
      p.z += Math.sin(p.yaw) * 1.7;
      const hit = resolveCircle(p.x, p.z, 0.4, colliders);
      p.x = hit.x;
      p.z = hit.z;
      events.push({ type: "exit" });
      if (sim.chapter === 0 && near(p.carX, p.carZ, ZONES.curb)) {
        sim.chapter = 1;
        const clean = Math.abs(p.speed) < 2.2;
        if (clean && !sim.parkedClean) {
          sim.parkedClean = true;
          const bonus = sim.lead === "lead" ? 30 : 18;
          sim.score += bonus;
          sim.toast = `Clean rope. +${bonus}`;
        } else {
          sim.toast = "Walk the rope.";
        }
        sim.toastT = 2.4;
        events.push({ type: "chapter" });
      }
    }
  } else {
    const dx = p.x - p.carX;
    const dz = p.z - p.carZ;
    if (dx * dx + dz * dz < 3.6 * 3.6) {
      sim.prompt = "F · Get in";
      if (actions.enter) {
        p.inCar = true;
        p.x = p.carX;
        p.z = p.carZ;
        p.yaw = p.carYaw;
        p.speed = 0;
        events.push({ type: "enter" });
      }
    }

    if (sim.chapter === 1 && near(p.x, p.z, ZONES.door)) {
      sim.prompt = "F · Enter Don Sterleone";
      if (actions.enter) {
        p.x = 9.4;
        p.z = 2;
        p.inCar = false;
        sim.chapter = 2;
        sim.toast = sim.lead === "voice" ? "The room knows the voice." : "Own the floor.";
        sim.toastT = 2.4;
        events.push({ type: "door" }, { type: "chapter" });
      }
    }

    if (sim.chapter === 2) {
      if (!sim.roomOwned && near(p.x, p.z, ZONES.vip)) {
        sim.prompt = "Hold Space · Take the floor";
        if (actions.handbrake || actions.fire) {
          const rate = sim.lead === "voice" ? 1.7 : 1;
          sim.hold = Math.min(1, sim.hold + (dt / 1.5) * rate);
          if (sim.hold >= 1) {
            sim.roomOwned = true;
            const bonus = sim.lead === "voice" ? 40 : 22;
            sim.score += bonus;
            sim.toast = `The floor answers. +${bonus}`;
            sim.toastT = 2.2;
            sim.hold = 0;
          }
        } else {
          sim.hold = Math.max(0, sim.hold - dt * 0.35);
        }
      } else if (inClub(p.x, p.z) && !sim.roomOwned) {
        sim.prompt = "Find the floor. Hold it.";
      }
      if (near(p.x, p.z, ZONES.back)) {
        if (!sim.roomOwned) {
          sim.prompt = "The floor first.";
        } else {
          sim.prompt = "F · After hours";
          if (actions.enter) {
            p.x = 27.2;
            p.z = 2;
            sim.chapter = 3;
            sim.hold = 0;
            sim.toast = sim.night === 2 ? "Second night. He does not blink." : sim.lead === "quiet" ? "The alley is yours." : "Face him.";
            sim.toastT = 2.4;
            events.push({ type: "door" }, { type: "chapter" });
          }
        }
      }
    }

    if (sim.chapter === 3 && near(p.x, p.z, ZONES.standoff)) {
      sim.prompt = sim.night === 2 ? "Hold Space — he does not blink" : "Hold Space — stand your ground";
      if (actions.handbrake || actions.fire) {
        const holdRate = sim.lead === "quiet" ? 1.55 : sim.lead === "voice" ? 1.05 : 1;
        const need = sim.night === 2 ? 2.6 : 1.7;
        sim.hold = Math.min(1, sim.hold + (dt / need) * holdRate);
        if (sim.hold >= 1) {
          sim.score += sim.night === 2 ? 50 : 30;
          sim.ended = true;
          sim.toast = "";
          events.push({ type: "win" });
        }
      } else if (sim.night === 2) {
        const before = sim.hold;
        sim.hold = Math.max(0, sim.hold - dt * 0.7);
        if (before > 0.15 && sim.hold <= 0) bust(sim, events, "You blinked.");
      } else {
        sim.hold = Math.max(0, sim.hold - dt * 0.45);
      }
    } else if (sim.chapter !== 2 || sim.roomOwned) {
      sim.hold = 0;
    }
  }

  if (sim.chapter === 0 && !p.inCar && near(p.x, p.z, ZONES.curb)) {
    sim.chapter = 1;
    events.push({ type: "chapter" });
  }
  if (sim.chapter === 1 && inClub(p.x, p.z)) {
    sim.chapter = 2;
    events.push({ type: "chapter" });
  }

  return events;
}
