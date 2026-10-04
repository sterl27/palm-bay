import * as THREE from "three";
import { BOUNDS, mulberry32 } from "./constants";
import {
  makeAsphalt,
  makeBrick,
  makeCarpet,
  makeFacade,
  makeMarble,
  makeMoltSign,
  makeNeonWord,
} from "./textures";
import { makeDumpster, makeLamp, makePost, makeSedan } from "./meshes";

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export type NightWorld = {
  group: THREE.Group;
  colliders: AABB[];
  rainVolume: { minX: number; maxX: number; minZ: number; maxZ: number };
  clubLights: THREE.PointLight[];
  dispose: () => void;
};

function addBox(list: AABB[], x: number, z: number, sx: number, sz: number) {
  list.push({
    minX: x - sx / 2,
    maxX: x + sx / 2,
    minZ: z - sz / 2,
    maxZ: z + sz / 2,
  });
}

export function resolveCircle(x: number, z: number, r: number, boxes: AABB[]) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]!;
    const cx = x < b.minX ? b.minX : x > b.maxX ? b.maxX : x;
    const cz = z < b.minZ ? b.minZ : z > b.maxZ ? b.maxZ : z;
    let dx = x - cx;
    let dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-8) {
        const left = x - b.minX;
        const right = b.maxX - x;
        const up = z - b.minZ;
        const down = b.maxZ - z;
        const m = Math.min(left, right, up, down);
        if (m === left) x = b.minX - r;
        else if (m === right) x = b.maxX + r;
        else if (m === up) z = b.minZ - r;
        else z = b.maxZ + r;
      } else {
        const d = Math.sqrt(d2);
        const k = (r - d) / d;
        x += dx * k;
        z += dz * k;
      }
    }
  }
  x = Math.max(BOUNDS.minX + r, Math.min(BOUNDS.maxX - r, x));
  z = Math.max(BOUNDS.minZ + r, Math.min(BOUNDS.maxZ - r, z));
  return { x, z };
}

