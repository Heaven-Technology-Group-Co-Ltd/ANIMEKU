"use client";
import type { Anime } from "@/lib/data";
import { getLegalPlatforms } from "@/lib/platforms";
import { Search, ExternalLink, ShieldCheck } from "lucide-react";

export default function LegalPlatforms({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const platforms = getLegalPlatforms(anime);
  const verified = platforms.filter((p) => p.verified);
  const discovery = platforms.filter((p) => !p.verified);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Search className="h-4 w-4 text-zinc-300" />
        </span>
        <div>
          <h3 className="text-sm font-black text-white leading-tight">ค้นหาเรื่องนี้บนแพลตฟอร์มถูกลิขสิทธิ์</h3>
          <p className="text-xs text-zinc-500">
            ลิงก์ค้นหาจะพาไปยังหน้าค้นหาอย่างเป็นทางการของแต่ละแพลตฟอร์ม
          </p>
        </div>
        <span className="ml-auto hidden sm:inline-flex rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300">
          ค้นหา {platforms.length} แพลตฟอร์ม
        </span>
      </div>

      {/* Verified — only when explicit licensing data exists */}
      {verified.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> รับชมอย่างถูกลิขสิทธิ์บน
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {verified.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold hover:opacity-90 transition border border-white/10 ${p.color} ${p.textColor}`}
                aria-label={`รับชมอย่างถูกลิขสิทธิ์บน ${p.label}`}
              >
                {p.label} <ExternalLink className="h-3 w-3 opacity-70" /> ✓
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Discovery / Search — default for all current heuristic outputs */}
      {discovery.length > 0 && (
        <>
          <p className="text-xs font-semibold text-zinc-400">
            {verified.length > 0 ? "ค้นหาเพิ่มเติมบน:" : "ค้นหาเรื่องนี้บน:"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {discovery.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
                aria-label={`ค้นหาเรื่องนี้บน ${p.label}`}
              >
                <Search className="h-3 w-3" /> {p.label}
              </a>
            ))}
          </div>
        </>
      )}

      {/* Disclaimer — subtle, professional */}
      <p className="mt-3 text-[11px] leading-4 text-zinc-500">
        แพลตฟอร์มและสิทธิ์การรับชมอาจเปลี่ยนแปลงได้ โปรดตรวจสอบสถานะล่าสุดจากแพลตฟอร์มอย่างเป็นทางการ
      </p>

      {!compact && (
        <p className="mt-2 text-[11px] leading-4 text-zinc-600">
          ลิงก์ทั้งหมดเป็นลิงก์ค้นหาชื่อเรื่องบนแพลตฟอร์ม — ไม่ใช่การยืนยันว่ามีลิขสิทธิ์พร้อมรับชมเสมอไป
        </p>
      )}
    </div>
  );
}
