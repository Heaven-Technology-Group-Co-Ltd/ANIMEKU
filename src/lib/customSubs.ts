// ซับทำเอง — ใส่ที่นี่เมื่อคลิปจริงไม่มี CC
// format: videoId -> [{ start, end, text }]
// start/end เป็นวินาที, text รองรับ \n

export type Cue = { start: number; end: number; text: string };

export const customSubs: Record<string, Cue[]> = {
  // ตัวอย่าง: 131681 EIVVnLlhzr0 — ซับไทยทำเอง (demo 10 cues)
  EIVVnLlhzr0: [
    { start: 0, end: 3, text: "Attack on Titan The Final Season Part 2" },
    { start: 3, end: 6, text: "สงครามเพื่อพาราดิสใกล้ถึงจุดแตกหัก" },
    { start: 6, end: 10, text: "เอเรนเปิดฉากโจมตี — มาเลย์ตอบโต้ทันที" },
    { start: 10, end: 14, text: "แผนที่แท้จริงของซีคถูกเปิดเผย" },
    { start: 14, end: 18, text: "ตัวอย่างแนะนำ — ซับไทยทำเองโดย ANIMEKU" },
    { start: 18, end: 22, text: "ดูถูกลิขสิทธิ์ได้ที่ Crunchyroll / Bilibili / iQIYI" },
  ],
  // เติมเรื่องอื่นได้เรื่อยๆ เช่น:
  // "LHtdKWJdif4": [{ start: 0, end: 4, text: "ผ่าพิภพไททัน — ตัวอย่างพากย์ไทย" }],
};

export function getCustomSubs(videoId: string): Cue[] | null {
  return customSubs[videoId.trim()] || null;
}

// helper สำหรับ overlay
export function getActiveCue(cues: Cue[], current: number): string | null {
  const c = cues.find((cue) => current >= cue.start && current < cue.end);
  return c ? c.text : null;
}
