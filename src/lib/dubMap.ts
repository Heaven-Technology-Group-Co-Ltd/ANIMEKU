// P1.5 — Verified Thai dub map.
//
// นโยบายข้อมูล (data integrity):
// - จะถือว่าเรื่องใดมี "พากย์ไทยอย่างเป็นทางการ" ก็ต่อเมื่อมี entry ที่ verified
//   อยู่ใน map นี้เท่านั้น ห้ามอนุมานจาก trailer หลักหรือแหล่งอื่น
// - ถ้าไม่มีข้อมูลยืนยันใน repo ห้ามเติมรายการปลอม — map ว่างคือสถานะที่ถูกต้อง
// - แหล่งที่ยอมรับ: ช่องทางการของผู้จัดจำหน่าย เช่น Muse Thailand,
//   Ani-One Thailand, Dex, Dream Express (ต้องระบุ provider ทุก entry)
//
// วิธีเพิ่มรายการที่ยืนยันแล้ว:
//   "101922": { videoId: "xxxxxxxxxxx", provider: "Muse Thailand", verified: true },
// โดย videoId ต้องเป็น YouTube ID ของคลิปพากย์ไทยจริง (11 ตัวอักษร)

export type DubInfo = {
  /** YouTube video ID (11 chars) ของคลิปพากย์ไทยที่ยืนยันแล้ว */
  videoId: string;
  /** ผู้จัดจำหน่ายทางการที่ยืนยัน เช่น "Muse Thailand" — ห้ามว่างเมื่อ verified */
  provider: string;
  /** ต้องเป็น true เท่านั้น UI จึงจะแสดงสถานะพากย์ไทย */
  verified: boolean;
  /** หลักฐานอ้างอิง (เช่น URL ช่องทางการ) — แนะนำให้ระบุ */
  source?: string;
};

/** ข้อความ UI มาตรฐาน — ใช้คำที่เป็นจริง ไม่กล่าวอ้างลิขสิทธิ์เกินจริง */
export const DUB_VERIFIED_LABEL = "พากย์ไทย";
export const DUB_UNAVAILABLE_LABEL = "ยังไม่มีข้อมูลพากย์ไทยที่ยืนยัน";

/** YouTube video ID: อักขระ A-Z a-z 0-9 _ - รวม 11 ตัว */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeId(id?: string | null): boolean {
  if (!id) return false;
  return YOUTUBE_ID_RE.test(id.trim());
}

/**
 * Map ของพากย์ไทยที่ยืนยันแล้ว: key = anime id (AniList/local)
 * ตั้งใจปล่อยว่าง — ใน repo ยังไม่มีข้อมูลพากย์ไทยที่ยืนยันได้ จึงห้ามเติมเอง
 */
export const dubMap: Record<string, DubInfo> = {
  // เติมเฉพาะรายการที่ยืนยันแล้วเท่านั้น (ดูวิธีเติมด้านบน)
};

function normalizeId(id?: string | null): string | null {
  const clean = id?.trim();
  return clean ? clean : null;
}

/** คืน entry ดิบ (ยังไม่ตรวจ validity) — ใช้สำหรับ debug/ตรวจสอบ */
export function getDubEntry(animeId?: string | null): DubInfo | undefined {
  const key = normalizeId(animeId);
  if (!key) return undefined;
  return dubMap[key];
}

/**
 * คืน DubInfo ก็ต่อเมื่อ entry ผ่านเกณฑ์ verified ครบ:
 * verified === true, provider ไม่ว่าง, videoId เป็น YouTube ID ที่ถูกต้อง
 * นอกนั้นคืน undefined (ถือว่าไม่มีข้อมูลพากย์ไทยที่ยืนยัน)
 */
export function getDubInfo(animeId?: string | null): DubInfo | undefined {
  const entry = getDubEntry(animeId);
  if (!entry) return undefined;
  if (entry.verified !== true) return undefined;
  if (!entry.provider?.trim()) return undefined;
  if (!isValidYoutubeId(entry.videoId)) return undefined;
  return entry;
}

/** true ก็ต่อเมื่อมีข้อมูลพากย์ไทยที่ยืนยันและตรวจสอบได้ */
export function isVerifiedDub(animeId?: string | null): boolean {
  return !!getDubInfo(animeId);
}

