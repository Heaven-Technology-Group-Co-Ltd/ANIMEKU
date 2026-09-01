import { getFeatured, getTrending, getLatestEpisodes, animes } from "@/lib/data";
import Hero from "@/components/Hero";
import { AnimeCard } from "@/components/AnimeCard";
import Section from "@/components/Section";
import CategoryPills from "@/components/CategoryPills";
import Image from "next/image";
import Link from "next/link";
import { Clock, Eye } from "lucide-react";
import { formatViews } from "@/lib/utils";

export default function Home() {
  const featured = getFeatured()[0] ?? animes[0];
  const trending = getTrending().slice(0, 8);
  const latest = getLatestEpisodes();

  return (
    <>
      <Hero anime={featured} />

      <Section id="category" title="หมวดหมู่ยอดนิยม" subtitle="เลือกแนวที่ชอบ แล้วดูได้ทันที">
        <CategoryPills />
      </Section>

      <Section id="trending" title="🔥 มาแรงประจำสัปดาห์" subtitle="อันดับจากยอดดูจริง" href="/category/ทั้งหมด">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {trending.map((a, i) => (
            <AnimeCard key={a.id} anime={a} rank={i + 1} />
          ))}
        </div>
      </Section>

      <Section id="latest" title="ตอนใหม่ล่าสุด" subtitle="อัปเดตทุกวัน เร็วที่สุด">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((ep) => (
            <Link
              key={`${ep.anime.slug}-${ep.number}`}
              href={`/watch/${ep.anime.slug}/${ep.number}`}
              className="flex gap-3 rounded-2xl border border-white/[0.06] bg-[#12121a] p-2.5 hover:bg-[#1a1a24] transition"
            >
              <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                <Image src={ep.thumbnail} alt={ep.titleTh} fill className="object-cover" sizes="128px" />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">{ep.duration}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-white">{ep.anime.titleTh}</p>
                <p className="line-clamp-1 text-xs text-zinc-500">ตอนที่ {ep.number} • {ep.titleTh}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" /> {ep.updatedAt} <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(ep.views)}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="📺 กำลังฉาย & จบแล้ว" subtitle={`ดูได้ทันที ${animes.filter((a) => a.status !== "ยังไม่ฉาย").length} เรื่อง`} href="/category/ทั้งหมด">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {animes.filter((a) => a.status !== "ยังไม่ฉาย").map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </Section>

      <Section title="⏳ ยังไม่ฉาย • เร็วๆนี้" subtitle={`${animes.filter((a) => a.status === "ยังไม่ฉาย").length} เรื่องที่รอคอย • กดดูตัวอย่างได้ก่อน`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {animes.filter((a) => a.status === "ยังไม่ฉาย").map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">* เรื่องที่ยังไม่ฉายจะแสดงป้าย “ยังไม่ฉาย • เร็วๆนี้” และดูได้เฉพาะ Trailer (ซับไทย/พากย์ไทย)</p>
      </Section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">รวมทั้งหมด {animes.length} เรื่อง • {animes.filter((a) => a.status !== "ยังไม่ฉาย").length} เรื่องดูได้ทันที • {animes.filter((a) => a.status === "ยังไม่ฉาย").length} เรื่องยังไม่ฉาย</p>
            <p className="text-xs text-zinc-500">Top 100 จาก AniList + 4 เรื่องยังไม่ฉาย • รูปปก/Banner/Trailer YouTube แท้ • ISR 1 ชม. • Search/Category ดึงสดได้หลายพันเรื่อง</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-[#22c55e] px-3 py-1.5 font-bold text-white">กำลังฉาย: {animes.filter(a=>a.status==="กำลังฉาย").length}</span>
            <span className="rounded-full bg-zinc-700 px-3 py-1.5 font-bold text-white">จบแล้ว: {animes.filter(a=>a.status==="จบแล้ว").length}</span>
            <span className="rounded-full bg-amber-500 px-3 py-1.5 font-black text-black">ยังไม่ฉาย: {animes.filter(a=>a.status==="ยังไม่ฉาย").length}</span>
          </div>
        </div>
      </div>
    </>
  );
}
