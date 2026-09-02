import Link from "next/link";
import { Search, Home, Film, Sparkles, ArrowRight } from "lucide-react";
import { animes } from "@/lib/data";
import { AnimeCard } from "@/components/AnimeCard";

export default function NotFound() {
  const picks = animes.slice(0, 6);
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-3xl border border-white/10 bg-[#12121a] p-8 sm:p-10 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3b82]/10 via-transparent to-[#7c3aed]/10 pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
            <Film className="h-3.5 w-3.5" /> 404 • ไม่พบหน้าที่คุณหา
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">หน้านี้ไม่มีใน ANIMEKU</h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-6">
            ลิงก์อาจเปลี่ยนชื่อ หรืออนิเมะเรื่องนี้ยังไม่ได้เพิ่มใน Top 104 — แต่เรายังมีแนะนำเด็ดๆ ให้ดูต่อได้เลย
            <br />
            ลองค้นหาชื่อเรื่อง หรือกลับไปเลือกจากหมวดหมู่แนะนำ
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#ff3b82] px-6 py-2.5 text-sm font-black text-white hover:bg-[#ff5a96] shadow shadow-[#ff3b82]/20">
              <Home className="h-4 w-4" /> กลับหน้าแรก
            </Link>
            <Link href="/search" className="inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-2.5 text-sm font-bold hover:bg-zinc-100">
              <Search className="h-4 w-4" /> ค้นหาอนิเมะ
            </Link>
            <Link href="/category/ทั้งหมด" className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10">
              ดูหมวดหมู่แนะนำ <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4 text-left">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2"><Sparkles className="h-4 w-4" /> ทิป: หาเรื่องแบบ 207141-yani-neko</h3>
            <p className="text-sm text-zinc-300 mt-1">พิมพ์แค่ <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">207141</span> หรือ <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">yani neko</span> ในช่องค้นหา — ระบบจะดึงสดจาก AniList ให้อัตโนมัติ ไม่ต้องรอเพิ่มในลิสต์</p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-black text-white flex items-center gap-2">⭐ แนะนำแทน — ดูตัวอย่างแนะนำได้เลย</h2>
        <p className="text-sm text-zinc-500 mt-1">หยิบ Top 6 ที่คนดูเยอะสุดมาให้ — กดแล้วดู Trailer แบบ Custom Player ได้ทันที</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {picks.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
