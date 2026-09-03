import { describe, it, expect } from "vitest";
import {
  dubMap,
  getDubEntry,
  getDubInfo,
  isVerifiedDub,
  isValidYoutubeId,
  resolveTrailerDub,
  getDubDisplayState,
  shouldShowVerifiedDubBadge,
  validateDubMap,
  applyDubMap,
  DUB_VERIFIED_LABEL,
  DUB_UNAVAILABLE_LABEL,
  type DubInfo,
} from "@/lib/dubMap";
import { getCustomSubs } from "@/lib/customSubs";
import { toAnime, type AniAnime } from "@/lib/anilist";

// 11-char valid YouTube IDs for fixtures (never real claims — test-only)
const VALID_A = "dQw4w9WgXcQ";
const VALID_B = "9bZkp7q19f0";

function makeAniTrailer(): AniAnime {
  return {
    id: 999,
    title: { romaji: "Test Romaji", english: "Test English", native: "テスト" },
    coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/cover-small.jpg" },
    bannerImage: "https://example.com/banner.jpg",
    averageScore: 85,
    seasonYear: 2024,
    season: "SPRING",
    episodes: 12,
    status: "FINISHED",
    studios: { nodes: [{ name: "Test Studio" }] },
    genres: ["Action"],
    trailer: { id: "abc123def45", site: "youtube", thumbnail: null },
    description: "desc",
    popularity: 100000,
  };
}

describe("dubMap source of truth", () => {
  it("stays empty until genuinely verified evidence exists in-repo", () => {
    // P1.5: ห้ามเติมรายการปลอม — map ว่างคือสถานะที่ถูกต้อง
    expect(Object.keys(dubMap)).toHaveLength(0);
  });

  it("the shipped map passes validation", () => {
    expect(validateDubMap(dubMap)).toEqual([]);
  });

  it("uses truthful Thai wording constants", () => {
    expect(DUB_VERIFIED_LABEL).toBe("พากย์ไทย");
    expect(DUB_VERIFIED_LABEL).not.toContain("จริง");
    expect(DUB_UNAVAILABLE_LABEL).toContain("ยังไม่มีข้อมูลพากย์ไทยที่ยืนยัน");
  });
});

describe("isValidYoutubeId", () => {
  it("accepts 11-char YouTube IDs", () => {
    expect(isValidYoutubeId(VALID_A)).toBe(true);
    expect(isValidYoutubeId("Gp-H_YOcYTM")).toBe(true);
    expect(isValidYoutubeId(`  ${VALID_A}  `)).toBe(true); // trims
  });

  it("rejects malformed IDs", () => {
    expect(isValidYoutubeId("")).toBe(false);
    expect(isValidYoutubeId(undefined)).toBe(false);
    expect(isValidYoutubeId(null)).toBe(false);
    expect(isValidYoutubeId("short")).toBe(false);
    expect(isValidYoutubeId("waytoolongvideoid123")).toBe(false);
    expect(isValidYoutubeId("xxxxxxxxxxx!")).toBe(false); // 12 chars + invalid char
    expect(isValidYoutubeId("abc def_ghi1")).toBe(false); // space invalid
  });
});

describe("verified dub detection", () => {
  it("detects a verified entry correctly", () => {
    dubMap["__p15_test__"] = { videoId: VALID_A, provider: "Muse Thailand", verified: true };
    try {
      expect(getDubEntry("__p15_test__")).toBeDefined();
      expect(getDubInfo("__p15_test__")).toEqual({
        videoId: VALID_A,
        provider: "Muse Thailand",
        verified: true,
      });
      expect(isVerifiedDub("__p15_test__")).toBe(true);
    } finally {
      delete dubMap["__p15_test__"];
    }
    expect(isVerifiedDub("__p15_test__")).toBe(false);
  });

  it("does not treat unverified/nonexistent entries as verified", () => {
    expect(getDubInfo("no-such-anime")).toBeUndefined();
    expect(getDubInfo("")).toBeUndefined();
    expect(getDubInfo(undefined)).toBeUndefined();
    expect(getDubInfo(null)).toBeUndefined();
    expect(isVerifiedDub("no-such-anime")).toBe(false);
    expect(isVerifiedDub("")).toBe(false);

    // verified=false entry must never count, even with valid id+provider
    dubMap["__p15_unver__"] = { videoId: VALID_A, provider: "Muse Thailand", verified: false };
    try {
      expect(getDubInfo("__p15_unver__")).toBeUndefined();
      expect(isVerifiedDub("__p15_unver__")).toBe(false);
    } finally {
      delete dubMap["__p15_unver__"];
    }
  });

  it("does not treat a bare trailerDubYoutubeId as verified dub evidence", () => {
    // trailer dub id เดิมไม่ใช่หลักฐาน — resolve ต้องอาศัย dubMap เท่านั้น
    const resolved = resolveTrailerDub({ id: "16498", trailerDubYoutubeId: VALID_A });
    expect(resolved.verified).toBe(false);
    expect(resolved.videoId).toBeUndefined();
  });

  it("resolveTrailerDub is deterministic", () => {
    const a = resolveTrailerDub({ id: "16498" });
    const b = resolveTrailerDub({ id: "16498" });
    expect(a).toEqual(b);
    expect(resolveTrailerDub({ id: "16498" })).toEqual(resolveTrailerDub({ id: "16498" }));
  });
});

