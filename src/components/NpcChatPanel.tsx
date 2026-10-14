import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useGameStore } from "@/game/store";

interface Msg { role: "user" | "assistant"; content: string }

const PROFILES: Record<string, { name: string; color: string; tagline: string; persona: string; lines: string[] }> = {
  rapper: {
    name: "Lil' Ghost",
    color: "#8b5cf6",
    tagline: "From the street to the booth",
    persona: "You are Lil' Ghost, a Miami rapper. Speak in laid-back street slang mixed with poetic insight. Short sentences (1-2). Never break character.",
    lines: [
      "Ayy, you know how the night moves, right?",
      "Real talk, this city never sleeps — neither do I.",
      "I got bars for every corner of this town, feel me?",
      "The booth is where I'm honest. The street is where I'm alive.",
      "Heard you been moving different lately. That's the wave.",
    ],
  },
  beard: {
    name: "Victor",
    color: "#c4a030",
    tagline: "Seen too much, said too little",
    persona: "You are Victor, a grizzled Miami veteran. Speak in short, measured sentences. Cryptic, loyal, old school. 1-2 sentences max. Never break character.",
    lines: [
      "You don't ask questions here. You observe.",
      "I've seen men fall over less. Watch yourself.",
      "This city gives and takes. Always takes more.",
      "Loyalty is currency. Don't spend it cheap.",
      "Some doors open once. Make sure you're ready.",
    ],
  },
  glamour: {
    name: "Elena",
    color: "#ff40a0",
    tagline: "Everybody's confidante",
    persona: "You are Elena, glamorous Miami club hostess. Charming, perceptive, always hinting you know secrets. 1-3 sentences. Never break character.",
    lines: [
      "Oh, I've been expecting someone like you all night.",
      "Everyone comes through here eventually. Everyone.",
      "The best conversations happen after midnight, don't you think?",
      "I hear things. I see everything. But I'm very discreet.",
      "You carry yourself differently. I like that.",
    ],
  },
  android: {
    name: "Unit-7",
    color: "#ffc060",
    tagline: "Processing humanity.exe",
    persona: "You are Unit-7, an android observing human behavior. Speak precisely, sometimes misunderstand idioms literally. Curious about emotions. 1-2 sentences. Never break character.",
    lines: [
      "I have catalogued 847 unique human greeting patterns. Yours is interesting.",
      "Query: what is the evolutionary purpose of this music?",
      "Your biometrics indicate elevated stress. Is that normal for this environment?",
      "I find this concept of 'vibes' to be computationally inefficient but statistically effective.",
      "I am still learning what humans mean when they say 'it's complicated.'",
    ],
  },
  club: {
    name: "Marco",
    color: "#38bdf8",
    tagline: "VIP list regular",
    persona: "You are Marco, excitable Miami club regular. Know everyone, have the hookup. Friendly and enthusiastic. 1-2 sentences. Never break character.",
    lines: [
      "Yo, this is the spot right now! Everyone's here tonight.",
      "I know the DJ — he's dropping something crazy at 2am.",
      "You need anything, I know people. That's just how it works.",
      "Bro this night is already legendary. You felt that drop?",
      "First time here? Welcome to the best night of your life.",
    ],
  },
  hero: {
    name: "Don Sterleone",
    color: "#e8dcc8",
    tagline: "The man who owns the night",
    persona: "You are Don Sterleone, charismatic Miami power broker. Speak with authority, deliberate and philosophical about power. 1-2 sentences. Never break character.",
    lines: [
      "Every night I walk through that door, the room changes. That's not ego — that's reality.",
      "Power is just attention with good shoes.",
      "The rope doesn't stop people. Desire does.",
      "I don't make plans. I create gravity.",
      "You either own the room or you're renting space in it.",
    ],
  },
};

const DEFAULT_PROFILE = {
  name: "Stranger",
  color: "#6b7280",
  tagline: "A face in the crowd",
  persona: "You are a mysterious stranger at a Miami nightclub. Cryptic, brief. 1-2 sentences. Never break character.",
  lines: ["...", "You didn't hear it from me.", "Wrong place, right time.", "Everyone's got a story here."],
};

async function askClaude(messages: Msg[], system: string): Promise<string> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!key) return "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 128,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) return "";
    const data = await res.json() as { content: Array<{ text: string }> };
    return data.content[0]?.text ?? "";
  } catch {
    return "";
  }
}

export function NpcChatPanel() {
  const npcChat = useGameStore((s) => s.npcChat);
  const closeNpcChat = useGameStore((s) => s.closeNpcChat);
  const bindings = useGameStore((s) => s.bindings);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lineIdxRef = useRef(0);
  const hasInitRef = useRef(false);

  useEffect(() => {
    if (!npcChat) {
      setMessages([]);
      lineIdxRef.current = 0;
      hasInitRef.current = false;
      return;
    }
    if (hasInitRef.current) return;
    hasInitRef.current = true;
    const profile = PROFILES[npcChat.kind] ?? DEFAULT_PROFILE;
    const greeting = profile.lines[lineIdxRef.current % profile.lines.length]!;
    lineIdxRef.current++;
    setMessages([{ role: "assistant", content: greeting }]);
  }, [npcChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!npcChat) return null;
  const profile = PROFILES[npcChat.kind] ?? DEFAULT_PROFILE;

  function handleClose() {
    closeNpcChat();
    bindings?.resume();
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    let reply = await askClaude(next, profile.persona);
    if (!reply) {
      // Fallback scripted line
      reply = profile.lines[lineIdxRef.current % profile.lines.length]!;
      lineIdxRef.current++;
    }
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center px-4 pb-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-surface/95 shadow-hud backdrop-blur-sm overflow-hidden"
        style={{ maxHeight: "70vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-border"
          style={{ background: `${profile.color}18` }}
        >
          <div
            className="size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: profile.color, color: "#0a0a0a" }}
          >
            {profile.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foam truncate">{profile.name}</p>
            <p className="text-[10px] text-faint truncate">{profile.tagline}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="size-8 flex items-center justify-center rounded-md text-muted hover:text-foam transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                  m.role === "user"
                    ? "bg-foam text-ink rounded-br-sm"
                    : "bg-ink-2 text-foam rounded-bl-sm border border-border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-3 py-2 bg-ink-2 border border-border">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-muted animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="Say something…"
            className="flex-1 rounded-xl bg-ink-2 border border-border px-3 py-2 text-sm text-foam placeholder:text-faint outline-none focus:border-foam/40 transition-colors"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className="size-9 rounded-xl flex items-center justify-center text-ink transition-colors disabled:opacity-40"
            style={{ background: profile.color }}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
