export type Episode = {
  id: string;
  number: number;
  title: string;
  titleTh: string;
  duration: string;
  thumbnail: string;
  views: number;
  updatedAt: string;
};

export type Anime = {
  id: string;
  slug: string;
  title: string;
  titleTh: string;
  titleEn: string;
  description: string;
  cover: string;
  banner: string;
  year: number;
  season: string;
  episodesTotal: number;
  episodes: Episode[];
  rating: number;
  views: number;
  genres: string[];
  status: "กำลังฉาย" | "จบแล้ว" | "ยังไม่ฉาย";
  studio: string;
  duration: string;
  featured?: boolean;
  trendingRank?: number;
};

// Unsplash / Picsum as placeholder covers - production จะเปลี่ยนเป็น CDN จริง
export const animes: Anime[] = [
  {
    id: "1",
    slug: "solo-leveling-season-2",
    title: "Solo Leveling Season 2: Arise from the Shadow",
    titleTh: "โซโล่ เลเวลลิ่ง ซีซั่น 2",
    titleEn: "Solo Leveling Season 2",
    description:
      "ซองจินอูกลับมาอีกครั้งในฐานะฮันเตอร์ระดับ S ที่แข็งแกร่งที่สุด การต่อสู้กับดันเจี้ยนระดับภัยพิบัติและการเปิดเผยความลับของระบบกำลังจะเริ่มขึ้น อนิเมะแอคชั่นอันดับ 1 ที่แฟนๆรอคอยมากที่สุดแห่งปี",
    cover: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=600&fit=crop",
    year: 2025,
    season: "ฤดูหนาว 2025",
    episodesTotal: 12,
    rating: 9.2,
    views: 4520000,
    genres: ["แอคชั่น", "ผจญภัย", "แฟนตาซี"],
    status: "กำลังฉาย",
    studio: "A-1 Pictures",
    duration: "24 นาที/ตอน",
    featured: true,
    trendingRank: 1,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}: Shadow Awakening`,
      titleTh: `ตอนที่ ${i + 1}: เงาแห่งการตื่น`,
      duration: "23:42",
      thumbnail: `https://picsum.photos/seed/solo${i}/320/180`,
      views: 800000 - i * 25000,
      updatedAt: `2025-01-${String(10 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "2",
    slug: "frieren-beyond-journey",
    title: "Frieren: Beyond Journey's End",
    titleTh: "คำอธิษฐานในวันที่จากลา ฟรีเรน",
    titleEn: "Frieren: Beyond Journey's End",
    description:
      "เรื่องราวของเอลฟ์สาวฟรีเรนที่ใช้ชีวิตหลังการผจญภัยปราบจอมมารสิ้นสุดลง เธอออกเดินทางเพื่อเข้าใจความหมายของเวลาและความสัมพันธ์กับเพื่อนมนุษย์ อนิเมะดราม่าแฟนตาซีที่อบอุ่นหัวใจที่สุดแห่งปี",
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ร่วง 2024",
    episodesTotal: 28,
    rating: 9.1,
    views: 3890000,
    genres: ["ดราม่า", "แฟนตาซี", "ผจญภัย"],
    status: "จบแล้ว",
    studio: "Madhouse",
    duration: "24 นาที/ตอน",
    trendingRank: 2,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:10",
      thumbnail: `https://picsum.photos/seed/frieren${i}/320/180`,
      views: 600000 - i * 15000,
      updatedAt: `2024-11-${String(5 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "3",
    slug: "dandadan",
    title: "DAN DA DAN",
    titleTh: "ดันดาดัน",
    titleEn: "DAN DA DAN",
    description:
      "โมโมะสาวมัธยมผู้เชื่อเรื่องผี และโอคารุนหนุ่มเนิร์ดผู้เชื่อเรื่องมนุษย์ต่างดาว ต้องเผชิญทั้งผีและเอเลี่ยนพร้อมกัน! อนิเมะแอคชั่นคอมเมดี้สุดบ้าคลั่งที่สร้างปรากฏการณ์ทั่วโลก",
    cover: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ร่วง 2024",
    episodesTotal: 12,
    rating: 8.8,
    views: 3210000,
    genres: ["แอคชั่น", "คอมเมดี้", "เหนือธรรมชาติ"],
    status: "กำลังฉาย",
    studio: "Science SARU",
    duration: "23 นาที/ตอน",
    featured: true,
    trendingRank: 3,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "23:20",
      thumbnail: `https://picsum.photos/seed/dandadan${i}/320/180`,
      views: 520000 - i * 12000,
      updatedAt: `2024-10-${String(10 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "4",
    slug: "kaiju-no8",
    title: "Kaiju No. 8",
    titleTh: "ไคจูหมายเลข 8",
    titleEn: "Kaiju No. 8",
    description: "ฮิบิโนะ คาฟก้าชายวัย 32 ที่ฝันอยากเข้าหน่วยป้องกันไคจู แต่กลับกลายเป็นไคจูเสียเอง! เขาจะปกปิดตัวตนและต่อสู้เพื่อมนุษยชาติได้อย่างไร",
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c429?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ผลิ 2024",
    episodesTotal: 12,
    rating: 8.5,
    views: 2980000,
    genres: ["แอคชั่น", "ไซไฟ", "ทหาร"],
    status: "จบแล้ว",
    studio: "Production I.G",
    duration: "24 นาที/ตอน",
    trendingRank: 4,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:00",
      thumbnail: `https://picsum.photos/seed/kaiju${i}/320/180`,
      views: 480000 - i * 10000,
      updatedAt: `2024-04-${String(13 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "5",
    slug: "demon-slayer-hashira",
    title: "Demon Slayer: Hashira Training Arc",
    titleTh: "ดาบพิฆาตอสูร ภาคการสั่งสอนของเสาหลัก",
    titleEn: "Demon Slayer: Hashira Training Arc",
    description: "ทันจิโร่และพรรคพวกเข้าสู่การฝึกพิเศษกับเสาหลักทั้ง 9 เพื่อเตรียมพร้อมสำหรับศึกสุดท้ายกับมุซัน อนิเมะที่ทำรายได้สูงสุดในญี่ปุ่น",
    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ผลิ 2024",
    episodesTotal: 8,
    rating: 8.7,
    views: 4120000,
    genres: ["แอคชั่น", "ดราม่า", "ประวัติศาสตร์"],
    status: "จบแล้ว",
    studio: "ufotable",
    duration: "24 นาที/ตอน",
    trendingRank: 5,
    episodes: Array.from({ length: 8 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:30",
      thumbnail: `https://picsum.photos/seed/kimetsu${i}/320/180`,
      views: 700000 - i * 20000,
      updatedAt: `2024-05-${String(12 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "6",
    slug: "wind-breaker",
    title: "WIND BREAKER",
    titleTh: "วินด์ เบรกเกอร์",
    titleEn: "WIND BREAKER",
    description: "ซากุระ ฮารุกะเด็กหนุ่มผู้ต้องการเป็นที่หนึ่ง เข้าเรียนที่โรงเรียนฟูรินที่ขึ้นชื่อเรื่องนักเลง แต่กลับพบว่าพวกเขาคือผู้ปกป้องเมือง!",
    cover: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ผลิ 2024",
    episodesTotal: 13,
    rating: 7.9,
    views: 1560000,
    genres: ["แอคชั่น", "โรงเรียน", "โชเน็น"],
    status: "จบแล้ว",
    studio: "CloverWorks",
    duration: "23 นาที/ตอน",
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "23:15",
      thumbnail: `https://picsum.photos/seed/wind${i}/320/180`,
      views: 300000 - i * 8000,
      updatedAt: `2024-04-${String(4 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "7",
    slug: "oshi-no-ko-season2",
    title: "Oshi no Ko Season 2",
    titleTh: "เกิดใหม่เป็นลูกโอชิ ซีซั่น 2",
    titleEn: "Oshi no Ko Season 2",
    description: "อควาและรูบี้ก้าวเข้าสู่วงการบันเทิงเต็มตัว การแก้แค้นและความฝันในโลกไอดอลที่เต็มไปด้วยแสงและเงา",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูร้อน 2024",
    episodesTotal: 13,
    rating: 8.4,
    views: 2340000,
    genres: ["ดราม่า", "ดนตรี", "ชีวิตประจำวัน"],
    status: "จบแล้ว",
    studio: "Doga Kobo",
    duration: "24 นาที/ตอน",
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:05",
      thumbnail: `https://picsum.photos/seed/oshinoko${i}/320/180`,
      views: 400000 - i * 9000,
      updatedAt: `2024-07-${String(3 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "8",
    slug: "mushoku-tensei-s2",
    title: "Mushoku Tensei S2 Part 2",
    titleTh: "เกิดชาตินี้พี่ต้องเทพ ภาค 2 พาร์ท 2",
    titleEn: "Mushoku Tensei: Jobless Reincarnation S2",
    description: "รูเดียสเริ่มต้นชีวิตมหาวิทยาลัยเวทมนตร์และการผจญภัยบทใหม่ที่เต็มไปด้วยเวทมนตร์และความรัก",
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c429?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ฤดูใบไม้ผลิ 2024",
    episodesTotal: 12,
    rating: 8.3,
    views: 1870000,
    genres: ["ผจญภัย", "ดราม่า", "แฟนตาซี", "ต่างโลก"],
    status: "จบแล้ว",
    studio: "Studio Bind",
    duration: "23 นาที/ตอน",
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "23:40",
      thumbnail: `https://picsum.photos/seed/mushoku${i}/320/180`,
      views: 320000 - i * 7000,
      updatedAt: `2024-04-${String(7 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "9",
    slug: "one-piece-egghead",
    title: "ONE PIECE: Egghead Arc",
    titleTh: "วันพีซ ภาคเอ็กเฮด",
    titleEn: "ONE PIECE Egghead Island Arc",
    description: "กลุ่มหมวกฟางมุ่งสู่เกาะเอ็กเฮด เกาะแห่งอนาคตของดร.เวกาพังก์ ความลับของศตวรรษที่ว่างเปล่ากำลังถูกเปิดเผย!",
    cover: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=600&fit=crop",
    year: 2024,
    season: "ตลอดปี 2024",
    episodesTotal: 24,
    rating: 9.0,
    views: 5230000,
    genres: ["แอคชั่น", "ผจญภัย", "คอมเมดี้", "โชเน็น"],
    status: "กำลังฉาย",
    studio: "Toei Animation",
    duration: "24 นาที/ตอน",
    featured: true,
    trendingRank: 6,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: 1123 + i,
      title: `Episode ${1123 + i}`,
      titleTh: `ตอนที่ ${1123 + i}`,
      duration: "24:00",
      thumbnail: `https://picsum.photos/seed/onepiece${i}/320/180`,
      views: 900000 - i * 15000,
      updatedAt: `2024-12-${String(1 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "10",
    slug: "jujutsu-kaisen-shibuya",
    title: "Jujutsu Kaisen Season 2 - Shibuya Incident",
    titleTh: "มหาเวทย์ผนึกมาร ภาคชิบูย่า",
    titleEn: "Jujutsu Kaisen S2",
    description: "เหตุการณ์ชิบูย่าที่เปลี่ยนโลกคุณไสยไปตลอดกาล โกโจถูกผนึก สุคุนะตื่นขึ้น และการต่อสู้ที่ดุเดือดที่สุดได้เริ่มต้น",
    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&h=600&fit=crop",
    year: 2023,
    season: "ฤดูร้อน 2023",
    episodesTotal: 23,
    rating: 8.9,
    views: 4890000,
    genres: ["แอคชั่น", "เหนือธรรมชาติ", "โรงเรียน", "โชเน็น"],
    status: "จบแล้ว",
    studio: "MAPPA",
    duration: "23 นาที/ตอน",
    trendingRank: 7,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "23:30",
      thumbnail: `https://picsum.photos/seed/jujutsu${i}/320/180`,
      views: 750000 - i * 18000,
      updatedAt: `2023-07-${String(6 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "11",
    slug: "spy-x-family-s2",
    title: "SPY×FAMILY Season 2",
    titleTh: "สปาย x แฟมิลี ซีซั่น 2",
    titleEn: "SPY×FAMILY S2",
    description: "ครอบครัวฟอร์เจอร์กลับมาแล้ว! ลอยด์ ยอร์ และอาเนีย ต้องเผชิญภารกิจใหม่ที่ทั้งฮาและอบอุ่นหัวใจ",
    cover: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&h=600&fit=crop",
    year: 2023,
    season: "ฤดูใบไม้ร่วง 2023",
    episodesTotal: 12,
    rating: 8.6,
    views: 3120000,
    genres: ["แอคชั่น", "คอมเมดี้", "ชีวิตประจำวัน"],
    status: "จบแล้ว",
    studio: "Wit Studio x CloverWorks",
    duration: "24 นาที/ตอน",
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:15",
      thumbnail: `https://picsum.photos/seed/spyfamily${i}/320/180`,
      views: 500000 - i * 11000,
      updatedAt: `2023-10-${String(7 + i).padStart(2, "0")}`,
    })),
  },
  {
    id: "12",
    slug: "attack-on-titan-final",
    title: "Attack on Titan The Final Season",
    titleTh: "ผ่าพิภพไททัน เดอะ ไฟนอล ซีซั่น",
    titleEn: "Attack on Titan Final Season",
    description: "บทสรุปของมหาสงครามระหว่างมนุษยชาติและไททัน เอเรนเลือกเส้นทางแห่งการทำลายล้างเพื่อปกป้องพวกพ้อง",
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c429?w=1200&h=600&fit=crop",
    year: 2023,
    season: "ฤดูใบไม้ร่วง 2023",
    episodesTotal: 12,
    rating: 9.3,
    views: 5670000,
    genres: ["แอคชั่น", "ดราม่า", "ทหาร", "โชเน็น"],
    status: "จบแล้ว",
    studio: "MAPPA",
    duration: "24 นาที/ตอน",
    trendingRank: 8,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `ep-${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      titleTh: `ตอนที่ ${i + 1}`,
      duration: "24:20",
      thumbnail: `https://picsum.photos/seed/aot${i}/320/180`,
      views: 850000 - i * 20000,
      updatedAt: `2023-11-${String(4 + i).padStart(2, "0")}`,
    })),
  },
];

