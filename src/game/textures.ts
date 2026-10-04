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

export function makeAsphalt() {
  return canvasTex(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#16181c";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2400; i++) {
        const n = 18 + Math.random() * 22;
        ctx.fillStyle = `rgb(${n},${n},${n + 4})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      ctx.fillStyle = "rgba(90,110,140,0.08)";
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * 256, Math.random() * 256, 18 + Math.random() * 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    14,
  );
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
          const shade = 38 + ((r * 13 + c * 7) % 18);
          ctx.fillStyle = `rgb(${shade + 8},${shade},${shade - 4})`;
          ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
        }
      }
    },
    4,
  );
}

export function makeFacade(seed: number) {
  return canvasTex(256, 512, (ctx) => {
    ctx.fillStyle = seed % 2 === 0 ? "#1c1a22" : "#161820";
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, 0, 256, 22);
    const cols = 4;
    const rows = 9;
    const ww = 34;
    const hh = 26;
    const gapX = (256 - cols * ww) / (cols + 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = (seed + r * 7 + c * 13) % 5 !== 0;
        const hue = (seed + r + c) % 3;
        if (lit) {
          ctx.fillStyle = hue === 0 ? "#f0c070" : hue === 1 ? "#7ec8e0" : "#e07090";
        } else {
          ctx.fillStyle = "#0e1218";
        }
        ctx.fillRect(gapX + c * (ww + gapX), 40 + r * (hh + 20), ww, hh);
      }
    }
  });
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
    ctx.font = "700 52px Impact, Arial Black, sans-serif";
    ctx.fillText("sterleone", 256, 82);
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffe4ec";
    ctx.fillText("sterleone", 256, 82);
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
