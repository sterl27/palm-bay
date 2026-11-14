import * as THREE from "three";

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = 1,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

export function loadAvatar(kind: "hero" | "rapper" | "beard") {
  const tex = loader.load(`/avatars/${kind}-face.png`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function loadLive(url: string) {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function makeCBadge() {
  const tex = canvasTex(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = "#f4f4f4";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(32, 34, 16, 0.55, Math.PI * 1.55);
    ctx.stroke();
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function dataTex(c: HTMLCanvasElement, srgb: boolean) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Tileable value noise, `period` cells across, sampled on an n×n grid. */
function tileNoise(n: number, period: number, seed: number) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const gy = (y / n) * period;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < n; x++) {
      const gx = (x / n) * period;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const i00 = grid[(y0 % period) * period + (x0 % period)]!;
      const i10 = grid[(y0 % period) * period + ((x0 + 1) % period)]!;
      const i01 = grid[((y0 + 1) % period) * period + (x0 % period)]!;
      const i11 = grid[((y0 + 1) % period) * period + ((x0 + 1) % period)]!;
      out[y * n + x] = (i00 + (i10 - i00) * sx) * (1 - sy) + (i01 + (i11 - i01) * sx) * sy;
    }
  }
  return out;
}

export type GroundMaps = {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
  normalMap: THREE.Texture;
};

/**
 * Rain-soaked asphalt: albedo, a roughness map with standing puddles, and a
 * normal map from the aggregate grain. All three tile.
 */
export function makeWetAsphalt(): GroundMaps {
  const n = 512;
  const big = tileNoise(n, 5, 11);
  const mid = tileNoise(n, 19, 23);
  const fine = tileNoise(n, 97, 37);
  const grit = tileNoise(n, 233, 51);
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    return c;
  };
  const cA = mk();
  const cR = mk();
  const cN = mk();
  const a = cA.getContext("2d")!.createImageData(n, n);
  const r = cR.getContext("2d")!.createImageData(n, n);
  const nm = cN.getContext("2d")!.createImageData(n, n);
  const height = new Float32Array(n * n);
  const puddle = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const p = big[i]! * 0.7 + mid[i]! * 0.3;
    const w = Math.min(1, Math.max(0, (p - 0.6) / 0.07));
    puddle[i] = w * w * (3 - 2 * w);
    height[i] = (fine[i]! * 0.55 + grit[i]! * 0.45) * (1 - puddle[i]! * 0.96);
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const o = i * 4;
      const g = 22 + fine[i]! * 20 + grit[i]! * 16 - puddle[i]! * 14;
      a.data[o] = g;
      a.data[o + 1] = g + 1;
      a.data[o + 2] = g + 5;
      a.data[o + 3] = 255;
      const rough = 0.42 + grit[i]! * 0.26 + mid[i]! * 0.14;
      const rr = (rough * (1 - puddle[i]!) + 0.035 * puddle[i]!) * 255;
      r.data[o] = rr;
      r.data[o + 1] = rr;
      r.data[o + 2] = rr;
      r.data[o + 3] = 255;
      const hx = height[y * n + ((x + 1) % n)]! - height[y * n + ((x + n - 1) % n)]!;
      const hy = height[((y + 1) % n) * n + x]! - height[((y + n - 1) % n) * n + x]!;
      const k = 2.2;
      const nx = -hx * k;
      const ny = -hy * k;
      const l = Math.hypot(nx, ny, 1);
      nm.data[o] = (nx / l) * 127 + 128;
      nm.data[o + 1] = (ny / l) * 127 + 128;
      nm.data[o + 2] = (1 / l) * 127 + 128;
      nm.data[o + 3] = 255;
    }
  }
  cA.getContext("2d")!.putImageData(a, 0, 0);
  cR.getContext("2d")!.putImageData(r, 0, 0);
  cN.getContext("2d")!.putImageData(nm, 0, 0);
  return { map: dataTex(cA, true), roughnessMap: dataTex(cR, false), normalMap: dataTex(cN, false) };
}

