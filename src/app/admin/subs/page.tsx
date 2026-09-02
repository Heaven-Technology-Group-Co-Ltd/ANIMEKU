"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { customSubs } from "@/lib/customSubs";

type Cue = { start: number; end: number; text: string };

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function loadYT(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    return new Promise((res) => {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        orig?.();
        res();
      };
    });
  }
  return new Promise((res) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => res();
  });
}

export default function SubsEditorPage() {
  const [videoId, setVideoId] = useState("k4xGqY5IDBE");
  const [inputId, setInputId] = useState("k4xGqY5IDBE");
  const [cues, setCues] = useState<Cue[]>(() => customSubs["k4xGqY5IDBE"] || []);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const playerRef = useRef<any>(null);
  const containerId = useRef("subs-editor-player");
  const timerRef = useRef<number | null>(null);

  // load player
  useEffect(() => {
    let cancelled = false;
    loadYT().then(() => {
      if (cancelled) return;
      createPlayer(videoId);
    });
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPlayer = useCallback((vid: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { playerRef.current?.destroy?.(); } catch {}
    const tryCreate = () => {
      const el = document.getElementById(containerId.current);
      if (!el) { setTimeout(tryCreate, 50); return; }
      // clear inner
      el.innerHTML = "";
      playerRef.current = new window.YT.Player(containerId.current, {
        videoId: vid,
        width: "100%",
        height: "100%",
        playerVars: { controls: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: (e: any) => {
            setDuration(e.target.getDuration?.() || 0);
            // poll 100ms for precise capture
            timerRef.current = window.setInterval(() => {
              try {
                const c = e.target.getCurrentTime?.();
                const d = e.target.getDuration?.();
                if (!isNaN(c)) setCurrent(c);
                if (!isNaN(d)) setDuration(d);
              } catch {}
            }, 100) as unknown as number;
          },
          onStateChange: (e: any) => {
            // 1 playing, 2 paused
            setPlaying(e.data === 1);
          },
        },
      });
    };
    tryCreate();
  }, []);

  const handleLoad = () => {
    const v = inputId.trim();
    if (!v || !/^[a-zA-Z0-9_-]{6,20}$/.test(v)) return;
    setVideoId(v);
    // load existing cues if any
    const existing = customSubs[v];
    if (existing) setCues(existing.map(c => ({ ...c })));
    createPlayer(v);
  };

  const captureStart = (idx: number) => {
    setCues(prev => prev.map((c, i) => i === idx ? { ...c, start: Math.round(current * 10) / 10 } : c));
  };
  const captureEnd = (idx: number) => {
    setCues(prev => prev.map((c, i) => i === idx ? { ...c, end: Math.round(current * 10) / 10 } : c));
  };
  const addCue = () => {
    const s = Math.round(current * 10) / 10;
    const e = Math.round((current + 2.5) * 10) / 10;
    setCues(prev => [...prev, { start: s, end: e, text: "พิมพ์ซับตรงนี้" }]);
    setSelected(cues.length);
  };
  const seekTo = (t: number) => {
    try { playerRef.current?.seekTo?.(t, true); } catch {}
  };

  const activeCue = cues.find(c => current >= c.start && current < c.end);

  const exportCode = `"${videoId}": [\n${cues.map(c => `    { start: ${c.start}, end: ${c.end}, text: "${c.text.replace(/"/g, '\\"')}" },`).join("\n")}\n  ],`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sortCues = () => setCues(prev => [...prev].sort((a,b) => a.start - b.start));

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <h1 className="text-2xl font-black">จูนซับให้ตรง — กดๆ จบ <span className="text-[#ff3b82]"> subs editor</span></h1>
        <p className="text-sm text-zinc-400 mt-1">เปิดคลิป → กดเล่น → กด S/E เก็บเวลา → พิมพ์ซับ → Export ไปวางใน <code className="bg-white/10 px-1 rounded">customSubs.ts</code> จบ เรื่องต่อไป 2 นาที</p>

        {/* Video + controls */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex gap-2 mb-3">
              <input value={inputId} onChange={e => setInputId(e.target.value)} placeholder="YouTube videoId เช่น k4xGqY5IDBE" className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm outline-none focus:border-[#ff3b82]" />
              <button onClick={handleLoad} className="rounded-full bg-[#ff3b82] px-6 py-2 text-sm font-bold hover:bg-[#ff4f8f]">โหลดคลิป</button>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
              <div id={containerId.current} className="absolute inset-0" />
              {/* overlay active cue */}
              {activeCue && (
                <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 max-w-[90%] rounded-xl bg-black/85 px-4 py-2 text-center text-sm font-bold leading-5 text-white border border-white/20 shadow-xl">
                  {activeCue.text}
                </div>
              )}
              <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-mono border border-white/15">
                {current.toFixed(1)}s / {duration ? duration.toFixed(1) + "s" : "--"} {playing ? "▶" : "⏸"}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={addCue} className="rounded-full bg-white text-black px-4 py-2 text-sm font-bold">+ เพิ่มซับที่ {current.toFixed(1)}s</button>
              <button onClick={sortCues} className="rounded-full bg-white/10 border border-white/20 px-4 py-2 text-xs">เรียงตามเวลา</button>
              <span className="text-xs text-zinc-500 py-2">คีย์ลัด: คลิก cue แล้วกด S=จับ start, E=จับ end, Space=เล่น/หยุด</span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#12121a] p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Export — เอาไปวางใน customSubs.ts</h3>
                <button onClick={handleCopy} className="rounded-full bg-[#ff3b82] px-4 py-1.5 text-xs font-bold">{copied ? "ก็อปแล้ว ✓" : "ก็อปโค้ด"}</button>
              </div>
              <pre className="mt-3 max-h-[220px] overflow-auto rounded-xl bg-black p-3 text-xs leading-5 text-zinc-300 border border-white/10 whitespace-pre-wrap">{exportCode}</pre>
              <p className="text-[11px] text-zinc-500 mt-2">วางแทนที่ block เดิมของ videoId นี้ → save → `docker build --no-cache` จบ</p>
            </div>
          </div>

          {/* Cue list */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#12121a] p-3">
              <h3 className="text-sm font-bold mb-2">รายการซับ ({cues.length}) — {videoId}</h3>
              <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
                {cues.map((c, idx) => {
                  const isActive = current >= c.start && current < c.end;
                  const isSelected = selected === idx;
                  return (
                    <div key={idx} onClick={() => setSelected(idx)} className={`rounded-xl border p-2.5 cursor-pointer transition ${isActive ? "border-[#ff3b82] bg-[#ff3b82]/15" : isSelected ? "border-white/30 bg-white/5" : "border-white/10 bg-black/40 hover:bg-white/5"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-zinc-500">#{idx + 1}</span>
                        {isActive && <span className="text-[10px] bg-[#ff3b82] text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">ON AIR</span>}
                      </div>
                      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1.5">
                        <div>
                          <label className="text-[10px] text-zinc-500">start</label>
                          <div className="flex gap-1">
                            <input type="number" step={0.1} value={c.start} onChange={e => setCues(prev => prev.map((x,i)=> i===idx ? {...x, start: Number(e.target.value)}:x))} className="w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1 text-xs font-mono" />
                            <button onClick={(e)=>{e.stopPropagation(); captureStart(idx);}} className="rounded-lg bg-emerald-600 px-2 text-xs font-bold">S</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500">end</label>
                          <div className="flex gap-1">
                            <input type="number" step={0.1} value={c.end} onChange={e => setCues(prev => prev.map((x,i)=> i===idx ? {...x, end: Number(e.target.value)}:x))} className="w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1 text-xs font-mono" />
                            <button onClick={(e)=>{e.stopPropagation(); captureEnd(idx);}} className="rounded-lg bg-emerald-600 px-2 text-xs font-bold">E</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={(e)=>{e.stopPropagation(); seekTo(c.start);}} className="rounded-lg bg-white/10 px-2 py-1 text-xs">▶ Go</button>
                          <button onClick={(e)=>{e.stopPropagation(); setCues(prev => prev.filter((_,i)=>i!==idx));}} className="rounded-lg bg-red-500/20 text-red-300 px-2 py-1 text-xs">ลบ</button>
                        </div>
                      </div>
                      <textarea value={c.text} onChange={e => setCues(prev => prev.map((x,i)=> i===idx ? {...x, text: e.target.value}:x))} rows={2} className="mt-2 w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1.5 text-xs" placeholder="พิมพ์ซับ..." />
                      <div className="mt-1 text-[10px] font-mono text-zinc-600">{(c.end - c.start).toFixed(1)}s • {c.start.toFixed(1)} → {c.end.toFixed(1)}</div>
                    </div>
                  );
                })}
                {cues.length===0 && <p className="text-xs text-zinc-500 text-center py-8">ยังไม่มีซับ — กด "เพิ่มซับ" แล้วพิมพ์ได้เลย</p>}
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs leading-5 text-amber-200">
              <b>วิธีใช้ให้ตรงสุด (10 วิจบ):</b><br/>
              1. กดเล่น → ฟังประโยคแรก<br/>
              2. กดหยุดตรงเริ่มพูด → กด <b>S</b> ที่ cue นั้น<br/>
              3. เลื่อนไปท้ายประโยค → กด <b>E</b><br/>
              4. พิมพ์ซับ → กด Go เช็ค → ตรงแล้ว Export
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