export const categories = [
  "ทั้งหมด",
  "แอคชั่น",
  "ผจญภัย",
  "แฟนตาซี",
  "ดราม่า",
  "คอมเมดี้",
  "ไซไฟ",
  "โรงเรียน",
  "โชเน็น",
  "เหนือธรรมชาติ",
  "ต่างโลก",
] as const;

export const getAnimeBySlug = (slug: string) => animes.find((a) => a.slug === slug);
export const getTrending = () => animes.filter((a) => a.trendingRank).sort((a, b) => (a.trendingRank! - b.trendingRank!));
export const getFeatured = () => animes.filter((a) => a.featured);
export const getLatestEpisodes = () => {
  const eps: (Episode & { anime: Anime })[] = [];
  animes.forEach((anime) => {
    anime.episodes.slice(0, 2).forEach((ep) => eps.push({ ...ep, anime }));
  });
  return eps.sort((a, b) => b.views - a.views).slice(0, 8);
};
export const searchAnimes = (q: string) => {
  const lower = q.toLowerCase();
  return animes.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.titleTh.includes(q) ||
      a.genres.some((g) => g.includes(q))
  );
};
export const filterByCategory = (cat: string) => {
  if (cat === "ทั้งหมด") return animes;
  return animes.filter((a) => a.genres.includes(cat));
};
