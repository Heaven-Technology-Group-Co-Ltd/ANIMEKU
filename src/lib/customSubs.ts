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
  // 21519 k4xGqY5IDBE — Your Name — SRT ตรงจากไฟล์ผู้ใช้ + แปลตรง
  "k4xGqY5IDBE": [
    { start: 2.4, end: 5.23, text: "วันนั้น วันที่ดาวตกลงมา" },
    { start: 5.23, end: 14.32, text: "มันสวยราวกับภาพในฝัน\nอย่างหาที่เปรียบไม่ได้" },
    { start: 14.32, end: 26.65, text: "ตื่นสักทีเหรอ" },
    { start: 26.65, end: 36.1, text: "หลังเลิกเรียนเหรอ? โทษที\nวันนี้ต้องไปทำงานพิเศษแล้ว" },
    { start: 36.1, end: 44.26, text: "เบื่อชนบทแบบนี้ เบื่อชีวิตแบบนี้\nชาติหน้าให้เกิดเป็นหนุ่มหล่อในโตเกียวทีเถอะ!" },
    { start: 44.26, end: 50.36, text: "ที่นี่ที่ไหน? ว่าแต่..." },
    { start: 50.36, end: 52.68, text: "รู้สึกเหมือนฝันแปลกๆ มาตลอดเลย" },
    { start: 52.68, end: 54.41, text: "ฝันว่าได้ใช้ชีวิตเป็นคนอื่นงั้นเหรอ?" },
    { start: 54.41, end: 58.78, text: "นี่มัน... นี่มัน..." },
    { start: 58.78, end: 63.89, text: "นี่พวกเรากำลังสลับร่างกัน\nในความฝันงั้นเหรอ?" },
    { start: 63.89, end: 68.48, text: "มีอย่างหนึ่งที่ฉันแน่ใจ" },
    { start: 68.48, end: 78.14, text: "ฉันคิดว่าถ้าเราได้เจอกัน\nจะจำกันได้ทันที" },
    { start: 78.14, end: 82.24, text: "ไม่ว่าเธอจะอยู่ที่ไหนในโลก\nฉันจะไปหาเธอแน่นอน" },
    { start: 82.24, end: 87.75, text: "เธอคือใคร? แกคือใคร?\n— Your Name." },
    { start: 87.75, end: 92.11, text: "ขอบคุณที่รับชม" },
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
