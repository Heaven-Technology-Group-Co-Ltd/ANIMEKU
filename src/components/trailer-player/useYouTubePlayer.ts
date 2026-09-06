"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { loadYouTubeAPI } from "@/lib/youtube-loader";
import type { syncPlayerParam } from "./useTrailerCaptions";

type Args = {
  activeId: string | undefined;
  hasYoutube: boolean;
  playerContainerId: string;
  selectedCaption: string;
  useCustomSub: boolean;
  /** Caption owner's merge — called with the live player after ready. */
  syncTracksFromPlayer: (player: syncPlayerParam) => void;
};

/**
 * P3.2 — YouTube player lifecycle, extracted from TrailerPlayer.
 * Owns: playing gate, YT readiness, player create/destroy, time polling,
 * transport callbacks (play/seek/volume/mute), fullscreen + close.
 * Caption *data* stays in useTrailerCaptions; this hook only notifies it
 * via `syncTracksFromPlayer` and applies its language selection to the
 * live player. Semantics unchanged (see preserved inline notes).
 */
export function useYouTubePlayer({
  activeId,
  hasYoutube,
  playerContainerId,
  selectedCaption,
  useCustomSub,
  syncTracksFromPlayer,
}: Args) {
  const [playing, setPlaying] = useState(false);
  const [isYTReady, setIsYTReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);
  const timerRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const mountedRef = useRef(true);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const destroyPlayer = useCallback(() => {
    clearTimer();
    clearTimeouts();
    const p = playerRef.current as { destroy?: () => void } | null;
    if (p?.destroy) {
      try { p.destroy(); } catch {}
    }
    playerRef.current = null;
  }, [clearTimer, clearTimeouts]);

  // Track mounted to guard async setState
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      destroyPlayer();
    };
  }, [destroyPlayer]);

  // Load YT API when entering playing state
  useEffect(() => {
    if (!playing || !hasYoutube) return;
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !mountedRef.current) return;
      setIsYTReady(true);
    });
    return () => { cancelled = true; };
  }, [playing, hasYoutube]);

  // Create / recreate player only when playing+ready+activeId changes
  useEffect(() => {
    if (!playing || !isYTReady || !activeId) return;

    const elId = playerContainerId;
    // Destroy previous before creating new
    const prev = playerRef.current as { destroy?: () => void } | null;
    if (prev?.destroy) {
      try { prev.destroy(); } catch {}
      playerRef.current = null;
    }
    clearTimer();
    clearTimeouts();

    let cancelled = false;

    const tryCreate = () => {
      if (cancelled || !mountedRef.current) return;
      const el = document.getElementById(elId);
      if (!el) {
        const tid = window.setTimeout(tryCreate, 50) as unknown as number;
        timeoutsRef.current.push(tid);
        return;
      }
      if (!window.YT?.Player) return;
      const YTPlayer = window.YT.Player;
      playerRef.current = new YTPlayer(elId, {
        videoId: activeId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          autoplay: 1,
          cc_load_policy: 1,
          cc_lang_pref: selectedCaption || "th",
          hl: selectedCaption || "th",
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (e: { target: { getDuration: () => number; setVolume: (v: number) => void; mute: () => void; loadModule?: (m: string) => void; setOption?: (a: string, b: string, c: unknown) => void; playVideo: () => void } }) => {
            if (cancelled || !mountedRef.current) return;
            setDuration(e.target.getDuration?.() || 0);
            e.target.setVolume(volume);
            if (muted) e.target.mute();
            try {
              e.target.loadModule?.("captions");
              if (selectedCaption) {
                e.target.setOption?.("captions", "track", { languageCode: selectedCaption });
              }
            } catch {}
            e.target.playVideo();
            setIsPlaying(true);
            const t1 = window.setTimeout(() => syncTracksFromPlayer(playerRef.current as syncPlayerParam), 800) as unknown as number;
            const t2 = window.setTimeout(() => syncTracksFromPlayer(playerRef.current as syncPlayerParam), 2000) as unknown as number;
            timeoutsRef.current.push(t1, t2);
          },
          onStateChange: (e: { data: number }) => {
            if (!mountedRef.current) return;
            if (e.data === 1) setIsPlaying(true);
            else if (e.data === 2) setIsPlaying(false);
            else if (e.data === 0) {
              setIsPlaying(false);
              setCurrent(0);
            }
          },
        },
      });
    };
    tryCreate();

    return () => {
      cancelled = true;
      clearTimer();
      clearTimeouts();
      const p = playerRef.current as { destroy?: () => void } | null;
      if (p?.destroy) {
        try { p.destroy(); } catch {}
        playerRef.current = null;
      }
    };
    // Intentionally exclude volume/muted/theater/caption menu etc. to avoid recreating player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYTReady, playing, activeId]);

  // Update caption when language changes
  useEffect(() => {
    const p = playerRef.current as { loadModule?: (m: string) => void; setOption?: (a: string, b: string, c: unknown) => void } | null;
    if (!p || !playing || !isYTReady) return;
    try {
      p.loadModule?.("captions");
      if (useCustomSub) {
        p.setOption?.("captions", "track", {});
      } else if (selectedCaption) {
        p.setOption?.("captions", "track", { languageCode: selectedCaption });
      } else {
        p.setOption?.("captions", "track", {});
      }
    } catch {}
  }, [selectedCaption, useCustomSub, playing, isYTReady]);

  // Poll time
  useEffect(() => {
    if (!playing || !isYTReady) return;
    clearTimer();
    timerRef.current = window.setInterval(() => {
      const p = playerRef.current as { getCurrentTime?: () => number; getDuration?: () => number } | null;
      if (!p || typeof p.getCurrentTime !== "function") return;
      try {
        const c = p.getCurrentTime();
        const d = p.getDuration?.();
        if (!mountedRef.current) return;
        if (!isNaN(c)) setCurrent(c);
        if (d !== undefined && !isNaN(d) && d > 0) setDuration(d);
      } catch {}
    }, 200) as unknown as number;
    return () => { clearTimer(); };
  }, [playing, isYTReady, isPlaying, clearTimer]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current as { getPlayerState?: () => number; pauseVideo?: () => void; playVideo?: () => void } | null;
    if (!p) return;
    try {
      const state = p.getPlayerState?.();
      if (state === 1) {
        p.pauseVideo?.();
        if (mountedRef.current) setIsPlaying(false);
      } else {
        p.playVideo?.();
        if (mountedRef.current) setIsPlaying(true);
      }
    } catch {}
  }, []);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setCurrent(v);
    (playerRef.current as { seekTo?: (v: number, b: boolean) => void } | null)?.seekTo?.(v, true);
  }, []);

  const handleVolume = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    (playerRef.current as { setVolume?: (v: number) => void; unMute?: () => void } | null)?.setVolume?.(v);
    if (v === 0) setMuted(true);
    else if (muted) {
      setMuted(false);
      (playerRef.current as { unMute?: () => void } | null)?.unMute?.();
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current as { unMute?: () => void; mute?: () => void; setVolume?: (v: number) => void } | null;
    if (!p) return;
    if (muted) {
      p.unMute?.();
      p.setVolume?.(volume || 80);
      setMuted(false);
    } else {
      p.mute?.();
      setMuted(true);
    }
  }, [muted, volume]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const closePlayer = useCallback(() => {
    destroyPlayer();
    if (mountedRef.current) {
      setPlaying(false);
      setIsYTReady(false);
      setIsPlaying(false);
      setCurrent(0);
    }
  }, [destroyPlayer]);

  return {
    containerRef,
    playing,
    setPlaying,
    isPlaying,
    current,
    duration,
    volume,
    muted,
    togglePlay,
    handleSeek,
    handleVolume,
    toggleMute,
    toggleFullscreen,
    closePlayer,
  };
}
