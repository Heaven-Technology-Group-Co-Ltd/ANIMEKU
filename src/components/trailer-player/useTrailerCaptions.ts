"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCustomSubs } from "@/lib/customSubs";

export type CaptionTrack = { lang: string; name: string; isAuto: boolean };

/** Structural player shape the caption sync needs — no player state stored. */
export type syncPlayerParam =
  | { getOption?: (module: string, option: string) => unknown }
  | null;

/**
 * Normalize a /api/youtube/captions payload to a track list.
 * Pure + deterministic so the fetch effect's decision logic is unit-testable.
 */
export function parseCaptionPayload(j: { tracks?: unknown }): CaptionTrack[] {
  const tracks = (j?.tracks || []) as CaptionTrack[];
  return tracks.length > 0 ? tracks : [];
}

/** Track pick order: th > en > first (unchanged P2.6 behavior). */
export function pickCaptionTrack(tracks: CaptionTrack[]): string {
  const hasTh = tracks.find((t) => t.lang === "th");
  const hasEn = tracks.find((t) => t.lang === "en");
  return hasTh ? "th" : hasEn ? "en" : tracks[0].lang;
}

/**
 * Player tracklist merge rule: adopt player tracks when we have none or the
 * player knows more; never shrink the list on a partial read.
 */
export function mergePlayerTracks(
  prev: CaptionTrack[],
  next: CaptionTrack[]
): CaptionTrack[] {
  return prev.length === 0 || next.length > prev.length ? next : prev;
}

/**
 * P3.2 — Caption fetching / caption state, extracted from TrailerPlayer.
 * Owns: caption track list, selected language, custom-sub toggle + delay,
 * custom cue lookup, and the YT player tracklist sync. No player instance
 * is stored here — the caller passes it to `syncTracksFromPlayer` so player
 * state is never duplicated. Fetch contract unchanged: one fetch per
 * `activeId` (P2.6 identical-output behavior).
 */
export function useTrailerCaptions(activeId: string | undefined) {
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>("");
  const [useCustomSub, setUseCustomSub] = useState(false);
  const [subDelay, setSubDelay] = useState(0);

  const mountedRef = useRef(true);

  const customCues = activeId ? getCustomSubs(activeId) : null;
  const hasCustomSub = !!customCues && customCues.length > 0;

  // Track mounted to guard async setState
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch caption tracks for active video — once per video (P2.6: `playing`
  // removed from deps; it re-fetched /api/youtube/captions on every
  // play/pause toggle, each fanning out to up to 3 YouTube upstream fetches
  // server-side. Tracks are per-video state, so per-video fetching is the
  // identical-output behavior. The fire-and-forget no-cors timedtext fetch on
  // empty results is also removed: opaque response, discarded, zero UI effect.)
  useEffect(() => {
    if (!activeId) {
      // Defer synchronous state update to avoid react-hooks/set-state-in-effect
      const tid = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setCaptionTracks([]);
      }, 0);
      return () => window.clearTimeout(tid);
    }
    let cancelled = false;
    fetch(`/api/youtube/captions?v=${activeId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !mountedRef.current) return;
        const tracks = parseCaptionPayload(j);
        if (tracks.length > 0) {
          setCaptionTracks(tracks);
          setSelectedCaption(pickCaptionTrack(tracks));
        } else {
          setCaptionTracks([]);
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) setCaptionTracks([]);
      });
    return () => { cancelled = true; };
  }, [activeId]);

  // Disable CC by default when no tracks — deferred to avoid synchronous setState in effect
  useEffect(() => {
    if (captionTracks.length === 0) {
      const tid = window.setTimeout(() => {
        if (!mountedRef.current) return;
        if (hasCustomSub) {
          setSelectedCaption("");
          setUseCustomSub(false);
        } else {
          setSelectedCaption("");
        }
      }, 0);
      return () => window.clearTimeout(tid);
    }
  }, [captionTracks.length, hasCustomSub]);

  const syncTracksFromPlayer = useCallback((player: syncPlayerParam) => {
    if (!player || typeof player.getOption !== "function") return;
    try {
      const list = player.getOption("captions", "tracklist") as { languageCode: string; displayName?: string; kind?: string }[];
      if (Array.isArray(list) && list.length > 0) {
        const tracks = list.map((t) => ({
          lang: t.languageCode as string,
          name: (t.displayName as string) || (t.languageCode as string),
          isAuto: (t.kind as string) === "asr",
        }));
        if (!mountedRef.current) return;
        setCaptionTracks((prev) => mergePlayerTracks(prev, tracks));
        setSelectedCaption((prev) => {
          if (prev) return prev;
          const hasTh = tracks.find((t) => t.lang === "th");
          const hasEn = tracks.find((t) => t.lang === "en");
          return hasTh ? "th" : hasEn ? "en" : tracks[0].lang;
        });
      } else if (hasCustomSub && mountedRef.current) {
        setSelectedCaption("");
      }
    } catch {}
  }, [hasCustomSub]);

  return {
    captionTracks,
    selectedCaption,
    setSelectedCaption,
    useCustomSub,
    setUseCustomSub,
    subDelay,
    setSubDelay,
    customCues,
    hasCustomSub,
    syncTracksFromPlayer,
  };
}
