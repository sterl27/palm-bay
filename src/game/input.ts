import { clamp } from "./constants";

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyF",
  "KeyE",
  "KeyR",
  "KeyH",
  "KeyP",
  "Escape",
  "KeyM",
]);

export type Actions = {
  throttle: number;
  steer: number;
  sprint: boolean;
  handbrake: boolean;
  enter: boolean;
  fire: boolean;
  radio: boolean;
  horn: boolean;
  pause: boolean;
  mute: boolean;
};

export function createInput() {
  const keys = new Set<string>();
  let injected: string[] | null = null;
  let steerTouch = 0;
  let throttleTouch = 0;
  let enterTap = false;
  let handbrakeTap = false;
  let actionHold = false;
  const prev = {
    enter: false,
    fire: false,
    radio: false,
    horn: false,
    pause: false,
    mute: false,
    handbrake: false,
  };

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function clear() {
    keys.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });

  function held(code: string) {
    if (injected) return injected.includes(code);
    return keys.has(code);
  }

  function pollPad() {
    const pads = navigator.getGamepads?.() ?? [];
    let steer = 0;
    let throttle = 0;
    let sprint = false;
    let handbrake = false;
    let enter = false;
    let fire = false;
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const lx = pad.axes[0] ?? 0;
      const ly = pad.axes[1] ?? 0;
      const mag = Math.hypot(lx, ly);
      const dz = 0.15;
      if (mag >= dz) {
        const scale = ((mag - dz) / (1 - dz)) / mag;
        steer -= lx * scale;
        throttle -= ly * scale;
      }
      if (pad.buttons[12]?.pressed) throttle += 1;
      if (pad.buttons[13]?.pressed) throttle -= 1;
      if (pad.buttons[14]?.pressed) steer += 1;
      if (pad.buttons[15]?.pressed) steer -= 1;
      if (pad.buttons[0]?.pressed) fire = true;
      if (pad.buttons[1]?.pressed) handbrake = true;
      if (pad.buttons[2]?.pressed) enter = true;
      if (pad.buttons[5]?.pressed || pad.buttons[10]?.pressed) sprint = true;
    }
    return { steer, throttle, sprint, handbrake, enter, fire };
  }

  function sample(): Actions {
    const pad = pollPad();
    let steer = 0;
    let throttle = 0;
    if (held("KeyA") || held("ArrowLeft")) steer += 1;
    if (held("KeyD") || held("ArrowRight")) steer -= 1;
    if (held("KeyW") || held("ArrowUp")) throttle += 1;
    if (held("KeyS") || held("ArrowDown")) throttle -= 1;
    steer += pad.steer + steerTouch;
    throttle += pad.throttle + throttleTouch;
    steer = clamp(steer, -1, 1);
    throttle = clamp(throttle, -1, 1);

    const enterHeld = held("KeyF") || held("KeyE") || pad.enter || enterTap;
    const fireHeld = held("Space") || pad.fire;
    const radioHeld = held("KeyR");
    const hornHeld = held("KeyH");
    const pauseHeld = held("Escape") || held("KeyP");
    const muteHeld = held("KeyM");
    const hbHeld = fireHeld || pad.handbrake || handbrakeTap || actionHold;

    const actions: Actions = {
      throttle,
      steer,
      sprint: held("ShiftLeft") || held("ShiftRight") || pad.sprint,
      handbrake: hbHeld && !prev.handbrake ? true : hbHeld,
      enter: enterHeld && !prev.enter,
      fire: fireHeld && !prev.fire,
      radio: radioHeld && !prev.radio,
      horn: hornHeld && !prev.horn,
      pause: pauseHeld && !prev.pause,
      mute: muteHeld && !prev.mute,
    };
    prev.enter = enterHeld;
    prev.fire = fireHeld;
    prev.radio = radioHeld;
    prev.horn = hornHeld;
    prev.pause = pauseHeld;
    prev.mute = muteHeld;
    prev.handbrake = hbHeld;
    enterTap = false;
    handbrakeTap = false;
    return actions;
  }

  return {
    sample,
    setKeys(codes: string[]) {
      injected = codes;
    },
    setTouch(steer: number, throttle: number) {
      steerTouch = steer;
      throttleTouch = throttle;
    },
    tapEnter() {
      enterTap = true;
    },
    tapHandbrake() {
      handbrakeTap = true;
    },
    setActionHold(v: boolean) {
      actionHold = v;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    },
  };
}

export type InputCtl = ReturnType<typeof createInput>;
