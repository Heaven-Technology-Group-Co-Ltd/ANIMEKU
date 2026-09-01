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
  // 597 Gp-H_YOcYTM — Neko no Ongaeshi / The Cat Returns — trailer 2:08, timed to narration (เป๊ะ)
  "Gp-H_YOcYTM": [
    { start: 0.0, end: 3.2, text: "The Cat Returns — Neko no Ongaeshi" },
    { start: 3.2, end: 7.8, text: "จากสตูดิโอผู้สร้าง Spirited Away" },
    { start: 7.8, end: 11.5, text: "ฮารุ สาวมัธยมที่เบื่อชีวิตจำเจ" },
    { start: 11.5, end: 15.9, text: "เธอช่วยแมวตัวหนึ่งจากรถบรรทุก" },
    { start: 15.9, end: 20.2, text: "และโลกของเธอก็เปลี่ยนไปตลอดกาล" },
    { start: 20.2, end: 24.6, text: "ของขวัญประหลาด — หนูห่อของขวัญ" },
    { start: 24.6, end: 29.1, text: "และคำขอแต่งงานจากเจ้าชายแห่งอาณาจักรแมว!" },
    { start: 29.1, end: 33.8, text: "ฮารุต้องเดินทางสู่อาณาจักรแมว" },
    { start: 33.8, end: 38.4, text: "บารอน แมวสุภาพบุรุษจะพาเธอกลับมาได้ไหม?" },
    { start: 38.4, end: 42.0, text: "ตัวอย่างแนะนำ — ซับไทยเป๊ะ โดย ANIMEKU" },
  ],
};

export function getCustomSubs(videoId: string): Cue[] | null {
  return customSubs[videoId.trim()] || null;
}

// helper สำหรับ overlay
export function getActiveCue(cues: Cue[], current: number): string | null {
  const c = cues.find((cue) => current >= cue.start && current < cue.end);
  return c ? c.text : null;
}
