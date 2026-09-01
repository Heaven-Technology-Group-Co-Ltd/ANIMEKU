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
  // 597 Gp-H_YOcYTM — Neko no Ongaeshi / The Cat Returns (Studio Ghibli) — auto-generated Thai
  "Gp-H_YOcYTM": [
    { start: 0, end: 4, text: "Neko no Ongaeshi — The Cat Returns" },
    { start: 4, end: 8, text: "ผลงาน Studio Ghibli โดย ฮิโรยูกิ โมริตะ" },
    { start: 8, end: 12, text: "ฮารุ สาวมัธยมที่ช่วยแมวจากรถบรรทุก" },
    { start: 12, end: 16, text: "เธอได้รับคำเชิญสู่ ‘อาณาจักรแมว’" },
    { start: 16, end: 20, text: "การผจญภัยสุดอัศจรรย์จึงเริ่มต้น" },
    { start: 20, end: 25, text: "บารอน แมวสุภาพบุรุษ พร้อมช่วยเหลือฮารุ" },
    { start: 25, end: 29, text: "แต่เธอต้องเลือกระหว่างโลกแมวกับโลกมนุษย์" },
    { start: 29, end: 33, text: "ตัวอย่างแนะนำ — ซับไทย auto-generated โดย ANIMEKU" },
    { start: 33, end: 37, text: "ดูถูกลิขสิทธิ์ Studio Ghibli บน Netflix" },
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
