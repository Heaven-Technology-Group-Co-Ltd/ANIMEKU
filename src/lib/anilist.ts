// AniList Live fetcher (ISR 1 ชม.)
const ANILIST_URL = "https://graphql.anilist.co";

export type AniAnime = {
  id: number;
  title: { romaji: string; english: string | null; native: string };
  coverImage: { extraLarge: string; large: string };
  bannerImage: string | null;
  averageScore: number | null;
  seasonYear: number | null;
  season: string | null;
  episodes: number | null;
  status: string;
  studios: { nodes: { name: string }[] };
  genres: string[];
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  description: string | null;
  popularity: number;
};

const LIST_QUERY = `
query($page: Int, $perPage: Int, $genre: String, $search: String, $sort: [MediaSort]){
  Page(page: $page, perPage: $perPage){
    media(type: ANIME, isAdult: false, genre: $genre, search: $search, sort: $sort, format_in: [TV, TV_SHORT, MOVIE, ONA]){
      id title{ romaji english native } coverImage{ extraLarge large } bannerImage
      averageScore seasonYear season episodes status
      studios(isMain:true){ nodes{ name } } genres trailer{ id site thumbnail } description popularity
    }
  }
}
`;

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 }, // ISR 1h
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const j = await res.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

export async function getTopAnime(perPage = 100, genre?: string): Promise<AniAnime[]> {
  const data = await gql(LIST_QUERY, { page: 1, perPage, genre: genre || null, search: null, sort: ["POPULARITY_DESC"] });
  return data.Page.media as AniAnime[];
}

export async function searchAnilist(search: string, perPage = 24): Promise<AniAnime[]> {
  if (!search.trim()) return [];
  const data = await gql(LIST_QUERY, { page: 1, perPage, genre: null, search, sort: ["POPULARITY_DESC"] });
  return data.Page.media as AniAnime[];
}

export async function getAnimeByIdAni(id: number): Promise<AniAnime | null> {
  const q = `query($id:Int){ Media(id:$id,type:ANIME){ id title{ romaji english native } coverImage{ extraLarge large } bannerImage averageScore seasonYear season episodes status studios(isMain:true){ nodes{ name }} genres trailer{ id site thumbnail } description popularity } }`;
  const data = await gql(q, { id });
  return data.Media as AniAnime;
}

// แปลง AniAnime -> Anime (ของโปรเจกต์)
import type { Anime } from "./data";
const genreMap: Record<string, string> = {
  Action: "แอคชั่น",
  Adventure: "ผจญภัย",
  Fantasy: "แฟนตาซี",
  Drama: "ดราม่า",
  Comedy: "คอมเมดี้",
  "Sci-Fi": "ไซไฟ",
  Supernatural: "เหนือธรรมชาติ",
  Mystery: "ลึกลับ",
  School: "โรงเรียน",
  Music: "ดนตรี",
  "Slice of Life": "ชีวิตประจำวัน",
  Military: "ทหาร",
  Romance: "โรแมนติก",
  Sports: "กีฬา",
  Horror: "สยองขวัญ",
  Thriller: "ระทึกขวัญ",
  Mecha: "หุ่นยนต์",
};
const statusMap: Record<string, Anime["status"]> = {
  FINISHED: "จบแล้ว",
  RELEASING: "กำลังฉาย",
  NOT_YET_RELEASED: "ยังไม่ฉาย",
  HIATUS: "ยังไม่ฉาย",
  CANCELLED: "จบแล้ว",
};
const seasonMap: Record<string, string> = {
  WINTER: "ฤดูหนาว",
  SPRING: "ฤดูใบไม้ผลิ",
  SUMMER: "ฤดูร้อน",
  FALL: "ฤดูใบไม้ร่วง",
};

export function toAnime(a: AniAnime, rank?: number): Anime {
  const titleTh = a.title.english || a.title.romaji; // ใช้ English เป็นไทยชั่วคราว (จะ override ด้วย map ถ้ามี)
  const genresTh = a.genres.slice(0, 3).map((g) => genreMap[g] || g);
  const status = statusMap[a.status] || "จบแล้ว";
  const seasonTh = a.season ? `${seasonMap[a.season] || a.season} ${a.seasonYear || ""}`.trim() : `${a.seasonYear || ""}`;
  const score = a.averageScore ? Math.round(a.averageScore) / 10 : 8.0;
  const views = Math.floor(1500000 + (a.popularity || 50000) * 0.8);
  return {
    id: String(a.id),
    slug: `${a.id}-${(a.title.romaji || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
    title: a.title.romaji,
    titleTh,
    titleEn: a.title.english || a.title.romaji,
    description: (a.description || "").replace(/<[^>]*>/g, "").slice(0, 320) || `อนิเมะ ${a.title.romaji} จาก ${a.studios.nodes[0]?.name || "Unknown Studio"}`,
    cover: a.coverImage.extraLarge,
    banner: a.bannerImage || a.coverImage.extraLarge,
    year: a.seasonYear || 2024,
    season: seasonTh || "ไม่ระบุ",
    episodesTotal: a.episodes || 12,
    rating: score,
    views,
    genres: genresTh.length ? genresTh : ["แอคชั่น"],
    status,
    studio: a.studios.nodes[0]?.name || "Unknown",
    duration: "24 นาที/ตอน",
    trendingRank: rank,
    featured: rank ? rank <= 3 : false,
    trailerYoutubeId: a.trailer?.site === "youtube" ? a.trailer.id : undefined,
    trailerDubYoutubeId: a.trailer?.site === "youtube" ? a.trailer.id : undefined,
    trailerThumbnail: a.trailer?.thumbnail || undefined,
    episodes:
      status === "ยังไม่ฉาย"
        ? []
        : Array.from({ length: Math.min(a.episodes || 12, 24) }, (_, i) => ({
            id: `ep-${i + 1}`,
            number: i + 1,
            title: `Episode ${i + 1}`,
            titleTh: `ตอนที่ ${i + 1}`,
            duration: "23:42",
            hlsUrl: undefined,
            thumbnail: a.coverImage.extraLarge,
            views: views - i * 17000,
            updatedAt: `2024-12-${String(10 + (i % 20)).padStart(2, "0")}`,
          })),
  };
}

export const CATEGORY_THAI = [
  "ทั้งหมด",
  "แอคชั่น",
  "ผจญภัย",
  "แฟนตาซี",
  "ดราม่า",
  "คอมเมดี้",
  "ไซไฟ",
  "โรงเรียน",
  "โรแมนติก",
  "เหนือธรรมชาติ",
  "สยองขวัญ",
  "กีฬา",
  "ดนตรี",
] as const;
