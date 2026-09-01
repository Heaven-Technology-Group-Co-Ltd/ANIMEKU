import { searchAnimes } from "@/lib/data";
import { AnimeCard } from "@/components/AnimeCard";

export const metadata = { title: "ค้นหาอนิเมะ" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? searchAnimes(query) : [];
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-white">ค้นหา {query && <span className="text-[#ff3b82]">“{query}”</span>}</h1>
      <p className="text-sm text-zinc-500 mt-1">{query ? `พบ ${results.length} เรื่อง` : "พิมพ์คำค้นในช่องด้านบน หรือใช้ ?q=ชื่อเรื่อง"}</p>
      <form action="/search" className="mt-4 flex gap-2 max-w-md">
        <input name="q" defaultValue={query} placeholder="ค้นหาอนิเมะ..." className="flex-1 h-10 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#ff3b82]/40" />
        <button className="rounded-full bg-[#ff3b82] px-6 text-sm font-bold text-white">ค้นหา</button>
      </form>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {results.map((a) => <AnimeCard key={a.id} anime={a} />)}
      </div>
      {query && results.length === 0 && <p className="text-zinc-500 mt-8">ไม่พบผลลัพธ์สำหรับ “{query}”</p>}
    </div>
  );
}
