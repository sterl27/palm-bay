import * as THREE from "three";
import { loadLive } from "./textures";

const mats = new Map<string, THREE.MeshStandardMaterial>();

function mat(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0],
) {
  const key = color.toString(16) + JSON.stringify(extra ?? {});
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, ...extra });
    mats.set(key, m);
  }
  return m;
}

function tag(mesh: THREE.Object3D, cast = true, receive = true) {
  mesh.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
  return mesh;
}

const GEO = {
  head: new THREE.SphereGeometry(0.142, 18, 14),
  neck: new THREE.CylinderGeometry(0.048, 0.058, 0.09, 10),
  torso: new THREE.CapsuleGeometry(0.168, 0.3, 5, 10),
  hips: new THREE.CapsuleGeometry(0.155, 0.1, 4, 10),
  upperArm: new THREE.CapsuleGeometry(0.048, 0.18, 4, 8),
  lowerArm: new THREE.CapsuleGeometry(0.042, 0.16, 4, 8),
  hand: new THREE.SphereGeometry(0.042, 8, 8),
  thigh: new THREE.CapsuleGeometry(0.07, 0.3, 4, 8),
  calf: new THREE.CapsuleGeometry(0.054, 0.28, 4, 8),
  shoe: new THREE.BoxGeometry(0.11, 0.07, 0.26),
  heel: new THREE.BoxGeometry(0.08, 0.12, 0.08),
  eye: new THREE.SphereGeometry(0.018, 8, 8),
  iris: new THREE.SphereGeometry(0.011, 8, 8),
  ear: new THREE.SphereGeometry(0.028, 8, 8),
};

const LIVE_H = 1.88;

const CARDS = {
  heroFront: { url: "/avatars/live/hero-front.png", aspect: 249 / 477 },
  heroBack: { url: "/avatars/live/hero-back.png", aspect: 219 / 365 },
  rapper: { url: "/avatars/live/rapper.png", aspect: 367 / 686 },
  beard: { url: "/avatars/live/beard.png", aspect: 213 / 578 },
  line: [
    { url: "/avatars/live/line-0.png", aspect: 242 / 862 },
    { url: "/avatars/live/line-1.png", aspect: 233 / 874 },
    { url: "/avatars/live/line-2.png", aspect: 226 / 829 },
    { url: "/avatars/live/line-3.png", aspect: 241 / 816 },
  ],
};

function makeCard(spec: { url: string; aspect: number }, name: string) {
  const w = LIVE_H * spec.aspect;
  const geo = new THREE.PlaneGeometry(w, LIVE_H, 8, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, -x * x * 0.42);
  }
  geo.computeVertexNormals();
  const tex = loadLive(spec.url);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.62,
      roughness: 0.68,
      metalness: 0,
      transparent: true,
      alphaTest: 0.32,
      depthWrite: true,
    }),
  );
  mesh.name = name;
  mesh.position.y = LIVE_H * 0.5;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makePortrait(kind: "hero" | "rapper" | "beard" | "club", seed = 0) {
  const g = new THREE.Group();
  g.userData.live = true;
  g.userData.kind = kind;
  if (kind === "hero") {
    g.add(makeCard(CARDS.heroFront, "front"));
    g.add(makeCard(CARDS.heroBack, "back"));
  } else if (kind === "rapper") {
    g.add(makeCard(CARDS.rapper, "front"));
  } else if (kind === "beard") {
    g.add(makeCard(CARDS.beard, "front"));
  } else {
    const card = makeCard(CARDS.line[Math.abs(seed) % CARDS.line.length]!, "front");
    g.add(card);
    g.scale.setScalar(0.94 + (Math.abs(seed) % 4) * 0.018);
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 14),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.name = "shadow";
  g.add(shadow);
  return g;
}

export type PersonKind = "hero" | "club" | "rapper" | "beard" | "street";

