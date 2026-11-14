import * as THREE from "three";
import { loadLive, makeGlow } from "./textures";

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
    if (m.isMesh && !m.userData.noShadow) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
  return mesh;
}

let glowTex: THREE.Texture | null = null;
function glow() {
  glowTex ??= makeGlow();
  return glowTex;
}

/** Soft dark pool that grounds a figure or a car on the wet street. */
function contactShadow(w: number, d: number, opacity: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: glow(),
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.022;
  m.renderOrder = 1;
  m.userData.noShadow = true;
  m.name = "shadow";
  return m;
}

/* ------------------------------------------------------------------ */
/* People — live-action cut-outs on gently curved cards                */
/* ------------------------------------------------------------------ */

type CardSpec = { url: string; aspect: number; height: number };

const CARDS = {
  heroFront: { url: "/avatars/live/hero-front.png", aspect: 414 / 1100, height: 1.84 },
  heroBack: { url: "/avatars/live/hero-back.png", aspect: 373 / 1100, height: 1.84 },
  rapper: { url: "/avatars/live/rapper.png", aspect: 918 / 1500, height: 1.8 },
  beard: { url: "/avatars/live/beard.png", aspect: 373 / 1500, height: 1.88 },
  line: [
    { url: "/avatars/live/line-0.png", aspect: 458 / 1699, height: 1.76 },
    { url: "/avatars/live/line-1.png", aspect: 449 / 1734, height: 1.78 },
    { url: "/avatars/live/line-2.png", aspect: 437 / 1640, height: 1.74 },
    { url: "/avatars/live/line-3.png", aspect: 465 / 1618, height: 1.72 },
  ],
} satisfies Record<string, CardSpec | CardSpec[]>;

type StepUniforms = { uStepL: { value: number }; uStepR: { value: number } };

