"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize2, Settings2 } from "lucide-react";
import { HLS_BASE } from "@/lib/data";

export default function VideoPlayer({
  title,
  hlsUrl,
  poster,
  animeSlug,
  episodeNumber,
}: {
  title: string;
  hlsUrl?: string;
  poster?: string;
  animeSlug?: string;
  episodeNumber?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
  const [isNativeHls, setIsNativeHls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve final HLS URL: env R2 > per-episode > fallback
  const resolvedUrl =
    (HLS_BASE && animeSlug && episodeNumber ? `${HLS_BASE}/${animeSlug}/ep-${episodeNumber}/master.m3u8` : null) ||
    hlsUrl ||
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !started) return;

    let cancelled = false;
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    setIsNativeHls(nativeHls);

    // Native HLS (Safari) — no hls.js instance
    if (nativeHls || !Hls.isSupported()) {
      setLevels([]);
      const onLoadedMeta = () => {
        if (!cancelled) video.play().catch(() => {});
      };
      video.src = resolvedUrl;
      video.addEventListener("loadedmetadata", onLoadedMeta);
      const onPlay = () => { if (!cancelled) setPlaying(true); };
      const onPause = () => { if (!cancelled) setPlaying(false); };
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      return () => {
        cancelled = true;
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        // Clear src to stop loading
        video.removeAttribute("src");
        video.load();
      };
    }

    // hls.js path
    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hlsRef.current = hls;
    hls.loadSource(resolvedUrl);
    hls.attachMedia(video);

    const onManifestParsed = (_e: string, data: { levels: { height: number }[] }) => {
      if (cancelled) return;
      const lvls = data.levels.map((l, i) => ({ height: l.height, index: i }));
      setLevels(lvls);
      // currentLevel -1 is default Auto; sync state
      setCurrentLevel(hls.currentLevel);
      video.play().catch(() => {});
    };
    const onLevelSwitched = (_e: string, data: { level: number }) => {
      if (cancelled) return;
      setCurrentLevel(data.level);
    };
    const onHlsError = (_e: string, data: { fatal: boolean; type: string; details: string }) => {
      if (cancelled || !data.fatal) return;
      setError(`HLS error: ${data.type} - ${data.details}`);
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
    hls.on(Hls.Events.ERROR, onHlsError);

    const onPlay = () => { if (!cancelled) setPlaying(true); };
    const onPause = () => { if (!cancelled) setPlaying(false); };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      cancelled = true;
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
      hls.off(Hls.Events.ERROR, onHlsError);
      try { hls.destroy(); } catch {}
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [started, resolvedUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleQuality = (idx: number) => {
    // Native HLS has no manual levels — no-op
    if (isNativeHls) return;
    const hls = hlsRef.current;
    if (!hls) return;
    // -1 = Auto (adaptive), otherwise manual level
    hls.currentLevel = idx;
    setCurrentLevel(idx);
  };

  if (!started) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
        <button
          onClick={() => setStarted(true)}
          className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-black group"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
          <div className="relative text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl group-hover:scale-105 transition">
              <Play className="h-7 w-7 fill-black ml-1" />
            </span>
            <p className="mt-3 text-sm font-semibold text-white drop-shadow">{title}</p>
            <p className="text-xs text-zinc-300 mt-1">คลิกเพื่อเล่น • HLS Adaptive Streaming</p>
            <p className="text-[11px] text-zinc-500 mt-1 truncate max-w-[320px] mx-auto px-4">{resolvedUrl}</p>
          </div>
        </button>
        <div className="pointer-events-none absolute bottom-0 w-full p-3 flex justify-between items-center text-white/80">
          <span className="text-xs bg-black/60 rounded-full px-2 py-1">HLS • ซับไทย</span>
          <span className="text-xs bg-black/60 rounded-full px-2 py-1">Auto 1080p</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 group/player">
      <video
        ref={videoRef}
        controls={false}
        playsInline
        poster={poster}
        className="h-full w-full"
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 opacity-0 group-hover/player:opacity-100 transition">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-100"
          >
            {playing ? <Pause className="h-4 w-4 fill-black" /> : <Play className="h-4 w-4 fill-black ml-0.5" />}
          </button>
          <button
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <div className="flex-1" />

          {/* Quality selector — hidden for native HLS (Safari) where hls.js is not active */}
          {!isNativeHls && (
            <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1">
              <Settings2 className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={currentLevel}
                onChange={(e) => handleQuality(Number(e.target.value))}
                className="bg-transparent text-xs text-white outline-none"
              >
                <option value={-1} className="text-black">
                  Auto
                </option>
                {levels.map((l) => (
                  <option key={l.index} value={l.index} className="text-black">
                    {l.height}p
                  </option>
                ))}
                {levels.length === 0 && <option className="text-black">Auto</option>}
              </select>
            </div>
          )}
          {isNativeHls && (
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-zinc-400">Auto (Native HLS)</span>
          )}

          <button
            onClick={() => videoRef.current?.requestFullscreen()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400 bg-red-950/50 rounded px-2 py-1">{error}</p>}
        <p className="mt-1 text-[11px] text-zinc-500 truncate">{resolvedUrl}</p>
      </div>
    </div>
  );
}
