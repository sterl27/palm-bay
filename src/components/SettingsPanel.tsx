import * as Tabs from "@radix-ui/react-tabs";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { X } from "lucide-react";
import { useSettings, QUALITY_PRESETS, type QualityPreset, type Settings } from "@/game/settings";
import { useGameStore } from "@/game/store";

interface Props {
  onClose: () => void;
}

function applyAll(patch: Partial<Settings>) {
  const next = { ...useSettings.getState(), ...patch };
  useSettings.getState().set(patch);
  useGameStore.getState().bindings?.applySettings(next);
}

// ── primitives ────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Sep() {
  return <div className="my-0.5 h-px bg-border" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 mb-1 text-[10px] font-medium tracking-[0.3em] text-faint uppercase first:mt-0">{children}</p>;
}

function SettingSlider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="w-8 text-right text-xs tabular-nums text-faint">{label}</span>}
      <Slider.Root
        className="relative flex h-4 w-32 touch-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v!)}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-surface-2">
          <Slider.Range className="absolute h-full rounded-full bg-foam/60" />
        </Slider.Track>
        <Slider.Thumb className="block size-3.5 rounded-full bg-foam shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-foam/60" />
      </Slider.Root>
    </div>
  );
}

function SettingSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-5 w-9 rounded-full bg-surface-2 transition-colors data-[state=checked]:bg-foam/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-foam/60"
    >
      <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-muted shadow transition-transform data-[state=checked]:translate-x-4.5 data-[state=checked]:bg-foam" />
    </Switch.Root>
  );
}

// ── tabs ─────────────────────────────────────────────────────────────────────

function PictureTab() {
  const s = useSettings();
  const presets: QualityPreset[] = ["low", "medium", "high", "ultra"];

  return (
    <div>
      <SectionLabel>Quality preset</SectionLabel>
      <div className="mb-1 flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyAll(QUALITY_PRESETS[p])}
            className="flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors"
            style={{
              borderColor: s.quality === p ? "var(--color-foam)" : "var(--color-border)",
              color: s.quality === p ? "var(--color-foam)" : "var(--color-muted)",
              background: s.quality === p ? "color-mix(in oklab, var(--color-foam) 8%, transparent)" : "transparent",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <Sep />
      <SectionLabel>Display</SectionLabel>

      <Row label="Resolution">
        <SettingSlider
          value={s.pixelRatio}
          min={0.5}
          max={2.0}
          step={0.25}
          onChange={(v) => applyAll({ pixelRatio: v })}
          label={`${s.pixelRatio.toFixed(2)}×`}
        />
      </Row>
      <Row label="Field of view">
        <SettingSlider
          value={s.fov}
          min={45}
          max={80}
          step={1}
          onChange={(v) => applyAll({ fov: v })}
          label={`${s.fov}°`}
        />
      </Row>
      <Row label="Frame cap">
        <div className="flex gap-1">
          {([0, 30, 60] as const).map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => applyAll({ frameCap: cap })}
              className="rounded px-2 py-1 text-xs transition-colors"
              style={{
                background: s.frameCap === cap ? "color-mix(in oklab, var(--color-foam) 12%, transparent)" : "transparent",
                color: s.frameCap === cap ? "var(--color-foam)" : "var(--color-muted)",
                border: `1px solid ${s.frameCap === cap ? "var(--color-foam)" : "var(--color-border)"}`,
              }}
            >
              {cap === 0 ? "Off" : `${cap}`}
            </button>
          ))}
        </div>
      </Row>

      <Sep />
      <SectionLabel>Effects</SectionLabel>

      <Row label="Shadows">
        <SettingSwitch checked={s.shadowsEnabled} onChange={(v) => applyAll({ shadowsEnabled: v })} />
      </Row>
      <Row label="Bloom">
        <SettingSwitch checked={s.bloomEnabled} onChange={(v) => applyAll({ bloomEnabled: v })} />
      </Row>
      <Row label="Crowd density">
        <SettingSlider
          value={s.crowdDensity}
          min={0}
          max={1}
          step={0.1}
          onChange={(v) => applyAll({ crowdDensity: v })}
          label={`${Math.round(s.crowdDensity * 100)}%`}
        />
      </Row>
      <Row label="Film grain">
        <SettingSwitch checked={s.filmGrain} onChange={(v) => applyAll({ filmGrain: v })} />
      </Row>
      <Row label="Letterbox">
        <SettingSwitch checked={s.letterbox} onChange={(v) => applyAll({ letterbox: v })} />
      </Row>
    </div>
  );
}

function SoundTab() {
  const s = useSettings();
  return (
    <div>
      <SectionLabel>Volumes</SectionLabel>
      <Row label="Master">
        <SettingSlider
          value={s.masterVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => applyAll({ masterVolume: v })}
          label={`${Math.round(s.masterVolume * 100)}%`}
        />
      </Row>
      <Row label="S73RL FM">
        <SettingSlider
          value={s.radioVolume}
          min={0}
          max={100}
          step={5}
          onChange={(v) => applyAll({ radioVolume: v })}
          label={`${Math.round(s.radioVolume)}%`}
        />
      </Row>
      <Row label="Effects">
        <SettingSlider
          value={s.sfxVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => applyAll({ sfxVolume: v })}
          label={`${Math.round(s.sfxVolume * 100)}%`}
        />
      </Row>
      <Row label="Music">
        <SettingSlider
          value={s.musicVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => applyAll({ musicVolume: v })}
          label={`${Math.round(s.musicVolume * 100)}%`}
        />
      </Row>
      <Sep />
      <SectionLabel>Behavior</SectionLabel>
      <Row label="Mute on background">
        <SettingSwitch checked={s.muteOnBackground} onChange={(v) => applyAll({ muteOnBackground: v })} />
      </Row>
    </div>
  );
}

