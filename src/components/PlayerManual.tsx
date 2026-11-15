import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

const CONTROLS: [string, string, string][] = [
  ["Drive / walk", "WASD or arrow keys", "Left stick"],
  ["Step out, open doors, talk, pocket the envelope", "F or E", "Door button"],
  ["Take the floor / hold the alley", "Space (hold)", "Hold button"],
  ["Sprint (on foot)", "Shift", "—"],
  ["Pause", "Esc or P", "Pause button"],
  ["Mute", "M", "—"],
  ["Radio on / off", "R", "—"],
  ["Radio previous / next track", ", / .", "—"],
  ["Radio volume", "- / =", "—"],
];

const LEADS: [string, string, string, string][] = [
  [
    "Don Sterleone (Lead)",
    "The car. The rope. The walk.",
    "Quickest car (+16% accel). One hard bump is forgiven.",
    "Clean park +30",
  ],
  [
    "The Voice",
    "Owns the room. The floor answers.",
    "Walks 18% faster. Takes the floor 1.7x faster.",
    "Floor +40",
  ],
  [
    "The Quiet",
    "Slower step. The alley is yours.",
    "Walks 20% slower, slower car. Holds the alley 1.55x faster.",
    "Envelope +28",
  ],
];

const BEATS: [string, string, string][] = [
  [
    "Pull the car to the rope",
    "Roll up to the curb under 2.2 speed and press F to step out.",
    "Clean park +30 Don / +18",
  ],
  [
    "Step out",
    "Stepping out at the curb ends Arrival and starts The Carpet.",
    "—",
  ],
  [
    "Walk the carpet",
    "Walk the rope to the front door and press F to enter.",
    "—",
  ],
  [
    "Pocket the envelope",
    "Press F at the bar. Nothing else in the club opens until you do.",
    "+28 Quiet / +18",
  ],
  [
    "Own the floor",
    "Hold Space in the VIP area until the bar fills (1.5 s). Let go and it drains.",
    "+40 Voice / +22",
  ],
  [
    "Hold the alley",
    "Through the back door. Hold Space at the standoff until the bar fills. That ends the night.",
    "+30 night 1 / +50 night 2",
  ],
];

export function PlayerManual({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    // Capture phase so Esc closes the manual instead of also resuming the game.
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
      className="absolute inset-0 z-[60] flex items-center justify-center bg-ink/80 px-3 py-[max(1rem,env(safe-area-inset-top))]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-hud"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 pt-5 pb-4 sm:px-6">
          <div>
            <p className="text-[10px] font-medium tracking-[0.42em] text-muted uppercase">
              Player manual
            </p>
            <h2
              id="manual-title"
              className="font-display mt-1 text-3xl text-foam sm:text-4xl"
            >
              One night. Six beats. Three strikes.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-ink-2 text-foam"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 text-sm leading-relaxed text-muted sm:px-6">
          <Section title="Controls">
            <Table head={["Action", "Keyboard", "Mobile"]} rows={CONTROLS} />
          </Section>

          <Section title="Pick your lead">
            <p className="mb-3">
              Each lead is faster at one beat and pays more for it.
            </p>
            <ul className="flex flex-col gap-3">
              {LEADS.map(([name, line, plays, bonus]) => (
                <li
                  key={name}
                  className="rounded-md border border-border bg-ink-2 px-3 py-2.5"
                >
                  <p className="text-foam">
                    <span className="font-medium">{name}</span>{" "}
                    <span className="text-faint">· {bonus}</span>
                  </p>
                  <p className="text-xs text-faint italic">{line}</p>
                  <p className="mt-1 text-xs">{plays}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="The six beats">
            <p className="mb-3">
              Follow the HUD prompt in order. Doors stay shut until the beat
              before them is done.
            </p>
            <ol className="flex flex-col gap-2">
              {BEATS.map(([beat, how, pts], i) => (
                <li key={beat} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
                  <span className="font-display text-lg leading-6 text-foam">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-foam">
                      {beat} <span className="text-xs text-faint">· {pts}</span>
                    </p>
                    <p className="text-xs">{how}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Strikes and score">
            <p>
              Three strikes and the night is cut. Each strike costs 12 points.
              Score never drops below zero and carries into night two.
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs">
              <li>
                <span className="text-foam">Hard bump</span>: hitting anything
                in the car above speed 6. Don gets one free hit.
              </li>
              <li>
                <span className="text-foam">The room clocked you</span>: night 2
                only, 14 seconds inside without the envelope.
              </li>
              <li>
                <span className="text-foam">You blinked</span>: night 2 only,
                letting the alley bar drain empty after starting it.
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Talking to anyone with F is +6 the first time. Work the room.
            </p>
          </Section>

          <Section title="Second night">
            <p>
              Same lead, score kept, same six beats, harder: a 14-second
              envelope clock, the alley hold takes 2.6 s instead of 1.7 s and
              drains twice as fast, and draining it empty is a strike. The alley
              pays +50.
            </p>
          </Section>

          <Section title="The radio">
            <p>
              Press R in the car for S73RL FM 107.3, live from
              soundcloud.com/s73rl. It pauses when you step out and comes back
              when you get in. M mutes everything, radio included.
            </p>
          </Section>

          <Section title="Tips">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-xs">
              <li>
                Ease off well before the rope. The bonus is for parking soft.
              </li>
              <li>
                The man in the alley tells you something that makes the standoff
                20% easier. Talk to him first.
              </li>
              <li>Envelope first, always. Then hold Space; don't tap it.</li>
              <li>
                Night 2 with The Quiet is the easiest road to the +50 alley.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-medium tracking-[0.32em] text-foam uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-ink-2 text-faint">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={"px-3 py-2 " + (i === 0 ? "text-foam" : "")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
