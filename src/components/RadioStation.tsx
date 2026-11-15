import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/store";

declare global {
  interface Window {
    SC?: {
      Widget: (iframe: HTMLIFrameElement) => SCWidget;
    };
  }
}

interface SCWidget {
  bind(event: string, cb: (e?: unknown) => void): void;
  play(): void;
  pause(): void;
  next(): void;
  prev(): void;
  setVolume(v: number): void;
  getCurrentSound(
    cb: (sound: { title: string; artwork_url: string | null } | null) => void,
  ): void;
}

export function RadioStation() {
  const inVehicle = useGameStore((s) => s.inVehicle);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [on, setOn] = useState(false);
  const [volume, setVolume] = useState(70);
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    artwork: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [popup, setPopup] = useState(false);

  // Load SoundCloud Widget API
  useEffect(() => {
    if (document.querySelector('script[src*="soundcloud.com/player/api.js"]'))
      return;
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js";
    document.head.appendChild(s);
  }, []);

  // Init widget after iframe mounts + SC API loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let attempts = 0;
    const tryInit = () => {
      if (!window.SC?.Widget) {
        if (++attempts < 40) setTimeout(tryInit, 250);
        return;
      }
      const widget = window.SC.Widget(iframe);
      widgetRef.current = widget;
      widget.bind("play", () => {
        widget.getCurrentSound((sound) => {
          if (!sound) return;
          setNowPlaying({
            title: sound.title,
            artwork: (sound.artwork_url ?? "").replace("-large", "-t300x300"),
          });
          setPopup(true);
          setTimeout(() => setPopup(false), 3000);
        });
      });
      widget.bind("play_progress", (e) => {
        const ev = e as { relativePosition?: number } | undefined;
        setProgress(ev?.relativePosition ?? 0);
      });
    };
    const t = setTimeout(tryInit, 600);
    return () => clearTimeout(t);
  }, []);

  // Play/pause based on radio on/off and inVehicle state
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    if (on && inVehicle) {
      widget.play();
    } else {
      widget.pause();
    }
  }, [on, inVehicle]);

  // Sync volume
  useEffect(() => {
    widgetRef.current?.setVolume(volume);
  }, [volume]);

  // Key bindings — R toggles, , / . skip, - / = volume
  // input.ts calls preventDefault on KeyR but NOT stopPropagation, so this listener fires too
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyR") {
        setOn((prev) => !prev);
      } else if (e.code === "Comma") {
        widgetRef.current?.prev();
      } else if (e.code === "Period") {
        widgetRef.current?.next();
      } else if (e.code === "Minus") {
        setVolume((v) => Math.max(0, v - 10));
      } else if (e.code === "Equal") {
        setVolume((v) => Math.min(100, v + 10));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const playing = on && inVehicle;
  const prev = () => widgetRef.current?.prev();
  const next = () => widgetRef.current?.next();
  const volDown = () => setVolume((v) => Math.max(0, v - 10));
  const volUp = () => setVolume((v) => Math.min(100, v + 10));
  const btn =
    "grid size-7 shrink-0 place-items-center rounded border border-border bg-ink/80 text-[11px] text-foam/90 backdrop-blur-sm select-none active:bg-foam/20";

  return (
    <div
      className={[
        "absolute left-[max(0.75rem,env(safe-area-inset-left))] z-30",
        "bottom-44 md:bottom-[16rem]",
        "transition-all duration-500",
        popup ? "w-52" : "w-36",
        inVehicle ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {/* Hidden SoundCloud widget iframe */}
      <iframe
        ref={iframeRef}
        title="S73RL Radio"
        className="hidden"
        src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/s73rl&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false"
      />

      {/* Power toggle — always reachable in the car, works on touch */}
      <button
        type="button"
        aria-label={on ? "Radio off" : "Radio on"}
        aria-pressed={on}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOn((v) => !v)}
        className={[
          "mb-1 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] tracking-[0.3em] uppercase backdrop-blur-sm",
          on
            ? "border-foam/60 bg-ink/80 text-foam"
            : "border-border bg-ink/60 text-muted",
        ].join(" ")}
      >
        <span
          className={[
            "size-1.5 rounded-full",
            on ? "bg-foam" : "bg-muted/60",
          ].join(" ")}
        />
        Radio {on ? "on" : "off"}
      </button>

      <div
        className={[
          "rounded-md border border-border bg-ink/80 p-2.5 backdrop-blur-sm transition-opacity duration-300",
          on ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="mb-1.5 text-[9px] tracking-[0.3em] text-muted uppercase">
          S73RL FM 107.3
        </p>
        <div className="flex items-center gap-2">
          {nowPlaying?.artwork ? (
            <img
              src={nowPlaying.artwork}
              alt=""
              className="size-8 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="size-8 shrink-0 rounded bg-surface" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-foam">
              {nowPlaying?.title ?? "—"}
            </p>
            <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-foam/70 transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <LevelMeter playing={playing} />
        </div>

        {/* Transport + volume — mirrors , . - = keys */}
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous track"
            className={btn}
            onClick={prev}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next track"
            className={btn}
            onClick={next}
          >
            ›
          </button>
          <div className="flex-1" />
          <button
            type="button"
            aria-label="Volume down"
            className={btn}
            onClick={volDown}
          >
            −
          </button>
          <span className="w-6 text-center text-[9px] tabular-nums text-muted">
            {volume}
          </span>
          <button
            type="button"
            aria-label="Volume up"
            className={btn}
            onClick={volUp}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function LevelMeter({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-5 shrink-0 items-end gap-px">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-0.5 rounded-[1px] bg-foam/60"
          style={{
            height: `${40 + i * 15}%`,
            transformOrigin: "bottom",
            animation: playing
              ? `level-bounce ${0.45 + i * 0.07}s ease-in-out ${i * 0.08}s infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
