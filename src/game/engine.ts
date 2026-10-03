import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CHAPTERS, FIXED, clamp, inAlley, inClub, lerp } from "./constants";
import { createInput, type Actions } from "./input";
import { createAudio } from "./audio";
import { animatePerson, makePerson, makeTesla } from "./meshes";
import { blipOf, createSim, objectiveOf, resetSim, stepSim, type Sim } from "./sim";
import { useGameStore } from "./store";
import { buildWorld } from "./world";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getZ: () => number;
      inCar: () => boolean;
      getFrames?: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

export function createGame(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x07080e, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080e);
  scene.fog = new THREE.Fog(0x07080e, 24, 110);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.12, 220);
  camera.position.set(-1.15, 1.48, 12.2);
  camera.lookAt(4.6, 1.42, 2.6);

  scene.add(new THREE.HemisphereLight(0x1c2a44, 0x0a0808, 0.62));
  scene.add(new THREE.AmbientLight(0x1a1820, 0.28));
  const moon = new THREE.DirectionalLight(0xa8c4e8, 0.72);
  moon.position.set(-28, 48, 18);
  moon.castShadow = renderer.shadowMap.enabled;
  moon.shadow.mapSize.set(512, 512);
  moon.shadow.camera.near = 4;
  moon.shadow.camera.far = 120;
  moon.shadow.camera.left = -36;
  moon.shadow.camera.right = 36;
  moon.shadow.camera.top = 36;
  moon.shadow.camera.bottom = -36;
  moon.shadow.bias = -0.00035;
  scene.add(moon);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 20, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          vec3 zenith = vec3(0.03, 0.04, 0.09);
          vec3 mid = vec3(0.08, 0.06, 0.12);
          vec3 horizon = vec3(0.22, 0.08, 0.12);
          vec3 col = mix(horizon, mid, smoothstep(-0.05, 0.25, h));
          col = mix(col, zenith, smoothstep(0.2, 0.85, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(sky);

  const world = buildWorld(scene);
  const sim: Sim = createSim();
  const input = createInput();
  const audio = createAudio();

  const tesla = makeTesla();
  scene.add(tesla);
  const headL = new THREE.SpotLight(0xfff2d4, 0, 28, 0.42, 0.45, 1.2);
  const headR = new THREE.SpotLight(0xfff2d4, 0, 28, 0.42, 0.45, 1.2);
  tesla.add(headL);
  tesla.add(headR);
  headL.position.set(-0.55, 0.62, -2.2);
  headR.position.set(0.55, 0.62, -2.2);
  headL.target.position.set(-0.55, 0.2, -10);
  headR.target.position.set(0.55, 0.2, -10);
  tesla.add(headL.target);
  tesla.add(headR.target);

  const heroFill = new THREE.PointLight(0xffe4c8, 0, 8, 2);
  scene.add(heroFill);
  const heroRim = new THREE.PointLight(0x7eb6ff, 0, 7, 2);
  scene.add(heroRim);
  const faceKey = new THREE.SpotLight(0xfff1dc, 0, 9, 0.55, 0.35, 1.1);
  scene.add(faceKey);
  scene.add(faceKey.target);

  const playerMesh = makePerson("hero");
  scene.add(playerMesh);

  const npcMeshes = sim.npcs.map((n) => {
    const m = makePerson(n.kind, n.seed);
    scene.add(m);
    return m;
  });

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.08, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf3efe8,
      emissive: 0xf3efe8,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.7,
    }),
  );
  scene.add(marker);

  const rainCount = 700;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = -22 + Math.random() * 68;
    rainPos[i * 3 + 1] = Math.random() * 16;
    rainPos[i * 3 + 2] = -24 + Math.random() * 72;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0xb8c4d4,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  scene.add(rain);

  let composer: EffectComposer | null = null;
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.36, 0.42, 0.7);
  function setupComposer() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  setupComposer();

  let phase: "title" | "play" | "pause" | "win" = "title";
  let acc = 0;
  let last = performance.now();
  let fly = 0;
  let camX = -1.15,
    camY = 1.48,
    camZ = 12.2;
  let lookX = 4.6,
    lookY = 1.42,
    lookZ = 2.6;
  let hudT = 0;
  let running = true;
  let frames = 0;
  let steerOverride: number | null = null;
  let slateT = 0;
  let reelOn = false;
  let alleyPlayed = false;
  const facePos = new THREE.Vector3();
  const faceLook = new THREE.Vector3();
  const LINES = [
    "Nights alive. We own the streets. No retreat.",
    "Outlaw hustle. Cash rules. Break the noose.",
    "Eyes on the prize. Steam in the dark. We go hard.",
  ];
  let lastActions: Actions = {
    throttle: 0,
    steer: 0,
    sprint: false,
    handbrake: false,
    enter: false,
    fire: false,
    radio: false,
    horn: false,
    pause: false,
    mute: false,
  };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    composer?.setSize(w, h);
    bloom.setSize(w, h);
  }
  resize();
  window.addEventListener("resize", resize);

  function skipReel() {
    if (!reelOn) return;
    reelOn = false;
    useGameStore.getState().patch({ reel: null });
  }

  function start() {
    audio.unlock();
    skipReel();
    const fx = -Math.sin(sim.player.yaw);
    const fz = -Math.cos(sim.player.yaw);
    camX = sim.player.x - fx * 8.2;
    camY = 2.9;
    camZ = sim.player.z - fz * 8.2;
    lookX = sim.player.x;
    lookY = 1.1;
    lookZ = sim.player.z;
    phase = "play";
    useGameStore.getState().patch({ phase: "play", slate: "Arrival" });
    slateT = 2.2;
    syncHud();
  }
  function pause() {
    if (phase !== "play") return;
    phase = "pause";
    useGameStore.getState().patch({ phase: "pause" });
  }
  function resume() {
    if (phase !== "pause") return;
    phase = "play";
    useGameStore.getState().patch({ phase: "play" });
  }
  function restart() {
    resetSim(sim);
    alleyPlayed = false;
    reelOn = false;
    slateT = 2.2;
    phase = "play";
    useGameStore.getState().patch({ phase: "play", reel: null, slate: "Arrival", caption: "" });
    start();
  }

  useGameStore.getState().bind({
    start,
    pause,
    resume,
    restart,
    toggleMute: () => {
      const m = audio.toggleMute();
      useGameStore.getState().patch({ muted: m });
    },
    setTouch: (s, t) => input.setTouch(s, t),
    tapEnter: () => input.tapEnter(),
    tapHandbrake: () => input.tapHandbrake(),
    setActionHold: (v) => input.setActionHold(v),
    skipReel,
  });
  useGameStore.getState().patch({ phase: "title" });

  window.__controlsTest = {
    getYaw: () => sim.player.yaw,
    getSpeed: () => Math.abs(sim.player.speed),
    getX: () => sim.player.x,
    getZ: () => sim.player.z,
    inCar: () => sim.player.inCar,
    getFrames: () => frames,
    setKeys: (codes) => input.setKeys(codes),
    setSteer: (v) => {
      steerOverride = v;
    },
  };

  function syncHud() {
    const blip = blipOf(sim);
    const ch = CHAPTERS[sim.chapter] ?? CHAPTERS[0];
    useGameStore.getState().patch({
      phase: sim.ended ? "win" : phase,
      chapter: sim.chapter,
      chapterTitle: ch.title,
      objective: objectiveOf(sim),
      prompt: sim.prompt,
      toast: sim.toast,
      speed: Math.abs(sim.player.speed),
      inVehicle: sim.player.inCar,
      x: sim.player.x,
      z: sim.player.z,
      yaw: sim.player.yaw,
      blipX: blip?.x ?? null,
      blipZ: blip?.z ?? null,
      hold: sim.hold,
      vehicleName: "Night",
      caption:
        sim.chapter === 3 && !reelOn
          ? LINES[Math.floor(sim.time / 3.6) % LINES.length]!
          : "",
    });
  }

  function applyEvents(events: ReturnType<typeof stepSim>) {
    for (const e of events) {
      if (e.type === "enter" || e.type === "exit") audio.enterCar();
      else if (e.type === "door") audio.door();
      else if (e.type === "chapter") {
        audio.chapter();
        const title = CHAPTERS[sim.chapter]?.title ?? "";
        if (sim.chapter === 3 && !alleyPlayed) {
          alleyPlayed = true;
          reelOn = true;
          slateT = 0;
          useGameStore.getState().patch({ reel: "alley", slate: "" });
        } else {
          slateT = 2.3;
          useGameStore.getState().patch({ slate: title });
        }
      } else if (e.type === "win") {
        audio.win();
        phase = "win";
      }
    }
  }

  function syncMeshes(t: number, dt: number, actions: Actions) {
    tesla.position.set(sim.player.carX, 0, sim.player.carZ);
    tesla.rotation.y = sim.player.carYaw;
    tesla.traverse((o) => {
      if (o.name.startsWith("wheel")) {
        (o as THREE.Mesh).rotation.x += sim.player.inCar ? sim.player.speed * 0.08 : 0;
      }
    });
    const lightsOn = sim.player.inCar;
    headL.intensity = lightsOn ? 8 : 0;
    headR.intensity = lightsOn ? 8 : 0;
    const hfx = -Math.sin(sim.player.yaw);
    const hfz = -Math.cos(sim.player.yaw);
    heroFill.position.set(sim.player.x + hfx * 1.15, 2.05, sim.player.z + hfz * 1.15);
    heroFill.intensity = sim.player.inCar ? 0 : 6.4;
    heroRim.position.set(sim.player.x - hfx * 1.35, 1.85, sim.player.z - hfz * 1.35);
    heroRim.intensity = sim.player.inCar ? 0 : 7.5;
    faceKey.position.set(sim.player.x + hfx * 1.6, 2.15, sim.player.z + hfz * 1.6);
    faceKey.target.position.set(sim.player.x, 1.55, sim.player.z);
    faceKey.intensity = sim.player.inCar ? 0 : 10;

    const dx = sim.player.x - sim.player.carX;
    const dz = sim.player.z - sim.player.carZ;
    const nearCar = !sim.player.inCar && dx * dx + dz * dz < 12;
    const wantDoor = nearCar ? 1 : 0;
    tesla.userData.door = lerp(tesla.userData.door ?? 0, wantDoor, 1 - Math.exp(-5.5 * dt));
    const doorR = tesla.getObjectByName("doorR");
    const doorL = tesla.getObjectByName("doorL");
    if (doorR) doorR.rotation.y = -tesla.userData.door * 1.18;
    if (doorL) doorL.rotation.y = tesla.userData.door * 1.18;

    playerMesh.visible = !sim.player.inCar;
    playerMesh.position.set(sim.player.x, 0, sim.player.z);
    playerMesh.rotation.y = sim.player.yaw;
    const inRoom = inClub(sim.player.x, sim.player.z);
    let pose: "walk" | "dance" | "idle" | "rap" | "own" = "idle";
    if (sim.ended) pose = "own";
    else if (sim.player.inCar) pose = "idle";
    else if (inRoom && actions.handbrake) pose = "own";
    else if (Math.abs(sim.player.speed) > 0.4) pose = "walk";
    animatePerson(playerMesh, t, Math.abs(sim.player.speed), pose);
    presentLive(playerMesh, sim.player.yaw, false);

    for (let i = 0; i < sim.npcs.length; i++) {
      const n = sim.npcs[i]!;
      const m = npcMeshes[i];
      if (!m) continue;
      m.position.set(n.x, 0, n.z);
      m.rotation.y = n.yaw;
      animatePerson(m, t + i * 0.3, n.speed, n.mode);
      presentLive(m, n.yaw, false);
    }

    const blip = blipOf(sim);
    if (blip && !sim.ended) {
      marker.visible = true;
      marker.position.set(blip.x, 0.12 + Math.sin(t * 3) * 0.06, blip.z);
    } else {
      marker.visible = false;
    }

    const pulse = 0.55 + Math.sin(t * 4.2) * 0.35;
    world.clubLights[0]!.intensity = 16 + pulse * 12;
    world.clubLights[1]!.intensity = 14 + (1 - pulse) * 10;

    const pos = rainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rainCount; i++) {
      let y = pos.getY(i) - 18 * dt;
      let x = pos.getX(i);
      let z = pos.getZ(i);
      if (y < 0 || inClub(x, z)) {
        x = -22 + Math.random() * 68;
        y = 8 + Math.random() * 10;
        z = -24 + Math.random() * 72;
        if (inClub(x, z)) {
          x = 30 + Math.random() * 12;
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  function poseTitle(t: number) {
    tesla.position.set(1.35, 0, 5.15);
    tesla.rotation.y = 0.58;
    tesla.userData.door = 1;
    const doorR = tesla.getObjectByName("doorR");
    const doorL = tesla.getObjectByName("doorL");
    if (doorR) doorR.rotation.y = -1.18;
    if (doorL) doorL.rotation.y = 0;
    headL.intensity = 8;
    headR.intensity = 8;
    heroFill.position.set(3.05, 1.9, 4.55);
    heroFill.intensity = 7.2;
    playerMesh.visible = true;
    playerMesh.position.set(3.12, 0, 4.62);
    playerMesh.rotation.y = 0.82;
    animatePerson(playerMesh, t, 0, "idle");
    presentLive(playerMesh, 0.82, true);
  }

  function presentLive(root: THREE.Object3D, yaw: number, forceFront: boolean) {
    if (!root.userData.live) {
      presentFace(root);
      return;
    }
    const dx = camera.position.x - root.position.x;
    const dz = camera.position.z - root.position.z;
    const faceYaw = Math.atan2(dx, dz);
    const local = faceYaw - yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const showFront = forceFront || fx * dx + fz * dz > 0.12;
    const front = root.getObjectByName("front");
    const back = root.getObjectByName("back");
    if (front) {
      front.visible = !back || showFront;
      front.rotation.y = local;
    }
    if (back) {
      back.visible = !showFront;
      back.rotation.y = local;
    }
  }

  function presentFace(root: THREE.Object3D) {
    const face = root.getObjectByName("face");
    if (!face) return;
    const yaw = root.rotation.y;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    face.getWorldPosition(facePos);
    const dx = camera.position.x - facePos.x;
    const dz = camera.position.z - facePos.z;
    const show = fx * dx + fz * dz > 0.4;
    face.visible = show;
    if (!show) return;
    faceLook.set(facePos.x * 2 - camera.position.x, facePos.y, facePos.z * 2 - camera.position.z);
    face.lookAt(faceLook);
  }

  function cameraTitle(dt: number) {
    fly += dt * 0.06;
    const tx = -1.15 + Math.sin(fly) * 0.35;
    const tz = 12.2 + Math.cos(fly) * 0.28;
    camX = lerp(camX, tx, 1 - Math.exp(-1.05 * dt));
    camY = lerp(camY, 1.48, 1 - Math.exp(-1.05 * dt));
    camZ = lerp(camZ, tz, 1 - Math.exp(-1.05 * dt));
    lookX = lerp(lookX, 4.6, 1 - Math.exp(-1.2 * dt));
    lookY = lerp(lookY, 1.42, 1 - Math.exp(-1.2 * dt));
    lookZ = lerp(lookZ, 2.6, 1 - Math.exp(-1.2 * dt));
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);
  }

  function cameraPlay(dt: number) {
    const fx = -Math.sin(sim.player.yaw);
    const fz = -Math.cos(sim.player.yaw);
    const rx = Math.cos(sim.player.yaw);
    const rz = -Math.sin(sim.player.yaw);
    const inCar = sim.player.inCar;
    const inRoom = inClub(sim.player.x, sim.player.z);
    const own = sim.ended || (!inCar && inRoom && lastActions.handbrake);
    const alleyShot = !inCar && inAlley(sim.player.x, sim.player.z);

    let dist = inCar ? 8.2 : 4.35;
    let height = inCar ? 2.7 : 1.78;
    let lookH = inCar ? 1.05 : 1.12;
    let side = inCar ? 0 : 0.58;
    let along = -1;

    if (own) {
      dist = 2.08;
      height = 1.52;
      lookH = 1.5;
      side = 0.08;
      along = 1;
    } else if (alleyShot) {
      dist = 2.4;
      height = 1.48;
      lookH = 1.5;
      side = 1.2;
    }

    const lookAhead = Math.abs(sim.player.speed) * 0.08;
    const shake = sim.trauma * sim.trauma;
    const sx = (Math.random() - 0.5) * shake * 1.1;
    const sy = (Math.random() - 0.5) * shake * 0.6;
    const desiredX = sim.player.x + fx * dist * along + rx * side + sx;
    const desiredY = height + sy;
    const desiredZ = sim.player.z + fz * dist * along + rz * side;
    const k = 1 - Math.exp(-(own ? 3.4 : inCar ? 5.2 : 8.2) * dt);
    camX = lerp(camX, desiredX, k);
    camY = lerp(camY, desiredY, k);
    camZ = lerp(camZ, desiredZ, k);
    lookX = lerp(lookX, sim.player.x + fx * lookAhead, k);
    lookY = lerp(lookY, lookH, k);
    lookZ = lerp(lookZ, sim.player.z + fz * lookAhead, k);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);
    const fov = own || sim.ended ? 32 : alleyShot ? 38 : 50 + clamp(Math.abs(sim.player.speed) / 40, 0, 1) * 8;
    if (Math.abs(camera.fov - fov) > 0.2) {
      camera.fov = lerp(camera.fov, fov, 0.08);
      camera.updateProjectionMatrix();
    }
  }

  function tick(now: number) {
    if (!running) return;
    const raw = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += raw;
    const visualDt = raw;
    const t = now / 1000;
    frames += 1;

    if (phase === "title") {
      acc = 0;
      cameraTitle(visualDt);
      syncMeshes(t, visualDt, lastActions);
      poseTitle(t);
      composer ? composer.render() : renderer.render(scene, camera);
      return;
    }

    if (phase === "play" && reelOn) {
      acc = 0;
      const actions = input.sample();
      if (actions.enter || actions.fire) skipReel();
      composer ? composer.render() : renderer.render(scene, camera);
      return;
    }

    if (phase === "pause") {
      const actions = input.sample();
      if (steerOverride !== null) actions.steer = steerOverride;
      lastActions = actions;
      if (actions.pause) resume();
      if (actions.mute) {
        const m = audio.toggleMute();
        useGameStore.getState().patch({ muted: m });
      }
      composer ? composer.render() : renderer.render(scene, camera);
      return;
    }

    const actions = input.sample();
    if (steerOverride !== null) actions.steer = steerOverride;
    lastActions = actions;
    if (actions.pause) {
      if (phase === "play") pause();
    }
    if (actions.mute) {
      const m = audio.toggleMute();
      useGameStore.getState().patch({ muted: m });
    }

    if (phase === "play" || phase === "win") {
      let steps = 0;
      while (acc >= FIXED && steps < 10) {
        const events = stepSim(sim, FIXED, actions, world.colliders);
        applyEvents(events);
        acc -= FIXED;
        steps += 1;
        actions.enter = false;
        actions.pause = false;
        actions.mute = false;
        actions.fire = false;
      }
      if (acc > 0.2) acc = 0.2;
    }

    audio.tick(
      visualDt,
      inClub(sim.player.x, sim.player.z),
      inAlley(sim.player.x, sim.player.z),
      sim.player.inCar,
      sim.player.speed,
      !sim.player.inCar && Math.abs(sim.player.speed) > 0.5,
    );
    cameraPlay(visualDt);
    syncMeshes(t, visualDt, actions);
    if (slateT > 0) {
      slateT -= visualDt;
      if (slateT <= 0) useGameStore.getState().patch({ slate: "" });
    }
    hudT += visualDt;
    if (hudT > 0.08) {
      hudT = 0;
      syncHud();
    }
    composer ? composer.render() : renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(tick);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      last = performance.now();
      audio.resume();
    }
  });

  syncHud();

  return {
    dispose() {
      running = false;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      input.dispose();
      world.dispose();
      composer?.dispose();
      renderer.dispose();
      delete window.__controlsTest;
    },
  };
}
