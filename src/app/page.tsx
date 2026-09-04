import { selectHomeSections } from "@/lib/data";
import Hero from "@/components/Hero";
import { AnimeCard } from "@/components/AnimeCard";
import Section from "@/components/Section";
import CategoryPills from "@/components/CategoryPills";

export default function Home() {
  // P2.6: single data-access call-site (was 7 inline selector calls over the
  // same 104 rows). Output identical: same ids, order, slices, and counts —
  // see tests/p23-architecture.test.ts old-vs-new equivalence + P2.6 bundle test.
  // Page stays a server component; no client state introduced.
  const { featured, trending, latestRecommended, watchable, upcoming, counts } =
    selectHomeSections();
  const airingCount = counts.airing;
  const completedCount = counts.completed;

  return (
    <>
      <Hero anime={featured} />

      <Section id="category" title="หมวดหมู่แนะนำ" subtitle="เลือกแนวที่ชอบ แล้วอ่านรีวิวแนะนำได้ทันที">
        <CategoryPills />
      </Section>

      <Section id="trending" title="⭐ แนะนำมาแรงประจำสัปดาห์" subtitle="จัดอันดับจากคะแนน + ยอดนิยม" href="/category/ทั้งหมด">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {trending.map((a, i) => (
            <AnimeCard key={a.id} anime={a} rank={i + 1} />
          ))}
        </div>
      </Section>

      <Section id="latest" title="✨ แนะนำใหม่ล่าสุด" subtitle="รีวิวใหม่ล่าสุด อัปเดตทุกวัน • กดดูตัวอย่างแนะนำ">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {latestRecommended.map((a, i) => (
            <AnimeCard key={a.id} anime={a} rank={i + 1} />
          ))}
        </div>
      </Section>

      <Section title="📺 แนะนำ: กำลังฉาย & จบแล้ว" subtitle={`แนะนำ ${watchable.length} เรื่อง • พร้อมรีวิว + ตัวอย่าง`} href="/category/ทั้งหมด">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {watchable.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </Section>

      <Section title="⏳ แนะนำล่วงหน้า • ยังไม่ฉาย" subtitle={`${upcoming.length} เรื่องที่รอคอย • แนะนำก่อนใคร + ดูตัวอย่างได้ก่อน`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {upcoming.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">* เรื่องที่ยังไม่ฉายจะแสดงป้าย “ยังไม่ฉาย • เร็วๆนี้” — แนะนำ + ดู Trailer (ซับไทย/พากย์ไทย) ได้ก่อน</p>
      </Section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">รวมแนะนำ {counts.total} เรื่อง • {watchable.length} เรื่องแนะนำพร้อมดู • {upcoming.length} เรื่องแนะนำล่วงหน้า</p>
            <p className="text-xs text-zinc-500">โหมดแนะนำ • Top 100 จาก AniList + 4 เรื่องยังไม่ฉาย • รีวิว + Trailer YouTube แท้ • ISR 1 ชม.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-[#22c55e] px-3 py-1.5 font-bold text-white">กำลังฉาย: {airingCount}</span>
            <span className="rounded-full bg-zinc-700 px-3 py-1.5 font-bold text-white">จบแล้ว: {completedCount}</span>
            <span className="rounded-full bg-amber-500 px-3 py-1.5 font-black text-black">ยังไม่ฉาย: {upcoming.length}</span>
          </div>
        </div>
      </div>
    </>
  );
}