function ControlsTab() {
  const s = useSettings();
  const keys = [
    ["W / S", "Drive / reverse or walk"],
    ["A / D", "Turn"],
    ["F", "Enter cars and doors"],
    ["Space", "Own the room · hold in alley"],
    ["R", "Radio on/off"],
    [", / .", "Radio skip track"],
    ["- / =", "Radio volume"],
    ["Esc", "Pause"],
    ["M", "Mute"],
  ];
  return (
    <div>
      <SectionLabel>Camera</SectionLabel>
      <Row label="Camera speed">
        <SettingSlider
          value={s.cameraSpeed}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(v) => applyAll({ cameraSpeed: v })}
          label={`${s.cameraSpeed.toFixed(1)}×`}
        />
      </Row>
      <Row label="Invert look">
        <SettingSwitch checked={s.invertLook} onChange={(v) => applyAll({ invertLook: v })} />
      </Row>
      <Sep />
      <SectionLabel>Touch</SectionLabel>
      <Row label="Stick side">
        <RadioGroup.Root
          value={s.touchStickSide}
          onValueChange={(v) => applyAll({ touchStickSide: v as "left" | "right" })}
          className="flex gap-2"
        >
          {(["left", "right"] as const).map((side) => (
            <RadioGroup.Item
              key={side}
              value={side}
              className="flex h-7 items-center gap-1.5 rounded border px-2.5 text-xs capitalize transition-colors"
              style={{
                borderColor: s.touchStickSide === side ? "var(--color-foam)" : "var(--color-border)",
                color: s.touchStickSide === side ? "var(--color-foam)" : "var(--color-muted)",
              }}
            >
              <RadioGroup.Indicator className="block size-1.5 rounded-full bg-foam" />
              {side}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </Row>
      <Row label="Vibration">
        <SettingSwitch checked={s.vibration} onChange={(v) => applyAll({ vibration: v })} />
      </Row>
      <Sep />
      <SectionLabel>Key bindings</SectionLabel>
      <div className="space-y-1.5">
        {keys.map(([key, desc]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted">{desc}</span>
            <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-foam">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessTab() {
  const s = useSettings();
  return (
    <div>
      <SectionLabel>Subtitles</SectionLabel>
      <Row label="Show subtitles">
        <SettingSwitch checked={s.subtitles} onChange={(v) => applyAll({ subtitles: v })} />
      </Row>
      <Row label="Subtitle size">
        <div className="flex gap-1">
          {(["small", "medium", "large"] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => applyAll({ subtitleSize: sz })}
              className="rounded px-2 py-1 text-xs capitalize transition-colors"
              style={{
                background: s.subtitleSize === sz ? "color-mix(in oklab, var(--color-foam) 12%, transparent)" : "transparent",
                color: s.subtitleSize === sz ? "var(--color-foam)" : "var(--color-muted)",
                border: `1px solid ${s.subtitleSize === sz ? "var(--color-foam)" : "var(--color-border)"}`,
              }}
            >
              {sz}
            </button>
          ))}
        </div>
      </Row>
      <Sep />
      <SectionLabel>Accessibility</SectionLabel>
      <Row label="Reduce motion">
        <SettingSwitch checked={s.reduceMotion} onChange={(v) => applyAll({ reduceMotion: v })} />
      </Row>
      <Row label="HUD opacity">
        <SettingSlider
          value={s.hudOpacity}
          min={0.3}
          max={1.0}
          step={0.05}
          onChange={(v) => applyAll({ hudOpacity: v })}
          label={`${Math.round(s.hudOpacity * 100)}%`}
        />
      </Row>
    </div>
  );
}

function GameTab() {
  const s = useSettings();
  return (
    <div>
      <SectionLabel>Gameplay</SectionLabel>
      <Row label="Skip cinematics">
        <SettingSwitch checked={s.skipCinematics} onChange={(v) => applyAll({ skipCinematics: v })} />
      </Row>
      <Row label="Minimap">
        <SettingSwitch checked={s.minimapEnabled} onChange={(v) => applyAll({ minimapEnabled: v })} />
      </Row>
      <Row label="Control hints">
        <SettingSwitch checked={s.controlHints} onChange={(v) => applyAll({ controlHints: v })} />
      </Row>
    </div>
  );
}

// ── panel ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "picture", label: "Picture", Content: PictureTab },
  { id: "sound", label: "Sound", Content: SoundTab },
  { id: "controls", label: "Controls", Content: ControlsTab },
  { id: "access", label: "Access", Content: AccessTab },
  { id: "game", label: "Game", Content: GameTab },
] as const;

export function SettingsPanel({ onClose }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/80 px-4 py-8">
      <div className="flex max-h-full w-full max-w-md flex-col rounded-xl border border-border bg-surface shadow-hud">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="font-display text-2xl text-foam">Settings</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foam"
          >
            <X className="size-4" />
          </button>
        </div>

        <Tabs.Root defaultValue="picture" className="flex min-h-0 flex-1 flex-col">
          {/* tab strip */}
          <Tabs.List className="flex shrink-0 gap-0 overflow-x-auto border-b border-border px-5">
            {TABS.map(({ id, label }) => (
              <Tabs.Trigger
                key={id}
                value={id}
                className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-medium tracking-wide text-muted transition-colors data-[state=active]:border-foam data-[state=active]:text-foam"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {TABS.map(({ id, Content }) => (
              <Tabs.Content key={id} value={id} className="px-5 py-4">
                <Content />
              </Tabs.Content>
            ))}
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
}
