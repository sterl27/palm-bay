import { useEffect, useRef } from "react";
import { useGameStore } from "@/game/store";

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const x = useGameStore((s) => s.x);
  const z = useGameStore((s) => s.z);
  const yaw = useGameStore((s) => s.yaw);
  const blipX = useGameStore((s) => s.blipX);
  const blipZ = useGameStore((s) => s.blipZ);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0c0b10";
    ctx.fillRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);
    ctx.rotate(-yaw);
    const scale = 2.1;
    ctx.scale(scale, scale);
    ctx.translate(-x, -z);

    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(-8, -24, 16, 78);

    ctx.fillStyle = "#3a1820";
    ctx.fillRect(8, -8, 18, 20);

    ctx.fillStyle = "#16181e";
    ctx.fillRect(26, -12, 18, 26);

    if (blipX !== null && blipZ !== null) {
      ctx.fillStyle = "#f3efe8";
      ctx.beginPath();
      ctx.arc(blipX, blipZ, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#f3efe8";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(243,239,232,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [x, z, yaw, blipX, blipZ]);

  return (
    <canvas
      ref={ref}
      width={148}
      height={148}
      className="size-[min(36vw,148px)] rounded-full border border-border shadow-hud"
      aria-label="Map"
    />
  );
}