describe("player dub display state (no false official-dub state)", () => {
  it("shows verified only for verified + valid + distinct videoId", () => {
    expect(
      getDubDisplayState({ videoId: VALID_A, verified: true, mainTrailerId: VALID_B })
    ).toBe("verified");
    expect(
      shouldShowVerifiedDubBadge({ videoId: VALID_A, verified: true, mainTrailerId: VALID_B })
    ).toBe(true);
  });

  it("never exposes official-dub state without verification", () => {
    // มี videoId แต่ไม่มี verified → unavailable
    expect(getDubDisplayState({ videoId: VALID_A, verified: false, mainTrailerId: VALID_B })).toBe(
      "unavailable"
    );
    expect(getDubDisplayState({ videoId: VALID_A, mainTrailerId: VALID_B })).toBe("unavailable");
    // dub ซ้ำ trailer หลัก (เช่น fallback เดิมของ AniList) → unavailable
    expect(getDubDisplayState({ videoId: VALID_A, verified: true, mainTrailerId: VALID_A })).toBe(
      "unavailable"
    );
    // malformed ID แม้ verified → unavailable
    expect(getDubDisplayState({ videoId: "bad", verified: true, mainTrailerId: VALID_B })).toBe(
      "unavailable"
    );
    // ว่างเปล่า → unavailable
    expect(getDubDisplayState({})).toBe("unavailable");
    expect(getDubDisplayState({ videoId: "", verified: true })).toBe("unavailable");

    expect(
      shouldShowVerifiedDubBadge({ videoId: VALID_A, verified: false, mainTrailerId: VALID_B })
    ).toBe(false);
    expect(shouldShowVerifiedDubBadge({})).toBe(false);
  });

  it("is deterministic", () => {
    const args = { videoId: VALID_A, verified: true as const, mainTrailerId: VALID_B };
    expect(getDubDisplayState(args)).toBe(getDubDisplayState({ ...args }));
  });
});

describe("validateDubMap (fake-entry guard)", () => {
  it("accepts empty map and well-formed verified entries", () => {
    expect(validateDubMap({})).toEqual([]);
    const ok: Record<string, DubInfo> = {
      "101922": { videoId: VALID_A, provider: "Muse Thailand", verified: true },
      "16498": { videoId: VALID_B, provider: "Ani-One Thailand", verified: true, source: "https://www.youtube.com/@Ani-OneThailand" },
    };
    expect(validateDubMap(ok)).toEqual([]);
  });

  it("rejects empty videoId marked verified", () => {
    const errors = validateDubMap({ "1": { videoId: "", provider: "Muse Thailand", verified: true } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("empty videoId"))).toBe(true);
  });

  it("rejects verified=true without provider", () => {
    const errors = validateDubMap({ "1": { videoId: VALID_A, provider: "  ", verified: true } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("provider"))).toBe(true);
  });

  it("rejects malformed YouTube IDs", () => {
    const errors = validateDubMap({ "1": { videoId: "not-an-id", provider: "Muse Thailand", verified: true } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("malformed YouTube ID"))).toBe(true);
  });

  it("rejects unverified entries lingering in the map", () => {
    const errors = validateDubMap({ "1": { videoId: VALID_A, provider: "Muse Thailand", verified: false } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects duplicated videoIds across anime", () => {
    const errors = validateDubMap({
      "1": { videoId: VALID_A, provider: "Muse Thailand", verified: true },
      "2": { videoId: VALID_A, provider: "Muse Thailand", verified: true },
    });
    expect(errors.some((e) => e.includes("duplicated videoId"))).toBe(true);
  });
});

describe("applyDubMap", () => {
  it("never fabricates dub data and clears stale unverified values", () => {
    const anime = { id: "16498", trailerYoutubeId: VALID_B, trailerDubYoutubeId: VALID_A };
    applyDubMap(anime);
    // ไม่มี verified entry → ต้องล้างค่า dub เดิมทิ้ง ไม่ใช่คงไว้
    expect(anime.trailerDubYoutubeId).toBeUndefined();
    // trailer หลัก (ซับ) ต้องไม่ถูกแตะ
    expect(anime.trailerYoutubeId).toBe(VALID_B);
  });

  it("applies verified entries from the map", () => {
    dubMap["__p15_apply__"] = { videoId: VALID_A, provider: "Muse Thailand", verified: true };
    try {
      const anime: { id: string; trailerYoutubeId?: string; trailerDubYoutubeId?: string } = {
        id: "__p15_apply__",
        trailerYoutubeId: VALID_B,
      };
      applyDubMap(anime);
      expect(anime.trailerDubYoutubeId).toBe(VALID_A);
      expect(anime.trailerYoutubeId).toBe(VALID_B);
    } finally {
      delete dubMap["__p15_apply__"];
    }
  });
});

describe("P1.5 regressions", () => {
  it("toAnime never fabricates Thai-dub data from AniList trailers", () => {
    const anime = toAnime(makeAniTrailer());
    expect(anime.trailerYoutubeId).toBe("abc123def45");
    expect(anime.trailerDubYoutubeId).toBeUndefined();
    expect(resolveTrailerDub(anime).verified).toBe(false);
  });

  it("existing subtitle behavior is unaffected", () => {
    // custom subs ยัง resolve ได้เหมือนเดิม (ไม่มี network — local data ล้วน)
    expect(getCustomSubs("EIVVnLlhzr0")).not.toBeNull();
    expect(getCustomSubs("unknown123")).toBeNull();
    // dub logic ไม่แตะ trailer หลักที่ใช้ match ซับ
    const anime: { id: string; trailerYoutubeId?: string; trailerDubYoutubeId?: string } = {
      id: "x",
      trailerYoutubeId: "EIVVnLlhzr0",
    };
    applyDubMap(anime);
    expect(anime.trailerYoutubeId).toBe("EIVVnLlhzr0");
  });
});
