import type { Anime } from "./data";

export type PlatformId = "youtube" | "bilibili" | "iqiyi" | "crunchyroll" | "netflix" | "prime";

export type PlatformInfo = {
  id: PlatformId;
  name: string;
  color: string; // tailwind bg
  textColor: string;
  label: string; // short label
  /** Deterministic search/discovery URL — always a safe https URL with encoded query. */
  url: string;
  /** Explicit licensing verification state. Only true when repository contains explicit verified data. */
  verified: boolean;
  /**
   * @deprecated Use `verified` instead. Kept for backwards compatibility — equals `verified`.
   * `available` historically reflected heuristic availability; now it mirrors `verified` to avoid misleading claims.
   */
  available: boolean;
  /** Function that returns the same deterministic URL (kept for backwards compatibility). */
  searchUrl: (anime: Anime) => string;
};

/** Backwards-compatible alias — prefer `PlatformInfo`. */
export type LegalPlatform = PlatformInfo;

/**
 * Explicit verified licensing map.
 * Only entries listed here are treated as verified.
 * Empty by default — all current platform links are discovery/search destinations.
 * When real licensing data is available, add e.g. "16498": ["crunchyroll","bilibili"]
 */
const VERIFIED_LICENSES: Readonly<Record<string, readonly PlatformId[]>> = {
  // No verified entries yet — all links are discovery/search.
};

function isVerified(anime: Anime, platformId: PlatformId): boolean {
  // 1) Explicit anime field (for future CMS/DB where anime.verifiedPlatforms is set)
  const explicitField = (anime as unknown as { verifiedPlatforms?: readonly PlatformId[] })
    .verifiedPlatforms;
  if (Array.isArray(explicitField) && explicitField.includes(platformId)) return true;
  // 2) Central allow-list
  const listed = VERIFIED_LICENSES[anime.id];
  if (listed && listed.includes(platformId)) return true;
  return false;
}

function buildSearchUrl(platformId: PlatformId, anime: Anime): string {
  // Use encodeURIComponent for title values to ensure deterministic, safe URLs.
  const titleEn = anime.titleEn ?? "";
  const titleTh = anime.titleTh ?? "";
  switch (platformId) {
    case "crunchyroll":
      return `https://www.crunchyroll.com/search?q=${encodeURIComponent(titleEn)}`;
    case "bilibili":
      return `https://www.bilibili.tv/search?q=${encodeURIComponent(titleTh)}`;
    case "iqiyi":
      return `https://www.iq.com/search?query=${encodeURIComponent(titleEn)}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${titleEn} ซับไทย`)}`;
    case "netflix":
      return `https://www.netflix.com/search?q=${encodeURIComponent(titleEn)}`;
    case "prime":
      return `https://www.primevideo.com/search?phrase=${encodeURIComponent(titleEn)}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(titleEn)}`;
  }
}

const PLATFORM_DEFS: ReadonlyArray<Omit<PlatformInfo, "url" | "verified" | "available" | "searchUrl">> = [
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    color: "bg-[#f47521]",
    textColor: "text-white",
    label: "Crunchyroll",
  },
  {
    id: "bilibili",
    name: "Bilibili",
    color: "bg-[#00a1d6]",
    textColor: "text-white",
    label: "Bilibili",
  },
  {
    id: "iqiyi",
    name: "iQIYI",
    color: "bg-[#1cc749]",
    textColor: "text-white",
    label: "iQIYI",
  },
  {
    id: "youtube",
    name: "YouTube (Muse)",
    color: "bg-white",
    textColor: "text-black",
    label: "YouTube",
  },
  {
    id: "netflix",
    name: "Netflix",
    color: "bg-[#e50914]",
    textColor: "text-white",
    label: "Netflix",
  },
  {
    id: "prime",
    name: "Prime Video",
    color: "bg-[#00a8e1]",
    textColor: "text-white",
    label: "Prime Video",
  },
];

/**
 * Returns platform entries for the given anime as deterministic discovery/search links.
 * `verified === true` only when explicit verified data exists (see VERIFIED_LICENSES or anime.verifiedPlatforms).
 * Otherwise `verified === false` — caller MUST present as search/discovery, never as confirmed availability.
 */
export function getLegalPlatforms(anime: Anime): PlatformInfo[] {
  return PLATFORM_DEFS.map((def) => {
    const url = buildSearchUrl(def.id, anime);
    const verified = isVerified(anime, def.id);
    const searchUrl = () => url;
    return {
      ...def,
      url,
      verified,
      available: verified, // deprecated alias
      searchUrl,
    };
  });
}

/** Returns only platforms with explicit verified licensing. Currently empty until verified data is added. */
export function getVerifiedPlatforms(anime: Anime): PlatformInfo[] {
  return getLegalPlatforms(anime).filter((p) => p.verified);
}

/**
 * @deprecated Use `getVerifiedPlatforms` instead. Kept for backwards compatibility.
 * Historically returned heuristic availability; now returns verified platforms only.
 */
export function getAvailablePlatforms(anime: Anime): PlatformInfo[] {
  return getVerifiedPlatforms(anime);
}