/** Concrete paving slabs for the sidewalks. */
export function makePaving() {
  return canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#34363c";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5200; i++) {
        const v = 44 + Math.random() * 26;
        ctx.fillStyle = `rgba(${v},${v},${v + 5},0.55)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
      }
      ctx.strokeStyle = "rgba(8,8,10,0.85)";
      ctx.lineWidth = 3;
      for (let i = 0; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 128, 0);
        ctx.lineTo(i * 128, 256);
        ctx.moveTo(0, i * 128);
        ctx.lineTo(256, i * 128);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(120,124,136,0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.strokeRect(i * 128 + 3, 3, 122, 122);
        ctx.strokeRect(i * 128 + 3, 131, 122, 122);
      }
    },
    1,
  );
}

/** Soft radial falloff — light pools, contact shadows, steam. */
export function makeGlow() {
  const tex = canvasTex(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.5)");
    g.addColorStop(0.7, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Billowing steam puff. */
export function makeSteam() {
  const tex = canvasTex(128, 128, (ctx) => {
    for (let i = 0; i < 26; i++) {
      const x = 64 + (Math.random() - 0.5) * 58;
      const y = 64 + (Math.random() - 0.5) * 58;
      const r = 16 + Math.random() * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.16)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Distant city silhouette with lit windows, wraps the horizon. */
export function makeSkyline() {
  const tex = canvasTex(2048, 256, (ctx) => {
    ctx.clearRect(0, 0, 2048, 256);
    let s = 9;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let layer = 0; layer < 2; layer++) {
      let x = -10;
      while (x < 2048) {
        const w = 26 + rnd() * 58;
        const h = (layer === 0 ? 70 : 40) + rnd() * (layer === 0 ? 150 : 110);
        const shade = layer === 0 ? 20 : 11;
        ctx.fillStyle = `rgb(${shade + 6},${shade},${shade + 12})`;
        ctx.fillRect(x, 256 - h, w, h);
        if (rnd() > 0.7) ctx.fillRect(x + w * 0.4, 256 - h - 16, 3, 16);
        const cols = Math.floor(w / 7);
        const rows = Math.floor(h / 9);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rnd() > (layer === 0 ? 0.74 : 0.6)) {
              const t = rnd();
              ctx.fillStyle =
                t > 0.75 ? "rgba(255,150,170,0.85)" : t > 0.5 ? "rgba(150,210,255,0.8)" : "rgba(255,214,150,0.9)";
              ctx.fillRect(x + 3 + c * 7, 256 - h + 4 + r * 9, 3, 4);
            }
          }
        }
        x += w + (layer === 0 ? rnd() * 22 : -4);
      }
    }
  });
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

/** LED dance floor: one tile per cell, tinted at runtime. */
export function makeDanceFloor() {
  const tex = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#050406";
    ctx.fillRect(0, 0, 256, 256);
    const hues = ["#ff3d78", "#49c8ff", "#ffc24a", "#b455ff"];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const hue = hues[(r * 3 + c * 5 + ((r * c) % 3)) % hues.length]!;
        const g = ctx.createRadialGradient(c * 32 + 16, r * 32 + 16, 2, c * 32 + 16, r * 32 + 16, 20);
        g.addColorStop(0, hue);
        g.addColorStop(1, "rgba(0,0,0,0.75)");
        ctx.fillStyle = g;
        ctx.fillRect(c * 32 + 2, r * 32 + 2, 28, 28);
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function makeBrick() {
  return canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#1a1412";
      ctx.fillRect(0, 0, 256, 256);
      const rows = 12;
      const cols = 8;
      const bh = 256 / rows;
      const bw = 256 / cols;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? bw * 0.5 : 0;
        for (let c = -1; c < cols + 1; c++) {
          const shade = 34 + ((r * 13 + c * 7) % 22);
          ctx.fillStyle = `rgb(${shade + 14},${shade},${shade - 6})`;
          ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, 2);
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.fillRect(c * bw + off + 1, r * bh + bh - 4, bw - 2, 3);
        }
      }
    },
    4,
  );
}

/**
 * Building face. `map` is the masonry and frames; `emissiveMap` holds only the
 * lit panes so windows glow and bloom without washing out the wall.
 */
export function makeFacade(seed: number) {
  const W = 512;
  const H = 1024;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const cA = mk();
  const cE = mk();
  const a = cA.getContext("2d")!;
  const e = cE.getContext("2d")!;
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const stone = ["#221f28", "#1b1e27", "#261d1c", "#1d2220"][seed % 4]!;
  a.fillStyle = stone;
  a.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    a.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},0.025)`;
    a.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 1 + rnd() * 2);
  }
  const streak = a.createLinearGradient(0, 0, 0, H);
  streak.addColorStop(0, "rgba(0,0,0,0.42)");
  streak.addColorStop(0.2, "rgba(0,0,0,0)");
  streak.addColorStop(0.86, "rgba(0,0,0,0)");
  streak.addColorStop(1, "rgba(0,0,0,0.5)");
  a.fillStyle = streak;
  a.fillRect(0, 0, W, H);
  a.fillStyle = "#0b0b0f";
  a.fillRect(0, 0, W, 34);
  a.fillStyle = "rgba(255,255,255,0.05)";
  a.fillRect(0, 34, W, 3);
  e.fillStyle = "#000";
  e.fillRect(0, 0, W, H);

  const cols = 5 + (seed % 2);
  const rows = 10;
  const cellW = W / cols;
  const cellH = (H - 60 - 150) / rows;
  const ww = cellW * 0.56;
  const hh = cellH * 0.62;
  for (let r = 0; r < rows; r++) {
    a.fillStyle = "rgba(0,0,0,0.3)";
    a.fillRect(0, 60 + r * cellH + cellH - 5, W, 5);
    a.fillStyle = "rgba(255,255,255,0.035)";
    a.fillRect(0, 60 + r * cellH + cellH - 7, W, 2);
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + (cellW - ww) / 2;
      const y = 60 + r * cellH + (cellH - hh) / 2 - 4;
      a.fillStyle = "#08080b";
      a.fillRect(x - 5, y - 5, ww + 10, hh + 12);
      a.fillStyle = "rgba(255,255,255,0.07)";
      a.fillRect(x - 5, y + hh + 5, ww + 10, 3);
      const lit = rnd() > 0.42;
      const t = rnd();
      const tone = t > 0.82 ? [255, 120, 150] : t > 0.6 ? [140, 205, 240] : [255, 205, 140];
      if (lit) {
        const dim = 0.45 + rnd() * 0.55;
        const g = e.createLinearGradient(0, y, 0, y + hh);
        g.addColorStop(0, `rgba(${tone[0]},${tone[1]},${tone[2]},${0.95 * dim})`);
        g.addColorStop(1, `rgba(${tone[0]},${tone[1]},${tone[2]},${0.5 * dim})`);
        e.fillStyle = g;
        e.fillRect(x, y, ww, hh);
        if (rnd() > 0.5) {
          e.fillStyle = "rgba(0,0,0,0.55)";
          e.fillRect(x, y, ww, hh * (0.2 + rnd() * 0.5));
        }
        a.fillStyle = `rgb(${tone[0] * 0.5},${tone[1] * 0.5},${tone[2] * 0.5})`;
      } else {
        a.fillStyle = "#0d1118";
      }
      a.fillRect(x, y, ww, hh);
      a.fillStyle = "#08080b";
      a.fillRect(x + ww / 2 - 1.5, y, 3, hh);
      a.fillRect(x, y + hh * 0.5 - 1.5, ww, 3);
      e.fillStyle = "#000";
      e.fillRect(x + ww / 2 - 1.5, y, 3, hh);
      e.fillRect(x, y + hh * 0.5 - 1.5, ww, 3);
    }
  }
  // street level: shuttered shopfronts under a lit fascia
  const gy = H - 150;
  a.fillStyle = "#0a0a0d";
  a.fillRect(0, gy, W, 150);
  const fascia = ["#ff5d86", "#6fd0f0", "#f5c268"][seed % 3]!;
  e.fillStyle = fascia;
  e.globalAlpha = 0.55;
  e.fillRect(18, gy + 8, W - 36, 5);
  e.globalAlpha = 1;
  for (let c = 0; c < 3; c++) {
    const x = 18 + c * ((W - 36) / 3) + 6;
    const w = (W - 36) / 3 - 12;
    if ((seed + c) % 3 === 0) {
      // one bay still open: a dim shop window
      a.fillStyle = "#2a2118";
      a.fillRect(x, gy + 26, w, 116);
      const g = e.createLinearGradient(0, gy + 26, 0, gy + 142);
      g.addColorStop(0, "rgba(255,196,128,0.5)");
      g.addColorStop(1, "rgba(255,150,90,0.18)");
      e.fillStyle = g;
      e.fillRect(x + 4, gy + 30, w - 8, 108);
      e.fillStyle = "#000";
      e.fillRect(x + w / 2 - 2, gy + 30, 4, 108);
      continue;
    }
    a.fillStyle = "#15161b";
    a.fillRect(x, gy + 26, w, 116);
    a.strokeStyle = "rgba(255,255,255,0.05)";
    for (let y = gy + 30; y < gy + 140; y += 7) {
      a.beginPath();
      a.moveTo(x, y);
      a.lineTo(x + w, y);
      a.stroke();
    }
  }
  return { map: dataTex(cA, true), emissiveMap: dataTex(cE, true) };
}