function makeCrowd(kind: "club" | "street", seed: number) {
  const g = new THREE.Group();
  const r = ((seed * 17) % 100) / 100;
  const skin = r > 0.55 ? 0xd4b08c : r > 0.3 ? 0xc49a72 : 0x6a4634;
  const shirt = kind === "club"
    ? ([0x121214, 0x1a1218, 0x0e0e12, 0x8a1828][seed % 4] as number)
    : ([0x8a1c28, 0x1c2430, 0x2a2a32, 0xeee6dc][seed % 4] as number);
  const hair = [0xf2e6c8, 0x1a1210, 0x4a2018, 0xc8c4c0, 0x2a1a10][seed % 5] as number;
  const skinM = mat(skin, { roughness: 0.62 });
  const shirtM = mat(shirt, { roughness: 0.55 });
  const scale = kind === "club" ? 0.95 + (seed % 5) * 0.012 : 0.98;
  g.scale.setScalar(scale);

  const torso = new THREE.Mesh(GEO.torso, shirtM);
  torso.position.y = 1.18;
  torso.name = "torso";
  g.add(torso);

  if (kind === "club") {
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.155, 0.62, 8), shirtM);
    dress.position.y = 0.96;
    g.add(dress);
    const heel = new THREE.Mesh(GEO.heel, mat(0x141416, { roughness: 0.4 }));
    heel.position.set(0.07, 0.06, 0.04);
    g.add(heel);
    const heel2 = heel.clone();
    heel2.position.x = -0.07;
    g.add(heel2);
  } else {
    const legs = new THREE.Mesh(GEO.hips, mat(0x1c2430, { roughness: 0.72 }));
    legs.position.y = 0.62;
    legs.scale.set(1, 2.4, 1);
    g.add(legs);
  }

  const head = new THREE.Mesh(GEO.head, skinM);
  head.position.y = 1.62;
  head.name = "head";
  g.add(head);
  const hairM = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6),
    mat(hair, { roughness: 0.48 }),
  );
  hairM.position.set(0, 1.68, -0.02);
  hairM.scale.set(1.15, 0.9, 1.1);
  g.add(hairM);

  for (const side of [-1, 1] as const) {
    const a = new THREE.Group();
    a.name = side < 0 ? "armL" : "armR";
    a.position.set(side * 0.24, 1.36, 0);
    const limb = new THREE.Mesh(GEO.upperArm, kind === "club" ? skinM : shirtM);
    limb.position.y = -0.18;
    limb.scale.set(1, 1.6, 1);
    a.add(limb);
    g.add(a);
  }

  g.userData.kind = kind;
  tag(g, false, true);
  return g;
}

export function makePerson(kind: PersonKind, seed = 0) {
  if (kind === "street") return makeCrowd("street", seed);
  return makePortrait(kind, seed);
}

export function makeTesla() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x07080c,
    roughness: 0.16,
    metalness: 0.9,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const chrome = mat(0xc8cdd4, { roughness: 0.2, metalness: 0.92 });
  const glass = mat(0x1a222c, {
    roughness: 0.06,
    metalness: 0.62,
    transparent: true,
    opacity: 0.48,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 4.58), paint);
  body.position.y = 0.6;
  g.add(body);

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.16, 4.2), paint);
  rocker.position.y = 0.34;
  g.add(rocker);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.28, 0.55), paint);
  nose.position.set(0, 0.52, -2.2);
  g.add(nose);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.46, 2.18), paint);
  cabin.position.set(0, 1.06, 0.12);
  g.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.42, 0.06), glass);
  windshield.position.set(0, 1.08, -0.94);
  windshield.rotation.x = -0.58;
  g.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.36, 0.06), glass);
  rearGlass.position.set(0, 1.06, 1.14);
  rearGlass.rotation.x = 0.48;
  g.add(rearGlass);

  for (const s of [-1, 1] as const) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 1.7), glass);
    sideGlass.position.set(s * 0.88, 1.06, 0.08);
    g.add(sideGlass);
  }

  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.025, 4.52), chrome);
  trim.position.y = 0.86;
  g.add(trim);

  function door(side: -1 | 1) {
    const d = new THREE.Group();
    d.name = side > 0 ? "doorR" : "doorL";
    d.position.set(side * 0.95, 0.7, -0.35);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 1.15), paint);
    panel.position.set(0, 0, 0.55);
    d.add(panel);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.16), chrome);
    handle.position.set(side * 0.05, 0.06, 0.72);
    d.add(handle);
    return d;
  }
  g.add(door(-1));
  g.add(door(1));

  const hl = mat(0xfff4d2, { emissive: 0xfff2c4, emissiveIntensity: 2.1 });
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 0.85 });
  for (const s of [-1, 1] as const) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.06), hl);
    h.position.set(s * 0.62, 0.6, -2.32);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.06), tl);
    t.position.set(s * 0.62, 0.62, 2.32);
    g.add(t);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.16), paint);
    mirror.position.set(s * 1.02, 0.98, -0.7);
    g.add(mirror);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = mat(0x111111, { roughness: 0.82 });
  const rimMat = mat(0xb8bec8, { roughness: 0.28, metalness: 0.8 });
  const hubs: [number, number, number][] = [
    [-0.88, 0.34, -1.42],
    [0.88, 0.34, -1.42],
    [-0.88, 0.34, 1.42],
    [0.88, 0.34, 1.42],
  ];
  hubs.forEach((p, i) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(p[0], p[1], p[2]);
    w.name = `wheel${i}`;
    g.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(w.position);
    g.add(rim);
  });

  g.userData.door = 0;
  tag(g, true, true);
  return g;
}

export function makeSedan(color: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.5, 4.3),
    mat(color, { roughness: 0.32, metalness: 0.5 }),
  );
  body.position.y = 0.6;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.46, 2),
    mat(0x15181e, { roughness: 0.28, metalness: 0.25 }),
  );
  cabin.position.set(0, 1.04, 0.1);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = mat(0x111111, { roughness: 0.9 });
  for (const p of [
    [-0.82, 0.32, -1.3],
    [0.82, 0.32, -1.3],
    [-0.82, 0.32, 1.3],
    [0.82, 0.32, 1.3],
  ] as [number, number, number][]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(p[0], p[1], p[2]);
    g.add(w);
  }
  tag(g, false, true);
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 5.2, 8),
    mat(0x2a2c30, { roughness: 0.55, metalness: 0.45 }),
  );
  pole.position.y = 2.6;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    mat(0xffe6b0, { emissive: 0xffd088, emissiveIntensity: 2.2 }),
  );
  head.position.y = 5.15;
  g.add(head);
  return g;
}

