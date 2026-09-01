import { searchAnimes } from "@/lib/data";
import { searchAnilist, toAnime } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";

export const metadata = { title: "ค้นหาอนิเมะ" };
export const revalidate = 3600;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  let results = query ? searchAnimes(query) : [];
  let liveResults: ReturnType<typeof toAnime>[] = [];

  if (query) {
    try {
      const live = await searchAnilist(query, 12);
      liveResults = live.map((a, i) => toAnime(a, 200 + i));
      // Merge: ถ้า live มีเรื่องที่ไม่อยู่ใน local ให้เพิ่ม
      const ids = new Set(results.map((r) => r.id));
      for (const lr of liveResults) {
        if (!ids.has(lr.id) && !results.find((r) => r.slug === lr.slug)) {
          results.push(lr);
        }
      }
    } catch {}
  }

  const isLive = liveResults.length > 0;
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-white">
        ค้นหา {query && <span className="text-[#ff3b82]">“{query}”</span>}
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        {query
          ? `พบ ${results.length} เรื่อง ${isLive ? "• มีผลสดจาก AniList" : "• จาก Top 100"}`
          : "พิมพ์คำค้นในช่องด้านบน หรือใช้ ?q=ชื่อเรื่อง — รองรับทุกเรื่องบน AniList (หลายพันเรื่อง)"}
      </p>
      <form action="/search" className="mt-4 flex gap-2 max-w-md">
        <input
          name="q"
          defaultValue={query}
          placeholder="เช่น Frieren, Solo Leveling, วันพีซ..."
          className="flex-1 h-10 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#ff3b82]/40"
        />
        <button className="rounded-full bg-[#ff3b82] px-6 text-sm font-bold text-white">ค้นหา</button>
      </form>

      {query && (
        <p className="mt-3 text-xs text-zinc-500">
          หมวดหมู่: <span className="text-zinc-300">ทั้งหมด • แอคชั่น • โรแมนติก • สยองขวัญ • กีฬา • ดนตรี</span> — ค้นด้วยชื่อไทย/อังกฤษ/ญี่ปุ่น ได้หมด
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {results.map((a) => (
          <AnimeCard key={a.id} anime={a} />
        ))}
      </div>
      {query && results.length === 0 && <p className="text-zinc-500 mt-8">ไม่พบผลลัพธ์สำหรับ “{query}” — ลองค้นด้วยชื่ออังกฤษ</p>}
      {!query && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#12121a] p-4">
          <p className="text-sm font-semibold text-white">ทิปการค้นหา</p>
          <p className="text-sm text-zinc-400 mt-1">ระบบค้นทั้ง Top 100 (static) และ Live จาก AniList (หลายพันเรื่อง) พร้อมกัน — พิมพ์ “Naruto”, “Attack on Titan”, “ดาบพิฆาตอสูร” ได้เลย</p>
        </div>
      )}
    </div>
  );
}
