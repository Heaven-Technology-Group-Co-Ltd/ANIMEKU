// ซับทำเอง — ใส่ที่นี่เมื่อคลิปจริงไม่มี CC
// format: videoId -> [{ start, end, text }]
// start/end เป็นวินาที, text รองรับ \n

export type Cue = { start: number; end: number; text: string };

export const customSubs: Record<string, Cue[]> = {
  // 131681 EIVVnLlhzr0 — Attack on Titan Final S2
  EIVVnLlhzr0: [
    { start: 0, end: 3, text: "Attack on Titan The Final Season Part 2" },
    { start: 3, end: 6, text: "สงครามเพื่อพาราดิสใกล้ถึงจุดแตกหัก" },
    { start: 6, end: 10, text: "เอเรนเปิดฉากโจมตี — มาเลย์ตอบโต้ทันที" },
    { start: 10, end: 14, text: "แผนที่แท้จริงของซีคถูกเปิดเผย" },
    { start: 14, end: 18, text: "ตัวอย่างแนะนำ — ซับไทยทำเองโดย ANIMEKU" },
    { start: 18, end: 22, text: "ดูถูกลิขสิทธิ์ได้ที่ Crunchyroll / Bilibili / iQIYI" },
  ],
  // 597 Gp-H_YOcYTM — Neko no Ongaeshi — เสียงพูดเริ่ม 16วิ (user confirm)
  "Gp-H_YOcYTM": [
    { start: 16.0, end: 19.8, text: "ฮารุ สาวมัธยมที่เบื่อชีวิตจำเจ" },
    { start: 19.8, end: 23.4, text: "เธอช่วยแมวตัวหนึ่งจากรถบรรทุก" },
    { start: 23.4, end: 27.0, text: "และโลกของเธอก็เปลี่ยนไปตลอดกาล" },
    { start: 27.0, end: 31.2, text: "ของขวัญประหลาด — หนูห่อของขวัญ" },
    { start: 31.2, end: 35.5, text: "และคำขอแต่งงานจากเจ้าชายแห่งอาณาจักรแมว!" },
    { start: 35.5, end: 39.8, text: "ฮารุต้องเดินทางสู่อาณาจักรแมว" },
    { start: 39.8, end: 44.1, text: "บารอน แมวสุภาพบุรุษจะพาเธอกลับมาได้ไหม?" },
    { start: 44.1, end: 48.0, text: "The Cat Returns — ตัวอย่างแนะนำ • ANIMEKU" },
  ],
  // 21519 k4xGqY5IDBE — Your Name (Kimi no Na wa) — Trailer Tohoku — แปลตรง ไม่ตีความ
  "k4xGqY5IDBE": [
    { start: 0, end: 4.2, text: "ตื่นมาตอนเช้า อยู่ๆ ก็น้ำตาไหล" },
    { start: 4.2, end: 7.0, text: "เป็นแบบนี้บางครั้ง" },
    { start: 7.0, end: 11.5, text: "ความฝันที่เพิ่งฝันไป จำไม่ได้ทุกที" },
    { start: 11.5, end: 16.0, text: "แค่รู้สึกมาตลอดว่า กำลังตามหาอะไรบางอย่าง" },
    { start: 16.0, end: 19.2, text: "กำลังตามหาใครบางคน" },
    { start: 19.2, end: 23.5, text: "ความรู้สึกนี้เริ่มตั้งแต่ — วันนั้น" },
    { start: 23.5, end: 28.5, text: "วันที่ดาวตก — สวยเหมือนภาพในฝัน" },
    { start: 28.5, end: 33.0, text: "ทาคิ เด็กหนุ่มโตเกียว / มิตสึฮะ เด็กสาวชนบท" },
    { start: 33.0, end: 37.5, text: "วันหนึ่ง ตื่นมาแล้วอยู่ในร่างของอีกคน" },
    { start: 37.5, end: 42.0, text: "เราสลับร่างกันในความฝัน — งั้นหรือ?" },
    { start: 42.0, end: 46.5, text: "Your Name. — หลับฝัน ตื่นเจอกัน" },
    { start: 46.5, end: 51.0, text: "ตัวอย่างแนะนำ • ซับไทยแปลตรง • ANIMEKU" },
  ],
};

export function getCustomSubs(videoId: string): Cue[] | null {
  return customSubs[videoId.trim()] || null;
}

// helper สำหรับ overlay
export function getActiveCue(cues: Cue[], current: number, delaySec = 0): string | null {
  const t = current - delaySec;
  const c = cues.find((cue) => t >= cue.start && t < cue.end);
  return c ? c.text : null;
}
