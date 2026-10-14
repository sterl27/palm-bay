import { useState, useCallback, useRef } from "react";
import { X, Download, RotateCcw } from "lucide-react";
import { swapLiveSprite } from "@/game/meshes";

interface Props {
  onClose: () => void;
}

const SLOTS = [
  { key: "hero-front", label: "Hero · Front",  hint: "Don Sterleone — front view" },
  { key: "hero-back",  label: "Hero · Back",   hint: "Don Sterleone — back view" },
  { key: "rapper",     label: "Rapper NPC",    hint: "Leather jacket character" },
  { key: "beard",      label: "Beard NPC",     hint: "Grey polo character" },
  { key: "line-0",     label: "Crowd A",       hint: "Street crowd variant" },
  { key: "line-1",     label: "Crowd B",       hint: "Street crowd variant" },
  { key: "line-2",     label: "Crowd C",       hint: "Street crowd variant" },
  { key: "line-3",     label: "Crowd D",       hint: "Street crowd variant" },
  { key: "glamour",   label: "Glamour NPC",   hint: "Club entrance — blonde" },
  { key: "android",   label: "Android NPC",   hint: "Porcelain robot — gold accents" },
] as const;

type SlotKey = (typeof SLOTS)[number]["key"];

interface SlotState {
  preview: string | null; // blob URL of dropped image
  dims: string | null;    // "1024×2048"
  swapped: boolean;
}

export function AvatarSwapPanel({ onClose }: Props) {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, { preview: null, dims: null, swapped: false }]))
  );
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDrop = useCallback(async (key: SlotKey, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const previewUrl = URL.createObjectURL(file);
    const result = await swapLiveSprite(key, file);
    setSlots((prev) => ({
      ...prev,
      [key]: {
        preview: previewUrl,
        dims: result.w ? `${result.w}×${result.h}` : null,
        swapped: true,
      },
    }));
  }, []);

  const handleReset = useCallback((key: SlotKey) => {
    const originalUrl = `/avatars/live/${key}.png`;
    // Re-fetch the original file and swap back
    fetch(originalUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `${key}.png`, { type: "image/png" });
        return swapLiveSprite(key, file);
      })
      .then(() => {
        setSlots((prev) => ({
          ...prev,
          [key]: { preview: null, dims: null, swapped: false },
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/85 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-hud">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p className="font-display text-2xl text-foam">Sprite Swap</p>
            <p className="text-xs text-muted">Drag a transparent PNG onto any slot — updates live in the scene</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foam"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* grid */}
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {SLOTS.map((slot) => {
            const state = slots[slot.key]!;
            const isOver = dragOver === slot.key;
            return (
              <div
                key={slot.key}
                className="group relative flex flex-col overflow-hidden rounded-lg border transition-colors"
                style={{
                  borderColor: isOver
                    ? "var(--color-foam)"
                    : state.swapped
                      ? "color-mix(in oklab, var(--color-foam) 40%, var(--color-border))"
                      : "var(--color-border)",
                  background: isOver
                    ? "color-mix(in oklab, var(--color-foam) 6%, var(--color-surface))"
                    : "var(--color-surface)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(slot.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const file = e.dataTransfer.files[0];
                  if (file) void handleDrop(slot.key as SlotKey, file);
                }}
                onClick={() => fileRefs.current[slot.key]?.click()}
              >
                {/* preview / placeholder */}
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-black/20">
                  {state.preview ? (
                    <img
                      src={state.preview}
                      alt={slot.label}
                      className="h-full object-contain"
                    />
                  ) : (
                    <img
                      src={`/avatars/live/${slot.key}.png`}
                      alt={slot.label}
                      className="h-full object-contain opacity-40"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  {isOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foam/10">
                      <p className="text-xs font-medium text-foam">Drop PNG</p>
                    </div>
                  )}
                  {state.swapped && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-foam/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foam">
                      live
                    </span>
                  )}
                </div>

                {/* label row */}
                <div className="flex items-center justify-between gap-1 px-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foam">{slot.label}</p>
                    {state.dims ? (
                      <p className="text-[9px] tabular-nums text-faint">{state.dims}px</p>
                    ) : (
                      <p className="truncate text-[9px] text-faint">{slot.hint}</p>
                    )}
                  </div>
                  {state.swapped && (
                    <button
                      type="button"
                      title="Reset to original"
                      onClick={(e) => { e.stopPropagation(); handleReset(slot.key as SlotKey); }}
                      className="shrink-0 rounded p-0.5 text-faint transition-colors hover:text-foam"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                  {state.preview && (
                    <a
                      href={state.preview}
                      download={`${slot.key}.png`}
                      title="Download this sprite"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded p-0.5 text-faint transition-colors hover:text-foam"
                    >
                      <Download className="size-3" />
                    </a>
                  )}
                </div>

                {/* hidden file input */}
                <input
                  ref={(el) => { fileRefs.current[slot.key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleDrop(slot.key as SlotKey, file);
                    e.target.value = "";
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="border-t border-border px-5 py-3 text-xs text-faint">
          Drag & drop · click to browse · changes are live · download to save · press{" "}
          <kbd className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[10px] text-muted">`</kbd>{" "}
          to close
        </div>
      </div>
    </div>
  );
}