export type ResolvedDub = {
  /** YouTube ID ของคลิปพากย์ไทย — มีค่าเฉพาะเมื่อ verified เท่านั้น */
  videoId?: string;
  verified: boolean;
};

/**
 * Resolve ข้อมูล dub สำหรับ anime หนึ่งเรื่อง (source of truth ฝั่ง server/pages)
 * - ถ้ามี entry ที่ verified ใน dubMap → ใช้ videoId จาก map
 * - นอกนั้น → { verified: false } (ไม่ใช้ trailerDubYoutubeId เดิมเป็นหลักฐาน dub)
 */
export function resolveTrailerDub(anime: { id: string; trailerDubYoutubeId?: string }): ResolvedDub {
  const info = getDubInfo(anime.id);
  if (info) return { videoId: info.videoId.trim(), verified: true };
  return { videoId: undefined, verified: false };
}

export type DubDisplayState = "verified" | "unavailable";

/**
 * สถานะสำหรับ UI/player — pure function เพื่อให้ test ได้โดยไม่ต้องใช้ network
 * จะคืน "verified" ก็ต่อเมื่อ verified === true และ videoId ถูกต้องและไม่ซ้ำกับ trailer หลัก
 */
export function getDubDisplayState(args: {
  videoId?: string | null;
  verified?: boolean;
  mainTrailerId?: string | null;
}): DubDisplayState {
  const dub = args.videoId?.trim();
  const main = args.mainTrailerId?.trim();
  if (args.verified === true && dub && isValidYoutubeId(dub) && dub !== main) {
    return "verified";
  }
  return "unavailable";
}

/** true ก็ต่อเมื่อ player ควรแสดง/เปิดโหมดพากย์ไทยอย่างเป็นทางการ */
export function shouldShowVerifiedDubBadge(args: {
  videoId?: string | null;
  verified?: boolean;
  mainTrailerId?: string | null;
}): boolean {
  return getDubDisplayState(args) === "verified";
}

/**
 * ตรวจคุณภาพข้อมูลทั้ง map — กันรายการปลอม/ผิดรูปแบบหลุดเข้า repo
 * คืน array ของ error message (ว่าง = ผ่าน)
 * กฎ:
 * - verified ต้องเป็น true (ห้ามมี entry ที่ verified=false ค้างใน map)
 * - provider ห้ามว่าง
 * - videoId ต้องเป็น YouTube ID 11 ตัวอักษรที่ถูกต้อง
 * - videoId ห้ามซ้ำกันข้ามเรื่อง (สถาปัตยกรรมนี้ 1 คลิปต่อ 1 เรื่อง)
 */
export function validateDubMap(map: Record<string, DubInfo>): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const [animeId, entry] of Object.entries(map)) {
    if (!animeId?.trim()) errors.push("dubMap: found empty anime id key");
    if (!entry || typeof entry !== "object") {
      errors.push(`dubMap[${animeId}]: entry must be an object`);
      continue;
    }
    if (entry.verified !== true) {
      errors.push(`dubMap[${animeId}]: verified must be true (no unverified entries allowed)`);
    }
    if (!entry.provider?.trim()) {
      errors.push(`dubMap[${animeId}]: provider is required for verified entries`);
    }
    const vid = entry.videoId?.trim() ?? "";
    if (!vid) {
      errors.push(`dubMap[${animeId}]: empty videoId marked verified`);
    } else if (!isValidYoutubeId(vid)) {
      errors.push(`dubMap[${animeId}]: malformed YouTube ID "${vid}"`);
    } else {
      const prev = seen.get(vid);
      if (prev !== undefined) {
        errors.push(`dubMap[${animeId}]: duplicated videoId "${vid}" (already used by ${prev})`);
      } else {
        seen.set(vid, animeId);
      }
    }
  }
  return errors;
}

/**
 * ใช้ dubMap กับ anime object ตอน runtime — เติม trailerDubYoutubeId
 * เฉพาะเมื่อมีข้อมูล verified เท่านั้น ไม่แตะ trailer หลัก/ซับ
 */
export function applyDubMap(anime: { id: string; trailerYoutubeId?: string; trailerDubYoutubeId?: string }) {
  const resolved = resolveTrailerDub(anime);
  if (resolved.verified && resolved.videoId) {
    anime.trailerDubYoutubeId = resolved.videoId;
  } else {
    anime.trailerDubYoutubeId = undefined;
  }
  return anime;
}
