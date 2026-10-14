# Palm Bay

A GTA-style cinematic browser game. One night in the city — pull the black car up to the rope, walk the carpet, and finish the alley.

**Live:** [palm-bay-eight.vercel.app](https://palm-bay-eight.vercel.app)

---

## Gameplay

Six beats across two nights:

1. Pull the car to the rope
2. Step out
3. Walk the carpet
4. Pocket the envelope
5. Own the floor
6. Hold the alley

Drive and walk as one of three leads. Each has a different pace and presence on the carpet. The scoring system is based on heat — how well you own each beat.

---

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Drive / Walk | WASD or Arrow keys | Left stick |
| Enter / Exit car, open doors | F or E | Door button |
| Hold the room / alley | Space (hold) | Hold button |
| Sprint | Shift | — |
| Pause | Esc or P | Pause button |
| Mute | M | — |
| Radio on/off | R | — |
| Radio prev / next track | `,` / `.` | — |
| Radio volume | `-` / `=` | — |

---

## In-Car Radio

Press **R** while in a vehicle to toggle S73RL FM 107.3 — a live stream from the [s73rl SoundCloud profile](https://soundcloud.com/s73rl). The radio pauses automatically when you exit the car and resumes when you get back in.

The HUD card shows cover art, track title, and a progress bar. On a track change it expands briefly before settling back to its compact size.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | TanStack Start (React 19, SSR) |
| Renderer | Three.js |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Radio | SoundCloud Widget API (iframe, no API key) |
| Auth / infra | better-auth, PGlite |
| Deploy | Vercel (auto-deploy on push to `main`) |

---

## Project Structure

```
src/
  components/
    GameShell.tsx       # Root HUD — mounts canvas, all overlays
    Minimap.tsx         # Canvas-based radar
    RadioStation.tsx    # In-car radio widget (SoundCloud)
  game/
    engine.ts           # Game loop, Three.js scene setup
    sim.ts              # Physics simulation
    store.ts            # Zustand store (HudSnap + bindings)
    input.ts            # Keyboard / gamepad / touch input
    constants.ts        # BEATS, LEADS, CHAPTERS, ZONES, tuning
    audio.ts            # Howler-based ambient audio
    world.ts            # Static geometry / level layout
    meshes.ts           # Three.js mesh factories
    textures.ts         # Texture loaders
  routes/
    index.tsx           # Single route → <GameShell />
    __root.tsx          # Root layout
  lib/
    auth/               # better-auth server + client helpers
    multiplayer/        # P2P session layer
  styles.css            # Tailwind theme tokens + keyframes
public/
  avatars/              # Lead character face images
  brand/                # Wordmark / title card
  cinematics/           # arrival.mp4, alley.mp4
  textures/             # Road, building, ground textures
```

---

## Dev Setup

```bash
pnpm install
pnpm dev          # starts on http://localhost:8080
```

```bash
pnpm typecheck    # zero-error baseline
pnpm test         # unit tests
pnpm build        # production build + DB migrations
```

---

## Deployment

The repo is connected to Vercel. Every push to `main` triggers a production deploy. Preview deployments are created automatically for all pull requests.
