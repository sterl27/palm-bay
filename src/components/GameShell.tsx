import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Volume2, VolumeX } from "lucide-react";
import { Minimap } from "@/components/Minimap";
import { BEATS, LEADS, type LeadId } from "@/game/constants";
import { useGameStore } from "@/game/store";

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const bindings = useGameStore((s) => s.bindings);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let game: { dispose: () => void } | null = null;
    void import("@/game/engine").then(({ createGame }) => {
      if (disposed || !canvasRef.current) return;
      game = createGame(canvasRef.current);
      setReady(true);
    });
    return () => {
      disposed = true;
      game?.dispose();
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-foam select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="film-grain absolute inset-0 z-20" />
      <div className="letterbox pointer-events-none absolute top-0 right-0 left-0 z-20 h-8 sm:h-11" />
      <div className="letterbox pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-8 sm:h-11" />

      {(phase === "loading" || phase === "title") && <TitleScreen ready={ready} />}
      {(phase === "play" || phase === "pause") && <Hud />}
      {(phase === "play" || phase === "pause") && <Slate />}
      {phase === "play" && <Reel />}
      {phase === "pause" && <PauseMenu />}
      {phase === "win" && <WinScreen />}
      {phase === "play" && <TouchPad />}
      {phase === "play" && <CornerControls />}
    </div>
  );
}

function TitleScreen({ ready }: { ready: boolean }) {
  const start = useGameStore((s) => s.bindings?.start);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-end px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10">
      <video
        className="pointer-events-none absolute inset-0 size-full object-cover"
        src="/cinematics/arrival.mp4"
        autoPlay
        muted
        loop
        playsInline
        poster="/avatars/hero.png"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-ink/25" />
      <div className="relative w-full max-w-lg text-center">
        <p className="mb-3 text-xs font-medium tracking-[0.42em] text-muted uppercase">Cinematic avatars · one night</p>
        <h1 className="font-display text-[clamp(2.8rem,12vw,5.4rem)] leading-[0.9] font-semibold tracking-tight text-foam">
          sterleone
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted">
          Real-life leads. Pull the black car up to the rope, walk it, then finish the alley like the picture.
        </p>
        <LeadPick />
        <button
          type="button"
          disabled={!ready || !start}
          onClick={() => start?.()}
          className="mt-8 inline-flex h-12 min-w-48 items-center justify-center rounded-md bg-foam px-8 text-sm font-semibold tracking-wide text-ink transition-transform duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:scale-[0.99] active:scale-[0.98] disabled:opacity-50"
        >
          {ready ? "Enter the night" : "Loading"}
        </button>
        <p className="mt-6 hidden text-[11px] leading-relaxed text-faint md:block">
          WASD drive or walk · F doors · Space own the room / hold the alley · Esc pause
        </p>
        <p className="mt-6 text-[11px] leading-relaxed text-faint md:hidden">
          Stick to drive · Door to step out · Hold to own the room and the alley
        </p>
      </div>
    </div>
  );
}

