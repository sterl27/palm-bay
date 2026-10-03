export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let music: GainNode | null = null;
  let muted = false;
  let rainSrc: AudioBufferSourceNode | null = null;
  let rainGain: GainNode | null = null;
  let bassOsc: OscillatorNode | null = null;
  let bassGain: GainNode | null = null;
  let kickT = 0;
  let hatT = 0;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;
  let stepT = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    sfx.gain.value = 0.32;
    music.gain.value = 0.2;
    master.gain.value = 0.72;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);

    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    engineOsc.type = "sine";
    engineOsc.frequency.value = 48;
    filt.type = "lowpass";
    filt.frequency.value = 280;
    engineGain.gain.value = 0;
    engineOsc.connect(filt);
    filt.connect(engineGain);
    engineGain.connect(sfx);
    engineOsc.start();

    bassOsc = ctx.createOscillator();
    bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.value = 55;
    bassGain.gain.value = 0;
    bassOsc.connect(bassGain);
    bassGain.connect(music);
    bassOsc.start();

    startRain();
    return ctx;
  }

  function startRain() {
    if (!ctx || !sfx || rainSrc) return;
    const n = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buf;
    rainSrc.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.045;
    rainSrc.connect(f);
    f.connect(rainGain);
    rainGain.connect(sfx);
    rainSrc.start();
  }

  function resume() {
    const c = ensure();
    if (c.state === "suspended") void c.resume();
  }

  function unlock() {
    resume();
  }

  function beep(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.1) {
    if (!ctx || !sfx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime + dur * 0.35, dur * 0.12);
    o.connect(g);
    g.connect(sfx);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  function noise(dur: number, gain = 0.12, freq = 800) {
    if (!ctx || !sfx || muted) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    src.buffer = buf;
    f.type = "bandpass";
    f.frequency.value = freq;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(sfx);
    src.start();
  }

  function tick(dt: number, inClub: boolean, inAlley: boolean, inCar: boolean, speed: number, walking: boolean) {
    if (!ctx || muted) return;
    if (rainGain) {
      const want = inClub ? 0.008 : 0.05;
      rainGain.gain.setTargetAtTime(want, ctx.currentTime, 0.2);
    }
    if (bassGain && bassOsc) {
      const want = inClub ? 0.12 : inAlley ? 0.04 : 0.03;
      bassGain.gain.setTargetAtTime(want, ctx.currentTime, 0.25);
      bassOsc.frequency.setTargetAtTime(inClub ? 58 : 46, ctx.currentTime, 0.2);
    }
    if (engineGain && engineOsc) {
      const on = inCar ? 0.04 + Math.abs(speed) * 0.002 : 0;
      engineGain.gain.setTargetAtTime(on, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(46 + Math.abs(speed) * 1.6, ctx.currentTime, 0.08);
    }
    if (inClub) {
      kickT -= dt;
      hatT -= dt;
      if (kickT <= 0) {
        kickT = 0.48;
        beep(70, 0.12, "sine", 0.16);
      }
      if (hatT <= 0) {
        hatT = 0.24;
        noise(0.04, 0.03, 6000);
      }
    }
    if (walking && !inCar) {
      stepT -= dt;
      if (stepT <= 0) {
        stepT = 0.36;
        noise(0.05, 0.05, 220);
      }
    }
  }

  return {
    unlock,
    resume,
    tick,
    enterCar: () => {
      noise(0.12, 0.08, 400);
      beep(180, 0.08, "triangle", 0.05);
    },
    door: () => {
      noise(0.18, 0.1, 180);
      beep(140, 0.1, "sine", 0.06);
    },
    chapter: () => {
      beep(330, 0.16, "sine", 0.08);
      beep(495, 0.22, "sine", 0.06);
    },
    win: () => {
      beep(220, 0.3, "sine", 0.1);
      beep(330, 0.4, "sine", 0.08);
      beep(440, 0.55, "sine", 0.07);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.72, ctx?.currentTime ?? 0, 0.04);
      return muted;
    },
  };
}
