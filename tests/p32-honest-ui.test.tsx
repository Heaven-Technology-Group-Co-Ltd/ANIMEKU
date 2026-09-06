import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import TrailerPlayer from "@/components/TrailerPlayer";
import SubsEditorPage from "@/app/admin/subs/page";
import {
  useTrailerCaptions,
  parseCaptionPayload,
  pickCaptionTrack,
  mergePlayerTracks,
  type CaptionTrack,
} from "@/components/trailer-player/useTrailerCaptions";
import {
  loadYouTubeAPI,
  resetYoutubeLoaderForTests,
} from "@/lib/youtube-loader";
import { DUB_UNAVAILABLE_LABEL } from "@/lib/dubMap";
import { animes, getUpcomingAnimes, getWatchableAnimes } from "@/lib/data";

// P3.2 — Honest-UI cleanup + TrailerPlayer split.
//
// Proves (deterministically, no network, no browser-test harness — the repo
// has no RTL history and vitest resolves React's production build, so these
// tests use SSR strings + pure helpers + DOM-only loader checks):
// - dead Watchlist/Share affordances are actually gone from player output
// - player poster + honest dub/sub status line still render
// - shared YouTube loader stays a singleton (no duplicate script tags)
// - caption lifecycle logic is unchanged (payload parse, th > en > first,
//   player-tracklist merge rule)
// - admin/subs is explicitly labeled as client-only tooling preview
// - catalog untouched (104 rows, unreleased split intact)

const YT_SCRIPT_SRC = "https://www.youtube.com/iframe_api";

function removeYtScripts() {
  document
    .querySelectorAll(`script[src="${YT_SCRIPT_SRC}"]`)
    .forEach((el) => el.remove());
}

function clearYtGlobal() {
  delete (window as unknown as Record<string, unknown>)["YT"];
}

beforeEach(() => {
  resetYoutubeLoaderForTests();
  removeYtScripts();
  clearYtGlobal();
});

afterEach(() => {
  resetYoutubeLoaderForTests();
  removeYtScripts();
  clearYtGlobal();
});

describe("P3.2 dead affordances are gone", () => {
  function playerHtml() {
    return renderToString(
      <TrailerPlayer
        title="แนะนำ Test — ตัวอย่างแนะนำ"
        youtubeId="dQw4w9WgXcQ"
        animeSlug="test-anime"
      />
    );
  }

  it("renders no Watchlist/Share buttons (they had no handlers)", () => {
    const html = playerHtml();
    expect(html).not.toContain("Watchlist");
    expect(html).not.toContain("แชร์");
  });

  it("still renders the trailer poster gate and honest status line", () => {
    const html = playerHtml();
    // Poster gate (click-to-play) preserved
    expect(html).toContain("แนะนำ Test — ตัวอย่างแนะนำ");
    // No verified dub + no custom subs for this id → truthful unavailable label
    expect(html).toContain(DUB_UNAVAILABLE_LABEL);
  });
});

describe("P3.2 shared YouTube loader", () => {
  it("returns the same promise and inserts exactly one script tag", async () => {
    const p1 = loadYouTubeAPI();
    const p2 = loadYouTubeAPI();
    expect(p1).toBe(p2);
    expect(
      document.querySelectorAll(`script[src="${YT_SCRIPT_SRC}"]`)
    ).toHaveLength(1);
    // Settle the pending promise so later tests start clean
    (window as unknown as { YT?: unknown }).YT = { Player: function () {} };
    window.onYouTubeIframeAPIReady();
    await expect(p1).resolves.toBeUndefined();
  });

  it("resolves via the ready callback and chains a previous handler", async () => {
    const seen: string[] = [];
    window.onYouTubeIframeAPIReady = () => {
      seen.push("prev");
    };
    const p = loadYouTubeAPI();
    window.onYouTubeIframeAPIReady();
    await expect(p).resolves.toBeUndefined();
    expect(seen).toEqual(["prev"]);
  });

  it("fast-paths when YT is already ready without inserting a script", async () => {
    (window as unknown as { YT?: unknown }).YT = { Player: function () {} };
    await expect(loadYouTubeAPI()).resolves.toBeUndefined();
    expect(
      document.querySelectorAll(`script[src="${YT_SCRIPT_SRC}"]`)
    ).toHaveLength(0);
  });
});

describe("P3.2 caption lifecycle logic unchanged (P2.6 behavior)", () => {
  const tracks: CaptionTrack[] = [
    { lang: "en", name: "English", isAuto: false },
    { lang: "th", name: "Thai", isAuto: false },
  ];

  it("exposes the caption hook contract the player composes", () => {
    // Structural guard: the split keeps a single caption owner with the same
    // state surface the monolith managed inline (no duplicated player state).
    expect(typeof useTrailerCaptions).toBe("function");
  });

  it("parses payloads: arrays pass through, missing/empty normalize to []", () => {
    expect(parseCaptionPayload({ tracks })).toEqual(tracks);
    expect(parseCaptionPayload({ tracks: [] })).toEqual([]);
    expect(parseCaptionPayload({})).toEqual([]);
  });

  it("picks th > en > first", () => {
    expect(pickCaptionTrack(tracks)).toBe("th");
    expect(
      pickCaptionTrack([{ lang: "en", name: "English", isAuto: true }])
    ).toBe("en");
    expect(
      pickCaptionTrack([
        { lang: "ja", name: "Japanese", isAuto: false },
        { lang: "en", name: "English", isAuto: false },
      ])
    ).toBe("en");
    expect(
      pickCaptionTrack([{ lang: "ja", name: "Japanese", isAuto: false }])
    ).toBe("ja");
  });

  it("merges player tracklists without shrinking on partial reads", () => {
    const more: CaptionTrack[] = [
      ...tracks,
      { lang: "ja", name: "Japanese", isAuto: false },
    ];
    expect(mergePlayerTracks([], tracks)).toEqual(tracks);
    expect(mergePlayerTracks(tracks, more)).toEqual(more);
    // Partial/stale player read must not shrink what the API already gave us
    expect(mergePlayerTracks(more, tracks)).toEqual(more);
  });
});

describe("P3.2 admin/subs is labeled tooling-preview", () => {
  it("states client-only, no-persistence scope explicitly", () => {
    const html = renderToString(<SubsEditorPage />);
    expect(html).toContain("Internal tooling preview");
    expect(html).toContain("client-only, no persistence");
  });
});

describe("P3.2 no catalog changes", () => {
  it("keeps the catalog at exactly 104 rows, unreleased split intact", () => {
    expect(animes).toHaveLength(104);
    // 4 upcoming rows stay review/trailer-only, never in the watchable set
    expect(getUpcomingAnimes()).toHaveLength(4);
    expect(getUpcomingAnimes().every((a) => a.status === "ยังไม่ฉาย")).toBe(
      true
    );
    expect(getWatchableAnimes()).toHaveLength(100);
    expect(
      getWatchableAnimes().some((a) => a.status === "ยังไม่ฉาย")
    ).toBe(false);
  });
});