function makeCard(spec: CardSpec, name: string, tint = 1) {
  const h = spec.height;
  const w = h * spec.aspect;
  const geo = new THREE.PlaneGeometry(w, h, 10, 18);
  const pos = geo.attributes.position;
  // Bow the card so scene lights wrap around the figure instead of
  // hitting one flat plane.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w * 0.5);
    pos.setZ(i, -x * x * w * 0.2);
  }
  geo.computeVertexNormals();
  const tex = loadLive(spec.url);
  const steps: StepUniforms = { uStepL: { value: 0 }, uStepR: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.34,
    color: new THREE.Color(tint, tint, tint),
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.25,
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });
  // Paper-puppet walk: lift each half of the lower body in turn.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uStepL = steps.uStepL;
    shader.uniforms.uStepR = steps.uStepR;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uStepL;\nuniform float uStepR;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float legW = 1.0 - smoothstep(0.0, 0.46, uv.y);
        float lift = mix(uStepL, uStepR, step(0.5, uv.x));
        transformed.y += lift * legW;
        transformed.x += (uStepL - uStepR) * 0.35 * legW;`,
      );
  };
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.y = h * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: tex,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
  });
  mesh.userData.steps = steps;
  return mesh;
}

export type PersonKind = "hero" | "club" | "rapper" | "beard" | "street";

export function makePerson(kind: PersonKind, seed = 0) {
  const g = new THREE.Group();
  const cards: THREE.Mesh[] = [];
  g.userData.live = true;
  g.userData.kind = kind;
  g.userData.phase = (Math.abs(seed) * 1.618) % (Math.PI * 2);
  let footprint = 0.62;
  if (kind === "hero") {
    cards.push(makeCard(CARDS.heroFront, "front"), makeCard(CARDS.heroBack, "back"));
  } else if (kind === "rapper") {
    cards.push(makeCard(CARDS.rapper, "front"));
    footprint = 1.0;
  } else if (kind === "beard") {
    cards.push(makeCard(CARDS.beard, "front"));
  } else {
    const n = Math.abs(seed);
    // Street walkers sit further from the lights; the line is dressed to be seen.
    const tint = kind === "street" ? 0.7 : 0.9 + (n % 3) * 0.05;
    const card = makeCard(CARDS.line[(n * 7 + (n >> 2)) % CARDS.line.length]!, "front", tint);
    if (n % 2 === 1) card.scale.x = -1;
    cards.push(card);
    g.scale.setScalar(0.96 + (n % 5) * 0.014);
  }
  for (const c of cards) g.add(c);
  g.userData.cards = cards;
  g.add(contactShadow(footprint * 1.5, footprint, 0.62));
  return g;
}

/* ------------------------------------------------------------------ */
/* Cars — extruded side profiles instead of stacked boxes              */
/* ------------------------------------------------------------------ */

/** Extrude a side profile (x = nose-forward, y = up) across the car's width. */
function extrudeAcross(shape: THREE.Shape, width: number, bevel: number, segments = 4) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.7,
    bevelOffset: -bevel * 0.7,
    bevelSegments: segments,
    curveSegments: 20,
  });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  // shape +x is the nose; the game drives toward -z
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

type CarStyle = {
  length: number;
  width: number;
  wheelbase: number;
  wheelR: number;
  hood: number;
  deck: number;
  roof: number;
  fastback: boolean;
};

function bodyShape(c: CarStyle) {
  const L = c.length / 2;
  const ax = c.wheelbase / 2;
  const arch = c.wheelR + 0.07;
  const s = new THREE.Shape();
  s.moveTo(-L + 0.04, 0.34);
  s.lineTo(-L + 0.12, 0.25);
  s.lineTo(-ax - arch, 0.23);
  s.absarc(-ax, c.wheelR, arch, Math.PI, 0, true);
  s.lineTo(ax - arch, 0.23);
  s.absarc(ax, c.wheelR, arch, Math.PI, 0, true);
  s.lineTo(L - 0.14, 0.24);
  s.quadraticCurveTo(L + 0.02, 0.3, L, 0.5);
  s.quadraticCurveTo(L - 0.02, c.hood - 0.08, L - 0.3, c.hood - 0.03);
  s.quadraticCurveTo(L * 0.62, c.hood + 0.1, L * 0.42, c.hood + 0.17);
  s.lineTo(-L * 0.6, c.deck + 0.02);
  s.quadraticCurveTo(-L + 0.2, c.deck, -L + 0.03, c.deck - 0.16);
  s.lineTo(-L + 0.04, 0.34);
  return s;
}

function cabinShape(c: CarStyle) {
  const L = c.length / 2;
  const base = c.hood + 0.12;
  const s = new THREE.Shape();
  s.moveTo(L * 0.5, base);
  s.bezierCurveTo(L * 0.32, c.roof - 0.16, L * 0.2, c.roof, -0.05, c.roof + 0.01);
  if (c.fastback) {
    s.bezierCurveTo(-L * 0.36, c.roof, -L * 0.56, c.roof - 0.2, -L * 0.8, c.deck - 0.02);
  } else {
    s.bezierCurveTo(-L * 0.34, c.roof, -L * 0.44, c.roof - 0.06, -L * 0.6, c.deck - 0.02);
  }
  s.lineTo(L * 0.5, base);
  return s;
}

function makeWheel(r: number, rimMat: THREE.Material) {
  const w = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.25, 28).rotateZ(Math.PI / 2),
    mat(0x0b0b0c, { roughness: 0.86 }),
  );
  w.add(tyre);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.262, 24).rotateZ(Math.PI / 2),
    rimMat,
  );
  w.add(rim);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.56, r * 0.56, 0.268, 24).rotateZ(Math.PI / 2),
    mat(0x090909, { roughness: 0.5, metalness: 0.4 }),
  );
  w.add(hub);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.274, r * 1.2, r * 0.17), rimMat);
    spoke.rotation.x = (i / 5) * Math.PI;
    w.add(spoke);
  }
  return w;
}

function makeCar(c: CarStyle, paint: THREE.Material, opts: { glow: number; chrome: boolean }) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x05070b,
    // not mirror-smooth: point lights on perfect glass bloom into flares
    roughness: 0.16,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 2.2,
  });
  const chrome = mat(0xc8cdd4, { roughness: 0.16, metalness: 1 });
  const L = c.length / 2;

  g.add(new THREE.Mesh(extrudeAcross(bodyShape(c), c.width, 0.11), paint));
  g.add(new THREE.Mesh(extrudeAcross(cabinShape(c), c.width - 0.2, 0.16, 5), glass));

  if (opts.chrome) {
    for (const s of [-1, 1] as const) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, c.length * 0.5), chrome);
      trim.position.set(s * (c.width / 2 - 0.035), c.hood + 0.2, 0.15);
      g.add(trim);
    }
  }

  const under = new THREE.Mesh(
    new THREE.BoxGeometry(c.width - 0.2, 0.1, c.length - 0.5),
    mat(0x050506, { roughness: 0.9 }),
  );
  under.position.y = 0.24;
  g.add(under);

  const hl = mat(0xfff4d2, { emissive: 0xfff2c4, emissiveIntensity: 2.6 * opts.glow });
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 1.5 * opts.glow });
  for (const s of [-1, 1] as const) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.05), hl);
    h.position.set(s * (c.width / 2 - 0.36), c.hood - 0.1, -L + 0.045);
    h.rotation.y = s * -0.22;
    g.add(h);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), paint);
    mirror.position.set(s * (c.width / 2 + 0.03), c.hood + 0.24, -L * 0.36);
    g.add(mirror);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(c.width - 0.34, 0.045, 0.04), tl);
  bar.position.set(0, c.deck - 0.1, L - 0.02);
  g.add(bar);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.02), mat(0xdedcd4, { roughness: 0.6 }));
  plate.position.set(0, 0.46, L);
  g.add(plate);

  const rimMat = mat(0xaab2be, { roughness: 0.22, metalness: 0.95 });
  const ax = c.wheelbase / 2;
  const hubs: [number, number][] = [
    [-1, -ax],
    [1, -ax],
    [-1, ax],
    [1, ax],
  ];
  hubs.forEach(([sx, z], i) => {
    const w = makeWheel(c.wheelR, rimMat);
    w.position.set(sx * (c.width / 2 - 0.15), c.wheelR, z);
    w.name = `wheel${i}`;
    g.add(w);
  });

  tag(g, true, true);
  g.add(contactShadow(c.width * 1.5, c.length * 1.25, 0.8));
  return g;
}

const TESLA_STYLE: CarStyle = {
  length: 4.72,
  width: 1.92,
  wheelbase: 2.9,
  wheelR: 0.36,
  hood: 0.76,
  deck: 0.98,
  roof: 1.43,
  fastback: true,
};

const SEDAN_STYLE: CarStyle = {
  length: 4.4,
  width: 1.84,
  wheelbase: 2.66,
  wheelR: 0.33,
  hood: 0.8,
  deck: 0.94,
  roof: 1.4,
  fastback: false,
};

export function makeTesla() {
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x0b0d12,
    roughness: 0.24,
    metalness: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 3.2,
  });
  const g = makeCar(TESLA_STYLE, paint, { glow: 1, chrome: true });
  const chrome = mat(0xc8cdd4, { roughness: 0.16, metalness: 1 });

  function door(side: -1 | 1) {
    const d = new THREE.Group();
    d.name = side > 0 ? "doorR" : "doorL";
    d.position.set(side * 0.955, 0.66, -0.42);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 1.12), paint);
    panel.position.set(0, 0, 0.56);
    d.add(panel);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.3, 0.98),
      mat(0x0a0e14, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }),
    );
    pane.position.set(-side * 0.02, 0.4, 0.6);
    d.add(pane);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.17), chrome);
    handle.position.set(side * 0.024, 0.14, 0.86);
    d.add(handle);
    return d;
  }
  g.add(tag(door(-1)));
  g.add(tag(door(1)));

  g.userData.door = 0;
  return g;
}

export function makeSedan(color: number) {
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0.6,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.6,
  });
  return makeCar(SEDAN_STYLE, paint, { glow: 0.03, chrome: false });
}

/** Additive cone of light in the wet air. */
export function lightCone(radius: number, height: number, color: number, opacity: number) {
  const geo = new THREE.ConeGeometry(radius, height, 24, 1, true);
  geo.translate(0, -height / 2, 0);
  const cone = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
      vertexShader: `
        varying float vH;
        varying vec3 vN;
        varying vec3 vV;
        void main(){
          vH = uv.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vH;
        varying vec3 vN;
        varying vec3 vV;
        void main(){
          float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
          float fall = smoothstep(0.0, 0.25, vH) * (0.25 + 0.75 * vH);
          gl_FragColor = vec4(uColor, uOpacity * facing * fall);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  cone.userData.noShadow = true;
  cone.renderOrder = 3;
  return cone;
}

/** Light pooled on the ground under a fixture. */
export function lightPool(size: number, color: number, opacity: number) {
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: glow(),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  pool.renderOrder = 2;
  pool.userData.noShadow = true;
  return pool;
}

/** Street lamp; `reach` is the signed x-offset of the arm toward the road. */
export function makeLamp(reach = 1.5) {
  const g = new THREE.Group();
  const steel = mat(0x23252a, { roughness: 0.45, metalness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.5, 10), steel);
  base.position.y = 0.25;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 5.4, 10), steel);
  pole.position.y = 2.7;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, Math.abs(reach) + 0.2, 8), steel);
  arm.rotation.z = Math.PI / 2 - Math.sign(reach) * 0.12;
  arm.position.set(reach / 2, 5.42, 0);
  g.add(arm);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.26), steel);
  hood.position.set(reach, 5.46, 0);
  g.add(hood);
  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.04, 0.18),
    mat(0xffe6b0, { emissive: 0xffc878, emissiveIntensity: 5 }),
  );
  lens.position.set(reach, 5.4, 0);
  g.add(lens);
  const cone = lightCone(2.9, 5.35, 0xffc98a, 0.06);
  cone.position.set(reach, 5.38, 0);
  g.add(cone);
  const pool = lightPool(8.5, 0xffb870, 0.2);
  pool.position.x = reach;
  g.add(pool);
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
  lid.rotation.x = -0.05;
  g.add(lid);
  const rib = mat(0x1a3020, { roughness: 0.6, metalness: 0.35 });
  for (const x of [-0.5, 0, 0.5]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.94), rib);
    r.position.set(x, 0.55, 0);
    g.add(r);
  }
  for (const x of [-0.72, 0.72]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10).rotateZ(Math.PI / 2), mat(0x0c0c0c, { roughness: 0.8 }));
    w.position.set(x, 0.07, 0.36);
    g.add(w);
  }
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
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.17, 0.035, 16),
    mat(0xc8cdd4, { roughness: 0.22, metalness: 0.88 }),
  );
  foot.position.y = 0.02;
  g.add(foot);
  return g;
}