function Hud() {
  const chapter = useGameStore((s) => s.chapter);
  const chapterTitle = useGameStore((s) => s.chapterTitle);
  const objective = useGameStore((s) => s.objective);
  const prompt = useGameStore((s) => s.prompt);
  const toast = useGameStore((s) => s.toast);
  const speed = useGameStore((s) => s.speed);
  const inVehicle = useGameStore((s) => s.inVehicle);
  const hold = useGameStore((s) => s.hold);
  const caption = useGameStore((s) => s.caption);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <LeadMark />
      <Beats />
      <div className="absolute top-[max(2.75rem,env(safe-area-inset-top))] left-1/2 w-[min(92vw,28rem)] -translate-x-1/2 text-center">
        <p className="text-[10px] font-medium tracking-[0.32em] text-muted uppercase">
          Chapter 0{chapter + 1} · {chapterTitle}
        </p>
        <p className="font-display mt-1 text-xl text-foam sm:text-2xl">{objective}</p>
        {caption ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-snug text-foam/90">{caption}</p>
        ) : null}
      </div>

      <div className="absolute top-28 left-[max(0.75rem,env(safe-area-inset-left))] flex flex-col items-start gap-2 md:top-auto md:bottom-[max(2.75rem,env(safe-area-inset-bottom))]">
        <Minimap />
        {inVehicle ? (
          <div className="rounded-md border border-border bg-ink/60 px-3 py-1.5 text-[11px] text-muted">
            Night · <span className="tabular-nums text-foam">{Math.round(speed * 2.2)}</span>
          </div>
        ) : null}
      </div>

      {hold > 0 && hold < 1 ? (
        <div className="absolute bottom-32 left-1/2 w-44 -translate-x-1/2">
          <div className="h-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-foam" style={{ width: `${hold * 100}%` }} />
          </div>
        </div>
      ) : null}

      {prompt ? (
        <p className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-md bg-ink/80 px-4 py-2 text-sm font-medium text-foam">
          {prompt}
        </p>
      ) : null}
      {toast ? (
        <p className="absolute top-36 left-1/2 -translate-x-1/2 rounded-md border border-border bg-surface px-4 py-2 text-sm text-foam">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function Slate() {
  const slate = useGameStore((s) => s.slate);
  const chapter = useGameStore((s) => s.chapter);
  if (!slate) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[10px] font-medium tracking-[0.42em] text-muted uppercase">Chapter 0{chapter + 1}</p>
        <p className="font-display mt-1 text-5xl text-foam sm:text-6xl">{slate}</p>
      </div>
    </div>
  );
}

const REEL_LINES = [
  { t: 0, line: "Nights alive. We own the streets. No retreat." },
  { t: 2.1, line: "Outlaw hustle. Cash rules. Break the noose." },
  { t: 5.1, line: "Eyes on the prize. Steam in the dark. We go hard." },
];

function Reel() {
  const reel = useGameStore((s) => s.reel);
  const muted = useGameStore((s) => s.muted);
  const skip = useGameStore((s) => s.bindings?.skipReel);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [line, setLine] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reel !== "alley") return;
    video.muted = muted;
    const played = video.play();
    if (played) {
      played.catch(() => {
        video.muted = true;
        void video.play();
      });
    }
  }, [reel, muted]);

  if (reel !== "alley") return null;
  return (
    <div className="absolute inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        src="/cinematics/alley.mp4"
        autoPlay
        playsInline
        muted={muted}
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime;
          let next = REEL_LINES[0]!.line;
          for (const row of REEL_LINES) if (time >= row.t) next = row.line;
          setLine((prev) => (prev === next ? prev : next));
        }}
        onEnded={() => skip?.()}
      />
      <div className="letterbox pointer-events-none absolute top-0 right-0 left-0 h-12 sm:h-16" />
      <div className="letterbox pointer-events-none absolute right-0 bottom-0 left-0 h-16 sm:h-24" />
      <div className="absolute inset-x-0 bottom-16 z-10 px-6 text-center sm:bottom-24">
        <p className="text-[10px] font-medium tracking-[0.36em] text-foam/70 uppercase">After hours</p>
        <p className="font-display mt-1 text-xl text-foam sm:text-3xl">{line}</p>
      </div>
      <button
        type="button"
        onClick={() => skip?.()}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-10 h-11 rounded-md border border-border bg-ink/70 px-4 text-xs font-semibold tracking-wide text-foam uppercase"
      >
        Skip
      </button>
    </div>
  );
}

function PauseMenu() {
  const bindings = useGameStore((s) => s.bindings);
  const muted = useGameStore((s) => s.muted);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/70 px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-hud">
        <p className="font-display text-4xl text-foam">Paused</p>
        <p className="mt-1 text-sm text-muted">The night holds.</p>
        <div className="mt-6 flex flex-col gap-2">
          <MenuBtn onClick={() => bindings?.resume()}>Resume</MenuBtn>
          <MenuBtn onClick={() => bindings?.restart()} tone="ghost">
            Restart
          </MenuBtn>
          <MenuBtn onClick={() => bindings?.toggleMute()} tone="ghost">
            <span className="inline-flex items-center gap-2">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              {muted ? "Unmute" : "Mute"}
            </span>
          </MenuBtn>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-faint">
          W/S drive or walk · A/D turn · F enter cars and doors · Space hold in the alley
        </p>
      </div>
    </div>
  );
}

function WinScreen() {
  const bindings = useGameStore((s) => s.bindings);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink/55 px-6">
      <p className="text-[10px] font-medium tracking-[0.4em] text-muted uppercase">The end</p>
      <h2 className="font-display mt-2 text-[clamp(3rem,12vw,6rem)] leading-none text-foam">You owned the night</h2>
      <p className="mt-4 max-w-sm text-center text-sm text-muted">The carpet. The floor. The alley. Cut.</p>
      <button
        type="button"
        onClick={() => bindings?.restart()}
        className="mt-8 inline-flex h-12 min-w-40 items-center justify-center rounded-md bg-foam px-8 text-sm font-semibold text-ink"
      >
        Play again
      </button>
    </div>
  );
}

