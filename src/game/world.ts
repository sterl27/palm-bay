import * as THREE from "three";
import { BOUNDS, mulberry32 } from "./constants";
import {
  makeBrick,
  makeCarpet,
  makeDanceFloor,
  makeFacade,
  makeMarble,
  makeMoltSign,
  makeNeonWord,
  makePaving,
  makeSkyline,
  makeSteam,
  makeWetAsphalt,
} from "./textures";
import { lightCone, lightPool, makeDumpster, makeLamp, makePost, makeSedan } from "./meshes";

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export type NightWorld = {
  group: THREE.Group;
  colliders: AABB[];
  rainVolume: { minX: number; maxX: number; minZ: number; maxZ: number };
  clubLights: THREE.PointLight[];
  update: (t: number, dt: number, px: number, pz: number) => void;
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

/** Ground plane whose UVs repeat every `tile` metres, so textures never stretch. */
function groundGeo(w: number, d: number, tile: number) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
  return geo;
}

export function buildWorld(scene: THREE.Scene): NightWorld {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const disposables: THREE.Texture[] = [];
  const rand = mulberry32(21);

  const wet = makeWetAsphalt();
  const paving = makePaving();
  const steamTex = makeSteam();
  const skylineTex = makeSkyline();
  const danceTex = makeDanceFloor();
  const brick = makeBrick();
  const carpet = makeCarpet();
  const marble = makeMarble();
  const sign = makeMoltSign();
  disposables.push(wet.map, wet.roughnessMap, wet.normalMap, paving, steamTex, skylineTex, danceTex, brick, carpet, marble, sign);
  const animated: ((t: number, dt: number, px: number, pz: number) => void)[] = [];

  // Rain-soaked asphalt: puddles come from the roughness map, so they pick up
  // neon and headlights as real reflections instead of a flat sheen.
  const wetMat = new THREE.MeshStandardMaterial({
    map: wet.map,
    roughnessMap: wet.roughnessMap,
    normalMap: wet.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 1,
    metalness: 0,
    color: 0xc4ccd8,
    envMapIntensity: 0.9,
  });
  // everything past the block: dark ground so the horizon never shows through
  const beyond = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x08080b, roughness: 0.95, metalness: 0 }),
  );
  beyond.rotation.x = -Math.PI / 2;
  beyond.position.set(12, -0.03, 12);
  group.add(beyond);
  const road = new THREE.Mesh(groundGeo(14, 78, 7), wetMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 12);
  road.receiveShadow = true;
  group.add(road);

  const walkMat = new THREE.MeshStandardMaterial({
    map: paving,
    roughness: 0.5,
    metalness: 0,
    color: 0xb4b8c2,
    envMapIntensity: 0.7,
  });
  const walkL = new THREE.Mesh(groundGeo(4.4, 78, 2.2), walkMat);
  walkL.rotation.x = -Math.PI / 2;
  walkL.position.set(-9.2, 0.02, 12);
  walkL.receiveShadow = true;
  group.add(walkL);
  const walkR = walkL.clone();
  walkR.position.x = 6.4;
  group.add(walkR);
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x55585f, roughness: 0.6 });
  for (const x of [-7.0, 4.2]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 78), curbMat);
    curb.position.set(x, 0.025, 12);
    curb.receiveShadow = true;
    group.add(curb);
  }

  const dashMat = new THREE.MeshBasicMaterial({ color: 0x8f8c78 });
  for (let z = -20; z < 46; z += 4.2) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.1), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.03, z);
    group.add(dash);
  }

  function building(x: number, z: number, w: number, d: number, h: number, seed: number) {
    const tex = makeFacade(seed);
    disposables.push(tex.map, tex.emissiveMap);
    // one facade tile is ~10 m wide and ~20 m tall
    const face = new THREE.MeshStandardMaterial({
      map: tex.map,
      emissiveMap: tex.emissiveMap,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
      roughness: 0.7,
      metalness: 0.05,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 });
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv!;
    // keep the shopfront row at street level: v runs from the bottom of the tile
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * Math.min(1, h / 20));
    const mesh = new THREE.Mesh(geo, [face, face, roofMat, roofMat, face, face]);
    mesh.position.set(x, h / 2, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), roofMat);
    cap.position.set(x, h + 0.25, z);
    group.add(cap);
    const tank = seed % 3 === 0;
    if (tank) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12), roofMat);
      t.position.set(x + w * 0.2, h + 1.9, z - d * 0.15);
      group.add(t);
    } else {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), roofMat);
      unit.position.set(x - w * 0.15, h + 1.1, z + d * 0.1);
      group.add(unit);
    }
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
  // the block that closes the alley to the north used to be an invisible wall
  building(38, 18, 16, 8, 11, 57);

  const clubW = 18;
  const clubD = 20;
  const clubX = 17;
  const clubZ = 2;
  const wallH = 8.4;
  const wallT = 0.55;
  const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.7, color: 0x8a8078, envMapIntensity: 0.35 });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(clubW - 0.4, clubD - 0.4),
    new THREE.MeshStandardMaterial({ map: marble, roughness: 0.16, metalness: 0.1, envMapIntensity: 0.9 }),
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

  for (const x of [8.25, 25.75]) {
    const lintelWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH - 3.3, 5.3), brickMat);
    lintelWall.position.set(x, 3.3 + (wallH - 3.3) / 2, 2);
    group.add(lintelWall);
  }

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
      emissiveMap: sign,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
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
    envMapIntensity: 0.3,
  });
  for (const z of [0.55, 3.45]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 1.35), doorGlass);
    pane.position.set(8.22, 1.35, z);
    group.add(pane);
  }

  const backDoor = new THREE.Group();
  backDoor.name = "backDoor";
  backDoor.position.set(25.78, 0, 2);
  const jamb = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.4, metalness: 0.45 });
  const leftJ = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.16), jamb);
  leftJ.position.set(0, 1.6, -1.15);
  backDoor.add(leftJ);
  const rightJ = leftJ.clone();
  rightJ.position.z = 1.15;
  backDoor.add(rightJ);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 2.46), jamb);
  lintel.position.set(0, 3.12, 0);
  backDoor.add(lintel);
  const hinge = new THREE.Group();
  hinge.name = "backSlab";
  hinge.position.set(0.02, 0, -1.02);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 2.75, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x4a2c28, roughness: 0.38, metalness: 0.5 }),
  );
  slab.position.set(0, 1.42, 0.95);
  hinge.add(slab);
  const pushBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.07, 1.15),
    new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.22, metalness: 0.88 }),
  );
  pushBar.position.set(0.06, 1.25, 0.95);
  hinge.add(pushBar);
  const exitTex = makeNeonWord("EXIT", "#ff3344");
  disposables.push(exitTex);
  for (const side of [-1, 1]) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.22),
      new THREE.MeshStandardMaterial({ map: exitTex, emissiveMap: exitTex, emissive: 0xffffff, emissiveIntensity: 2.4, side: THREE.DoubleSide }),
    );
    sign.position.set(side * 0.05, 2.45, 0.95);
    sign.rotation.y = side > 0 ? 0 : Math.PI;
    hinge.add(sign);
  }
  backDoor.add(hinge);
  group.add(backDoor);
  const exitLight = new THREE.PointLight(0xff3344, 14, 14, 2);
  exitLight.position.set(24.6, 2.8, 2);
  group.add(exitLight);
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x6a1420, roughness: 0.65, emissive: 0x3a0a12, emissiveIntensity: 0.35 }),
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(22.4, 0.06, 2);
  group.add(runner);
  const wallSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.36),
    new THREE.MeshStandardMaterial({ map: exitTex, emissiveMap: exitTex, emissive: 0xffffff, emissiveIntensity: 2.6, side: THREE.DoubleSide }),
  );
  wallSign.position.set(25.55, 3.55, 2);
  wallSign.rotation.y = -Math.PI / 2;
  group.add(wallSign);

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
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 2.4 }),
    );
    p.position.set(n.x, n.y, n.z);
    p.rotation.y = Math.PI / 2;
    group.add(p);
  }

  const lampHeads: THREE.Vector3[] = [];
  for (const z of [40, 26, 12, -2, -16]) {
    const a = makeLamp(1.7);
    a.position.set(-7.4, 0, z);
    group.add(a);
    lampHeads.push(new THREE.Vector3(-5.7, 5.2, z));
    // the club frontage is lit by its own sign; skip the pole on the carpet
    if (z === -2) continue;
    const b = makeLamp(-1.7);
    b.position.set(z < 12 ? 7.6 : 5.6, 0, z + (z === 12 ? 2 : 0));
    group.add(b);
    lampHeads.push(new THREE.Vector3(b.position.x - 1.7, 5.2, b.position.z));
  }
  // The cones and pools are painted light. Three real lights hop between the
  // lamps nearest the player so cars and people under them are actually lit,
  // without paying for nine lights across the whole street.
  const lampLights = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xffc98a, 0, 15, 1.7);
    group.add(l);
    return l;
  });
  const lampOrder = lampHeads.map((_, i) => i);
  animated.push((_t, dt, px, pz) => {
    lampOrder.sort((i, j) => {
      const a = lampHeads[i]!;
      const b = lampHeads[j]!;
      return (a.x - px) ** 2 + (a.z - pz) ** 2 - ((b.x - px) ** 2 + (b.z - pz) ** 2);
    });
    lampLights.forEach((l, k) => {
      const head = lampHeads[lampOrder[k]!]!;
      const d = Math.hypot(head.x - px, head.z - pz);
      const want = 46 * Math.max(0, 1 - d / 20);
      if (l.position.distanceToSquared(head) > 0.01) {
        // hand-off: fade out, move while dark, fade back in
        l.intensity -= l.intensity * Math.min(1, dt * 10);
        if (l.intensity < 0.6) l.position.copy(head);
      } else {
        l.intensity += (want - l.intensity) * Math.min(1, dt * 5);
      }
    });
  });

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

  const alley = new THREE.Mesh(groundGeo(20, 28, 7), wetMat);
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

  // ---- alley dressing: back wall, a lamp slung between the buildings, steam
  const backWallMat = brickMat.clone();
  backWallMat.color.set(0x4a4442);
  backWallMat.envMapIntensity = 0.15;
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.5, 26), backWallMat);
  backWall.position.set(45.7, 3.25, 1);
  backWall.receiveShadow = true;
  group.add(backWall);
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 25, 4),
    new THREE.MeshBasicMaterial({ color: 0x08080a }),
  );
  wire.rotation.x = Math.PI / 2;
  wire.position.set(35, 5.75, 1.5);
  group.add(wire);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.26, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1b2420, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
  );
  shade.position.set(35, 5.6, 2);
  group.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xdcecff, emissive: 0xbcd8ff, emissiveIntensity: 6 }),
  );
  bulb.position.set(35, 5.46, 2);
  group.add(bulb);
  const alleyCone = lightCone(3.4, 5.4, 0xa8c8ff, 0.1);
  alleyCone.position.set(35, 5.46, 2);
  group.add(alleyCone);
  const alleyPool = lightPool(11, 0x8fb4ee, 0.22);
  alleyPool.position.set(35, 0.03, 2);
  group.add(alleyPool);

  const steamMat = new THREE.SpriteMaterial({
    map: steamTex,
    color: 0x9fb6d2,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
  });
  const puffs: { m: THREE.Sprite; x: number; z: number; age: number; life: number; drift: number }[] = [];
  const vents: [number, number][] = [
    [31.2, -5.5],
    [39.5, 6.2],
    [36.8, 2.4],
    [33.5, 9.5],
  ];
  vents.forEach(([x, z], v) => {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Sprite(steamMat.clone());
      m.renderOrder = 4;
      group.add(m);
      puffs.push({ m, x, z, age: (i / 5) * 6 + v, life: 6 + rand() * 2, drift: rand() * Math.PI * 2 });
    }
  });
  animated.push((t, dt) => {
    for (const p of puffs) {
      p.age += dt;
      if (p.age > p.life) p.age -= p.life;
      const k = p.age / p.life;
      const size = 1.2 + k * 3.6;
      p.m.scale.set(size, size * 0.8, 1);
      p.m.position.set(
        p.x + Math.sin(p.drift + t * 0.3) * 0.5 * k + k * 0.8,
        0.3 + k * 2.6,
        p.z + Math.cos(p.drift + t * 0.24) * 0.5 * k,
      );
      p.m.material.opacity = Math.sin(k * Math.PI) * 0.34;
      p.m.material.rotation = p.drift + k * 0.8;
    }
  });

  // ---- club floor: LED tiles and moving beams over the dancers
  const dance = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 9.6),
    new THREE.MeshStandardMaterial({
      map: danceTex,
      emissiveMap: danceTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
      roughness: 0.12,
      metalness: 0,
    }),
  );
  dance.rotation.x = -Math.PI / 2;
  dance.position.set(15.6, 0.055, 2);
  dance.receiveShadow = true;
  group.add(dance);
  const truss = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.14, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.4, metalness: 0.8 }),
  );
  truss.position.set(15.6, 7.2, 2);
  group.add(truss);
  const truss2 = truss.clone();
  truss2.rotation.y = Math.PI / 2;
  group.add(truss2);
  const beamColors = [0xff4d7a, 0x6ec4e8, 0xf0c070, 0xb060ff];
  const beams = beamColors.map((c, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(15.6 + (i % 2 ? 3.6 : -3.6), 7.1, 2 + (i < 2 ? 3.2 : -3.2));
    const cone = lightCone(1.25, 7.4, c, 0.11);
    pivot.add(cone);
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0x101014, emissive: c, emissiveIntensity: 1.6 }),
    );
    pivot.add(can);
    group.add(pivot);
    return pivot;
  });
  animated.push((t) => {
    beams.forEach((b, i) => {
      b.rotation.x = Math.sin(t * 0.9 + i * 1.7) * 0.42;
      b.rotation.z = Math.cos(t * 0.7 + i * 2.3) * 0.42;
    });
    (dance.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.32 + Math.abs(Math.sin(t * 4.2)) * 0.3;
  });
  // back-lit bottle shelf behind the bar
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 1.5, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a0a10, emissive: 0xff5a2a, emissiveIntensity: 0.9, roughness: 0.3 }),
  );
  shelf.position.set(16, 1.95, -7.3);
  group.add(shelf);
  for (let i = 0; i < 22; i++) {
    const hgt = 0.26 + rand() * 0.16;
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, hgt, 8),
      new THREE.MeshStandardMaterial({
        color: [0x2a5a3a, 0x6a3a1a, 0xd8d8e0, 0x1a2a5a][i % 4],
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
    );
    bottle.position.set(13 + (i % 11) * 0.6, (i < 11 ? 1.5 : 2.2) + hgt / 2, -7.16);
    group.add(bottle);
  }

  // ---- far city: a lit silhouette ring behind the fog
  const skyline = new THREE.Mesh(
    new THREE.CylinderGeometry(170, 170, 34, 48, 1, true),
    new THREE.MeshBasicMaterial({
      map: skylineTex,
      color: 0x8a8498,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  skylineTex.repeat.set(3, 1);
  skyline.position.set(12, 16, 12);
  skyline.renderOrder = -1;
  group.add(skyline);

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
    update(t, dt, px, pz) {
      for (const fn of animated) fn(t, dt, px, pz);
    },
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
