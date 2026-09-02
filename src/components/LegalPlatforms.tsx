"use client";
import type { Anime } from "@/lib/data";
import { getLegalPlatforms } from "@/lib/platforms";
import { ShieldCheck, Search, ExternalLink } from "lucide-react";

export default function LegalPlatforms({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const platforms = getLegalPlatforms(anime);
  const available = platforms.filter((p) => p.available);
  const unavailable = platforms.filter((p) => !p.available);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </span>
        <div>
          <h3 className="text-sm font-black text-white leading-tight">ดูถูกลิขสิทธิ์ — มีที่ไหนบ้างสำหรับเรื่องนี้</h3>
          <p className="text-xs text-zinc-500">เช็คตามเรื่อง • เขียว = มีลิขสิทธิ์ • เทา = ยังไม่พบ/ค้นหาเพิ่ม</p>
        </div>
        <span className="ml-auto hidden sm:inline-flex rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">
          มี {available.length}/{platforms.length} ที่
        </span>
      </div>

      {/* Available */}
      <div className="flex flex-wrap gap-2">
        {available.map((p) => (
          <a
            key={p.id}
            href={p.searchUrl(anime)}
            target="_blank"
            rel="noopener"
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold hover:opacity-90 transition border border-white/10 ${p.color} ${p.textColor}`}
          >
            {p.label} <ExternalLink className="h-3 w-3 opacity-70" /> ✓
          </a>
        ))}
      </div>

      {available.length === 0 && (
        <p className="mt-2 text-xs text-amber-300">เรื่องนี้ยังไม่พบลิขสิทธิ์หลักในไทย — ลองค้นหาด้วยปุ่มด้านล่าง</p>
      )}

      {/* Unavailable / search */}
      {unavailable.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold text-zinc-400">ยังไม่พบลิขสิทธิ์ / ค้นหาเพิ่ม:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unavailable.map((p) => (
              <a
                key={p.id}
                href={p.searchUrl(anime)}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <Search className="h-3 w-3" /> {p.label}
              </a>
            ))}
          </div>
        </>
      )}

      {!compact && (
        <p className="mt-3 text-[11px] leading-4 text-zinc-500">
          * ข้อมูลถูกลิขสิทธิ์เป็นแบบ heuristic ต่อเรื่อง (hash จาก studio/rating/genre) — เมื่อมี CMS ลิขสิทธิ์จริง ให้แทนที่ <code className="bg-white/10 px-1 rounded">getLegalPlatforms</code> ด้วย DB ได้ทันที •
          แนะนำให้กดปุ่มสีเพื่อไปดูที่แพลตฟอร์มโดยตรง
        </p>
      )}
    </div>
  );
}
