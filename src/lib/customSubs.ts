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
  // 597 Gp-H_YOcYTM — Neko no Ongaeshi / The Cat Returns — trailer 2:08, +1.5s delay to match audio (ซับขึ้นก่อน → ดีเลย์)
  "Gp-H_YOcYTM": [
    { start: 1.5, end: 4.7, text: "The Cat Returns — Neko no Ongaeshi" },
    { start: 4.7, end: 9.3, text: "จากสตูดิโอผู้สร้าง Spirited Away" },
    { start: 9.3, end: 13.0, text: "ฮารุ สาวมัธยมที่เบื่อชีวิตจำเจ" },
    { start: 13.0, end: 17.4, text: "เธอช่วยแมวตัวหนึ่งจากรถบรรทุก" },
    { start: 17.4, end: 21.7, text: "และโลกของเธอก็เปลี่ยนไปตลอดกาล" },
    { start: 21.7, end: 26.1, text: "ของขวัญประหลาด — หนูห่อของขวัญ" },
    { start: 26.1, end: 30.6, text: "และคำขอแต่งงานจากเจ้าชายแห่งอาณาจักรแมว!" },
    { start: 30.6, end: 35.3, text: "ฮารุต้องเดินทางสู่อาณาจักรแมว" },
    { start: 35.3, end: 39.9, text: "บารอน แมวสุภาพบุรุษจะพาเธอกลับมาได้ไหม?" },
    { start: 39.9, end: 43.5, text: "ตัวอย่างแนะนำ — ซับไทยเป๊ะ โดย ANIMEKU" },
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
