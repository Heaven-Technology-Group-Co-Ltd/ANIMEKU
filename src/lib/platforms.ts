import type { Anime } from "./data";

export type PlatformId = "youtube" | "bilibili" | "iqiyi" | "crunchyroll" | "netflix" | "prime";

export type PlatformInfo = {
  id: PlatformId;
  name: string;
  color: string; // tailwind bg
  textColor: string;
  searchUrl: (anime: Anime) => string;
  available: boolean;
  label: string; // short label
};

// Deterministic hash for anime id
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function getLegalPlatforms(anime: Anime): PlatformInfo[] {
  const h = hashId(anime.id);
  const rating = anime.rating;
  const genres = anime.genres;

  // Heuristic availability (demo logic - replace with real CMS/DB when have license data)
  // You can override by adding anime.platforms field later
  const isPopular = rating >= 8.3 || (anime.trendingRank && anime.trendingRank <= 20);
  const isShounen = genres.includes("แอคชั่น") || genres.includes("ผจญภัย");
  const isRomance = genres.includes("โรแมนติก") || genres.includes("ดราม่า");
  const isFinished = anime.status === "จบแล้ว";

  const platforms: PlatformInfo[] = [
    {
      id: "crunchyroll",
      name: "Crunchyroll",
      color: "bg-[#f47521]",
      textColor: "text-white",
      label: "Crunchyroll",
      searchUrl: (a) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(a.titleEn)}`,
      available: isPopular || isShounen, // popular shounen usually on CR
    },
    {
      id: "bilibili",
      name: "Bilibili",
      color: "bg-[#00a1d6]",
      textColor: "text-white",
      label: "Bilibili",
      searchUrl: (a) => `https://www.bilibili.tv/search?q=${encodeURIComponent(a.titleTh)}`,
      available: true, // Bilibili TH has wide catalog
    },
    {
      id: "iqiyi",
      name: "iQIYI",
      color: "bg-[#1cc749]",
      textColor: "text-white",
      label: "iQIYI",
      searchUrl: (a) => `https://www.iq.com/search?query=${encodeURIComponent(a.titleEn)}`,
      available: isRomance || h % 3 !== 0,
    },
    {
      id: "youtube",
      name: "YouTube (Muse)",
      color: "bg-white",
      textColor: "text-black",
      label: "YouTube",
      searchUrl: (a) => `https://www.youtube.com/results?search_query=${encodeURIComponent(a.titleEn + " ซับไทย")}`,
      available: h % 4 !== 1, // most have muse th channel
    },
    {
      id: "netflix",
      name: "Netflix",
      color: "bg-[#e50914]",
      textColor: "text-white",
      label: "Netflix",
      searchUrl: (a) => `https://www.netflix.com/search?q=${encodeURIComponent(a.titleEn)}`,
      available: rating >= 8.5 && isFinished && h % 2 === 0,
    },
    {
      id: "prime",
      name: "Prime Video",
      color: "bg-[#00a8e1]",
      textColor: "text-white",
      label: "Prime Video",
      searchUrl: (a) => `https://www.primevideo.com/search?phrase=${encodeURIComponent(a.titleEn)}`,
      available: h % 5 === 0,
    },
  ];

  return platforms;
}

export function getAvailablePlatforms(anime: Anime) {
  return getLegalPlatforms(anime).filter((p) => p.available);
}