export function buildWorld(scene: THREE.Scene): NightWorld {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const disposables: THREE.Texture[] = [];
  const rand = mulberry32(21);

  const asphalt = makeAsphalt();
  const brick = makeBrick();
  const carpet = makeCarpet();
  const marble = makeMarble();
  const sign = makeMoltSign();
  disposables.push(asphalt, brick, carpet, marble, sign);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 78),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.22,
      metalness: 0.55,
      color: 0x9aa4b0,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 12);
  road.receiveShadow = true;
  group.add(road);

  const walkL = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 78),
    new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.7 }),
  );
  walkL.rotation.x = -Math.PI / 2;
  walkL.position.set(-9.2, 0.02, 12);
  group.add(walkL);
  const walkR = walkL.clone();
  walkR.position.x = 6.4;
  group.add(walkR);

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xc8c4a8 });
  for (let z = -20; z < 46; z += 4.2) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.1), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.03, z);
    group.add(dash);
  }

  function building(x: number, z: number, w: number, d: number, h: number, seed: number) {
    const tex = makeFacade(seed);
    disposables.push(tex);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.08 }),
    );
    mesh.position.set(x, h / 2, z);
    group.add(mesh);
    addBox(colliders, x, z, w, d);
  }

  const lefts = [
    [-14.5, 38, 9, 10, 14],
    [-14.8, 26, 9.2, 10, 18],
    [-14.2, 14, 8.6, 10, 12],
    [-14.6, 2, 9, 10, 16],
    [-14.4, -10, 8.8, 10, 11],
    [-14.8, -20, 9.2, 8, 15],
  ];
  lefts.forEach((b, i) => building(b[0]!, b[1]!, b[2]!, b[3]!, b[4]!, 11 + i * 3));

  building(11.4, 38, 8.2, 10, 14, 40);
  building(11.2, 26, 7.8, 9, 12, 44);
  building(20, 38, 12, 10, 10, 48);
  building(38, -16, 12, 10, 9, 52);

  const clubW = 18;
  const clubD = 20;
  const clubX = 17;
  const clubZ = 2;
  const wallH = 8.4;
  const wallT = 0.55;
  const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.7, color: 0x8a8078 });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(clubW - 0.4, clubD - 0.4),
    new THREE.MeshStandardMaterial({ map: marble, roughness: 0.28, metalness: 0.35 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(clubX, 0.04, clubZ);
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(clubW, clubD),
    new THREE.MeshStandardMaterial({ color: 0x0c0a10, roughness: 0.9 }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(clubX, wallH, clubZ);
  group.add(ceil);

  function wall(x: number, z: number, w: number, d: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), brickMat);
    m.position.set(x, wallH / 2, z);
    group.add(m);
    addBox(colliders, x, z, w, d);
  }

  wall(clubX, clubZ + clubD / 2 - wallT / 2, clubW, wallT);
  wall(clubX, clubZ - clubD / 2 + wallT / 2, clubW, wallT);
  wall(8.25, -4.2, wallT, 7.2);
  wall(8.25, 8.2, wallT, 7.2);
  wall(25.75, -4.2, wallT, 7.2);
  wall(25.75, 8.2, wallT, 7.2);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.12, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x8a1824, roughness: 0.55 }),
  );
  awning.position.set(7.4, 3.35, 2);
  awning.rotation.z = -0.12;
  group.add(awning);

  const signPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.85),
    new THREE.MeshStandardMaterial({
      map: sign,
      emissive: 0xff4d7a,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    }),
  );
  signPlane.position.set(8.55, 6.4, 2);
  signPlane.rotation.y = -Math.PI / 2;
  group.add(signPlane);

  const sign2 = signPlane.clone();
  sign2.position.set(17, 6.6, -7.72);
  sign2.rotation.y = 0;
  group.add(sign2);

  const doorGlass = new THREE.MeshStandardMaterial({
    color: 0xa8c4e8,
    roughness: 0.08,
    metalness: 0.55,
    transparent: true,
    opacity: 0.22,
  });
  for (const z of [0.55, 3.45]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 1.35), doorGlass);
    pane.position.set(8.22, 1.35, z);
    group.add(pane);
  }

  const backDoor = new THREE.Group();
  backDoor.name = "backDoor";
  backDoor.position.set(25.78, 0, 0.42);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 3.15, 2.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.45, metalness: 0.4 }),
  );
  frame.position.set(0, 1.55, 1.58);
  backDoor.add(frame);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.7, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x3a2420, roughness: 0.4, metalness: 0.55 }),
  );
  slab.name = "backSlab";
  slab.position.set(0.02, 1.4, 0.7);
  backDoor.add(slab);
  const pushBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.25, metalness: 0.85 }),
  );
  pushBar.position.set(0.08, 1.35, 0.85);
  backDoor.add(pushBar);
  const exit = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xff2a3a, emissive: 0xff1a28, emissiveIntensity: 1.4 }),
  );
  exit.position.set(0.1, 2.95, 1.58);
  backDoor.add(exit);
  group.add(backDoor);
  const exitLight = new THREE.PointLight(0xff3344, 4, 6, 2);
  exitLight.position.set(26.3, 2.7, 2);
  group.add(exitLight);

  const carpetMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 2.4),
    new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.7 }),
  );
  carpetMesh.rotation.x = -Math.PI / 2;
  carpetMesh.position.set(4.4, 0.05, 2);
  carpetMesh.receiveShadow = true;
  group.add(carpetMesh);

  function ropeLine(x0: number, z0: number, x1: number, z1: number, n: number) {
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7a1420, roughness: 0.55 });
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const post = makePost();
      post.position.set(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t);
      group.add(post);
    }
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), ropeMat);
    rope.position.set((x0 + x1) / 2, 0.92, (z0 + z1) / 2);
    rope.rotation.z = Math.PI / 2;
    rope.rotation.y = Math.atan2(dz, dx);
    group.add(rope);
  }
  ropeLine(3.2, 3.35, 8.0, 3.35, 5);
  ropeLine(3.2, 0.65, 8.0, 0.65, 5);
  ropeLine(7.9, 3.5, 7.9, 11.4, 6);
  ropeLine(7.9, -7.4, 7.9, 0.5, 6);

  const neonWords = [
    { word: "BAR", color: "#7ec8e0", x: -9.9, z: 14, y: 4.2 },
    { word: "LATE", color: "#ff6b8a", x: -9.9, z: 26, y: 5.1 },
    { word: "OPEN", color: "#f0c070", x: -9.9, z: 2, y: 3.8 },
  ];
  for (const n of neonWords) {
    const tex = makeNeonWord(n.word, n.color);
    disposables.push(tex);
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.7),
      new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(n.color), emissiveIntensity: 0.7 }),
    );
    p.position.set(n.x, n.y, n.z);
    p.rotation.y = Math.PI / 2;
    group.add(p);
  }

  for (const z of [40, 26, 12, -2, -16]) {
    const a = makeLamp();
    a.position.set(-7.2, 0, z);
    group.add(a);
    const b = makeLamp();
    b.position.set(5.6, 0, z);
    group.add(b);
  }

  const parked = [
    { x: -5.6, z: 20, yaw: 0, c: 0x1c2430 },
    { x: -5.5, z: 8, yaw: 0.02, c: 0x8a1824 },
    { x: 5.4, z: 40, yaw: Math.PI, c: 0x2a3340 },
    { x: 36.4, z: -4.5, yaw: 0.4, c: 0x1a3a6a },
  ];
  for (const p of parked) {
    const car = makeSedan(p.c);
    car.position.set(p.x, 0, p.z);
    car.rotation.y = p.yaw;
    group.add(car);
    addBox(colliders, p.x, p.z, 2.1, 4.4);
  }

  const alley = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 28),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.18,
      metalness: 0.62,
      color: 0x8892a0,
    }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(35, 0.01, 1);
  alley.receiveShadow = true;
  group.add(alley);

  const dumpA = makeDumpster();
  dumpA.position.set(30.5, 0, -7.4);
  group.add(dumpA);
  addBox(colliders, 30.5, -7.4, 1.8, 1.1);
  const dumpB = makeDumpster();
  dumpB.position.set(41.2, 0, 8.6);
  dumpB.rotation.y = 0.4;
  group.add(dumpB);
  addBox(colliders, 41.2, 8.6, 1.8, 1.1);

  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 8.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2428, roughness: 0.5, metalness: 0.2 }),
    );
    col.position.set(12 + (i % 2) * 8, 4.1, -3 + Math.floor(i / 2) * 10);
    group.add(col);
    addBox(colliders, col.position.x, col.position.z, 0.6, 0.6);
  }

  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1a1218, roughness: 0.5 }),
  );
  booth.position.set(19.6, 0.55, 8.6);
  group.add(booth);
  addBox(colliders, 19.6, 8.6, 2.4, 1.2);
  const decks = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.12, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x3a1020, emissiveIntensity: 0.4 }),
  );
  decks.position.set(19.6, 1.16, 8.6);
  group.add(decks);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 1.05, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 0.4, metalness: 0.15 }),
  );
  bar.position.set(16, 0.52, -5.6);
  group.add(bar);
  addBox(colliders, 16, -5.6, 7.2, 1.1);

  addBox(colliders, -22, 12, 1.2, 80);
  addBox(colliders, 46, 12, 1.2, 80);
  addBox(colliders, 8, 48, 60, 1.2);
  addBox(colliders, 8, -24, 60, 1.2);
  addBox(colliders, 38, 18, 16, 8);

  for (let i = 0; i < 18; i++) {
    const y = 1.6 + rand() * 5;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0xff6b8a : i % 3 === 1 ? 0x7ec8e0 : 0xf0c070,
        emissive: i % 3 === 0 ? 0xff4d7a : i % 3 === 1 ? 0x5aa8c8 : 0xe0a050,
        emissiveIntensity: 1.4,
      }),
    );
    bulb.position.set(11 + rand() * 12, y, -5 + rand() * 14);
    group.add(bulb);
  }

  const clubPink = new THREE.PointLight(0xff4d7a, 20, 22, 2);
  clubPink.position.set(12.5, 4.2, 2);
  group.add(clubPink);
  const clubCyan = new THREE.PointLight(0x6ec4e8, 14, 18, 2);
  clubCyan.position.set(21, 4.4, 5);
  group.add(clubCyan);
  const alleyLamp = new THREE.PointLight(0xa8c4e8, 10, 18, 2);
  alleyLamp.position.set(35, 5.2, 2);
  group.add(alleyLamp);
  const streetFill = new THREE.PointLight(0xff6b8a, 12, 28, 1.8);
  streetFill.position.set(8.4, 5.5, 2);
  group.add(streetFill);

  scene.add(group);

  return {
    group,
    colliders,
    rainVolume: { minX: -22, maxX: 46, minZ: -24, maxZ: 48 },
    clubLights: [clubPink, clubCyan],
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      for (const d of disposables) d.dispose();
    },
  };
}