export function makeDumpster() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 0.9),
    mat(0x2a4a32, { roughness: 0.7, metalness: 0.25 }),
  );
  body.position.y = 0.55;
  g.add(body);
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.08, 0.94),
    mat(0x1e3826, { roughness: 0.55, metalness: 0.3 }),
  );
  lid.position.y = 1.14;
  g.add(lid);
  tag(g, true, true);
  return g;
}

export function makePost() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.95, 10),
    mat(0xc8cdd4, { roughness: 0.22, metalness: 0.88 }),
  );
  pole.position.y = 0.48;
  g.add(pole);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 8),
    mat(0xd8dde4, { roughness: 0.18, metalness: 0.92 }),
  );
  ball.position.y = 0.98;
  g.add(ball);
  return g;
}

export function animatePerson(
  mesh: THREE.Group,
  t: number,
  speed: number,
  mode: "walk" | "dance" | "idle" | "rap" | "own",
) {
  if (mesh.userData.live) {
    const bob =
      mode === "walk"
        ? Math.abs(Math.sin(t * 8)) * 0.04
        : mode === "dance"
          ? Math.abs(Math.sin(t * 5 + mesh.id)) * 0.055
          : mode === "rap"
            ? Math.abs(Math.sin(t * 7)) * 0.025
            : mode === "own"
              ? Math.sin(t * 2.2) * 0.012
              : 0;
    mesh.position.y = bob;
    const sway =
      mode === "walk"
        ? Math.sin(t * 8) * 0.05
        : mode === "dance"
          ? Math.sin(t * 3.2) * 0.09
          : mode === "rap"
            ? Math.sin(t * 6) * 0.07
            : 0;
    const front = mesh.getObjectByName("front");
    const back = mesh.getObjectByName("back");
    if (front) front.rotation.z = sway;
    if (back) back.rotation.z = sway;
    return;
  }
  const swing = mode === "walk" ? Math.sin(t * 8) * Math.min(0.7, 0.2 + speed * 0.08) : 0;
  const armL = mesh.getObjectByName("armL");
  const armR = mesh.getObjectByName("armR");
  const legL = mesh.getObjectByName("legL");
  const legR = mesh.getObjectByName("legR");
  const torso = mesh.getObjectByName("torso");
  const head = mesh.getObjectByName("head");

  if (mode === "own") {
    mesh.position.y = Math.sin(t * 2) * 0.012;
    if (armL) {
      armL.rotation.x = -1.12;
      armL.rotation.z = 0.78;
    }
    if (armR) {
      armR.rotation.x = -1.12;
      armR.rotation.z = -0.78;
    }
    if (torso) torso.rotation.y = 0;
    if (head) head.rotation.x = 0.18;
    if (legL) legL.rotation.x = 0;
    if (legR) legR.rotation.x = 0;
    return;
  }

  if (mode === "dance") {
    const bob = Math.abs(Math.sin(t * 5 + mesh.id)) * 0.06;
    mesh.position.y = bob;
    if (armL) {
      armL.rotation.x = -1.2 + Math.sin(t * 6) * 0.4;
      armL.rotation.z = 0.15;
    }
    if (armR) {
      armR.rotation.x = -1.1 + Math.cos(t * 6) * 0.4;
      armR.rotation.z = -0.15;
    }
    if (torso) torso.rotation.y = Math.sin(t * 3) * 0.12;
    if (head) head.rotation.x = 0;
    return;
  }

  if (mode === "rap") {
    if (armL) {
      armL.rotation.x = -0.85 + Math.sin(t * 8) * 0.55;
      armL.rotation.z = 0.45;
    }
    if (armR) {
      armR.rotation.x = -0.45 + Math.cos(t * 7) * 0.38;
      armR.rotation.z = -0.28;
    }
    if (torso) torso.rotation.y = Math.sin(t * 4) * 0.1;
    if (head) head.rotation.x = -0.05;
    mesh.position.y = Math.abs(Math.sin(t * 8)) * 0.02;
    return;
  }

  if (mode === "walk") {
    mesh.position.y = Math.abs(Math.sin(t * 8)) * 0.035;
  } else {
    mesh.position.y = 0;
  }
  if (armL) {
    armL.rotation.x = mode === "idle" ? Math.sin(t * 1.4) * 0.05 : -swing;
    armL.rotation.z = 0.06;
  }
  if (armR) {
    armR.rotation.x = mode === "idle" ? Math.cos(t * 1.4) * 0.05 : swing;
    armR.rotation.z = -0.06;
  }
  if (legL) legL.rotation.x = swing * 0.95;
  if (legR) legR.rotation.x = -swing * 0.95;
  if (torso) torso.rotation.y = 0;
  if (head) head.rotation.x = 0;
}
