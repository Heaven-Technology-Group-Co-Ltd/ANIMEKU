// พากย์ไทยที่มีจริง — เติม Youtube ID ของ Trailer/PV พากย์ไทยจริงที่นี่
// หาจากช่อง Muse Thailand / Ani-One Thailand / Dex / Dream Express
// ตัวอย่าง: ค้นหาใน YouTube "Muse Thailand พากย์ไทย ชื่อเรื่อง"
// ใส่แล้ว TrailerPlayer จะขึ้นปุ่ม พากย์ไทย แบบมี "พากย์จริง ✓" และสลับคลิปได้จริง

export const dubMap: Record<string, string> = {
  // id: youtubeId (11 chars)
  // ตัวอย่างเติมจริง 3 เรื่องก่อน — ที่เหลือเติมเพิ่มได้เรื่อยๆ (ตอนนี้มี 104 เรื่องรอเติม)
  // "101922": "xxxxxxxxxxx", // Kimetsu no Yaiba - Kimetsu TH dub PV
  // "16498": "xxxxxxxxxxx", // Attack on Titan - TH dub
  // "113415": "xxxxxxxxxxx", // Jujutsu Kaisen - TH dub
};

// helper to apply dubMap to data at runtime (optional future: merge in getAnimeBySlug)
export function applyDubMap(anime: { id: string; trailerYoutubeId?: string; trailerDubYoutubeId?: string }) {
  const dub = dubMap[anime.id];
  if (dub) anime.trailerDubYoutubeId = dub;
  return anime;
}