function MenuBtn({
  children,
  onClick,
  tone = "solid",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "solid" | "ghost";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "solid"
          ? "flex h-11 items-center justify-center rounded-md bg-foam text-sm font-semibold text-ink"
          : "flex h-11 items-center justify-center rounded-md border border-border bg-ink-2 text-sm font-medium text-foam"
      }
    >
      {children}
    </button>
  );
}

function chapterLabel(chapter: number) {
  if (chapter >= 3) return "Alley";
  if (chapter === 2) return "Room";
  return "Hold";
}

function TouchPad() {
  const bindings = useGameStore((s) => s.bindings);
  const inVehicle = useGameStore((s) => s.inVehicle);
  const chapter = useGameStore((s) => s.chapter);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
    setShow(coarse);
  }, []);

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <Stick
        onChange={(x, y) => {
          bindings?.setTouch(-x, y);
        }}
      />
      <div className="pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        <RoundBtn label={inVehicle ? "Exit" : "Enter"} onClick={() => bindings?.tapEnter()} />
        <HoldBtn
          label={chapterLabel(chapter)}
          onDown={() => bindings?.setActionHold(true)}
          onUp={() => bindings?.setActionHold(false)}
        />
        <RoundBtn label="Pause" onClick={() => bindings?.pause()} />
      </div>
    </div>
  );
}

function RoundBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 min-w-14 rounded-full border border-border bg-ink/70 px-3 text-xs font-semibold uppercase tracking-wide text-foam"
    >
      {label}
    </button>
  );
}

function HoldBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="h-14 min-w-14 rounded-full border border-border bg-ink/70 px-3 text-xs font-semibold uppercase tracking-wide text-foam"
    >
      {label}
    </button>
  );
}

function Stick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);

  function setFrom(e: PointerEvent | React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let x = (e.clientX - cx) / (r.width * 0.42);
    let y = (cy - e.clientY) / (r.height * 0.42);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    onChange(x, y);
  }

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] size-32 rounded-full border border-border bg-ink/35"
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        setFrom(e);
      }}
      onPointerUp={() => {
        pid.current = null;
        onChange(0, 0);
      }}
      onPointerCancel={() => {
        pid.current = null;
        onChange(0, 0);
      }}
    >
      <div className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foam/25" />
    </div>
  );
}

function LeadPick() {
  const lead = useGameStore((s) => s.lead);
  const setLead = useGameStore((s) => s.setLead);
  return (
    <div className="mt-6 flex items-start justify-center gap-3">
      {LEADS.map((row) => {
        const on = row.id === lead;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => setLead(row.id as LeadId)}
            className={"flex w-24 flex-col items-center gap-1.5 rounded-md border px-2 py-2 " + (on ? "border-foam bg-ink/70" : "border-border bg-ink/40")}
            aria-pressed={on}
          >
            <img src={row.face} alt="" className="size-12 rounded-full border border-border object-cover sm:size-14" />
            <span className="text-[10px] tracking-[0.16em] text-foam uppercase">{row.label}</span>
            <span className="text-[10px] leading-snug text-faint">{row.line}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeadMark() {
  const lead = useGameStore((s) => s.lead);
  const row = LEADS.find((item) => item.id === lead) ?? LEADS[0];
  return (
    <img
      src={row.face}
      alt=""
      className="absolute top-[max(2.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] size-11 rounded-full border border-border object-cover shadow-hud sm:size-12"
    />
  );
}

function Beats() {
  const chapter = useGameStore((s) => s.chapter);
  return (
    <ol className="absolute top-[max(6.4rem,calc(env(safe-area-inset-top)+4.2rem))] left-[max(0.75rem,env(safe-area-inset-left))] flex max-w-40 flex-col gap-1">
      {BEATS.map((beat, i) => (
        <li key={beat} className={"text-[10px] tracking-wide " + (i < chapter ? "text-foam" : i === chapter ? "text-foam" : "text-faint")}>
          {i < chapter ? "· " : i === chapter ? "→ " : "  "}
          {beat}
        </li>
      ))}
    </ol>
  );
}

function CornerControls() {
  const bindings = useGameStore((s) => s.bindings);
  const muted = useGameStore((s) => s.muted);
  return (
    <div className="absolute top-[max(2.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-30 flex gap-2">
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-md border border-border bg-ink/70 text-foam"
        onClick={() => bindings?.toggleMute()}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-md border border-border bg-ink/70 text-foam"
        onClick={() => bindings?.pause()}
        aria-label="Pause"
      >
        <Pause className="size-5" />
      </button>
    </div>
  );
}