export function makeFloral() {
  const tex = canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#12080c";
      ctx.fillRect(0, 0, 256, 256);
      const roses: [number, number][] = [
        [40, 46],
        [128, 28],
        [208, 72],
        [68, 132],
        [164, 158],
        [28, 208],
        [214, 204],
        [118, 98],
        [176, 48],
        [92, 210],
      ];
      for (const [x, y] of roses) {
        ctx.fillStyle = "#2a4a28";
        ctx.beginPath();
        ctx.ellipse(x + 14, y + 8, 16, 6, 0.5, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9;
          ctx.fillStyle = i % 2 ? "#c42a3a" : "#8a1828";
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 9, 6, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#3a0c10";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    2,
  );
  return tex;
}

export function makeCarpet() {
  return canvasTex(
    64,
    256,
    (ctx) => {
      ctx.fillStyle = "#6e1220";
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = "#8a1828";
      ctx.fillRect(6, 0, 52, 256);
      ctx.fillStyle = "#4a0c14";
      ctx.fillRect(0, 0, 4, 256);
      ctx.fillRect(60, 0, 4, 256);
      for (let y = 0; y < 256; y += 8) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(8, y, 48, 1);
      }
    },
    1,
  );
}

export function makeMarble() {
  return canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#2a2428";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(180,160,150,0.18)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 256);
        ctx.bezierCurveTo(
          Math.random() * 256,
          Math.random() * 256,
          Math.random() * 256,
          Math.random() * 256,
          Math.random() * 256,
          Math.random() * 256,
        );
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,80,120,0.07)";
      for (let i = 0; i < 8; i++) {
        ctx.fillRect((i % 4) * 64 + 4, Math.floor(i / 4) * 128 + 4, 56, 56);
      }
    },
    6,
  );
}

export function makeMoltSign() {
  const tex = canvasTex(512, 160, (ctx) => {
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, 512, 160);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff4d7a";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ff6b8a";
    ctx.font = "700 40px Impact, Arial Black, sans-serif";
    ctx.fillText("DON STERLEONE", 256, 82);
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffe4ec";
    ctx.fillText("DON STERLEONE", 256, 82);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

export function makeNeonWord(word: string, color: string) {
  const tex = canvasTex(256, 64, (ctx) => {
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, 256, 64);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.font = "700 36px Impact, Arial Black, sans-serif";
    ctx.fillText(word, 128, 34);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  return tex;
}