export function animatePerson(
  mesh: THREE.Group,
  t: number,
  speed: number,
  mode: "walk" | "dance" | "idle" | "rap" | "own",
) {
  const ph = (mesh.userData.phase as number | undefined) ?? 0;
  const cards = (mesh.userData.cards as THREE.Mesh[] | undefined) ?? [];
  let bob = 0;
  let sway = 0;
  let stepL = 0;
  let stepR = 0;
  let breathe = 1 + Math.sin(t * 1.7 + ph) * 0.005;

  if (mode === "walk") {
    const pace = 6.4 + Math.min(4, speed) * 0.75;
    const gait = Math.sin(t * pace);
    const reach = 0.035 + Math.min(1, speed / 6) * 0.05;
    stepL = Math.max(0, gait) * reach;
    stepR = Math.max(0, -gait) * reach;
    bob = Math.abs(Math.cos(t * pace)) * 0.022;
    sway = gait * 0.028;
  } else if (mode === "dance") {
    const beat = t * 4.2 + ph;
    bob = Math.abs(Math.sin(beat)) * 0.05;
    sway = Math.sin(beat * 0.5) * 0.085;
    stepL = Math.max(0, Math.sin(beat)) * 0.045;
    stepR = Math.max(0, -Math.sin(beat)) * 0.045;
    breathe = 1 + Math.sin(beat * 2) * 0.008;
  } else if (mode === "rap") {
    bob = Math.abs(Math.sin(t * 6.6)) * 0.03;
    sway = Math.sin(t * 3.3) * 0.045 + Math.sin(t * 9.1) * 0.012;
    breathe = 1 + Math.sin(t * 6.6) * 0.01;
  } else if (mode === "own") {
    sway = Math.sin(t * 1.1) * 0.01;
    breathe = 1.012 + Math.sin(t * 2.2) * 0.006;
  } else {
    // idle: weight shifts from hip to hip, never a frozen cut-out
    sway = Math.sin(t * 0.62 + ph) * 0.014 + Math.sin(t * 1.9 + ph * 2) * 0.004;
  }

  mesh.position.y = bob;
  for (const c of cards) {
    c.rotation.z = sway;
    c.scale.y = breathe;
    const steps = c.userData.steps as StepUniforms | undefined;
    if (steps) {
      steps.uStepL.value = stepL;
      steps.uStepR.value = stepR;
    }
  }
  const shadow = mesh.getObjectByName("shadow");
  if (shadow) shadow.position.y = 0.022 - bob;
}
