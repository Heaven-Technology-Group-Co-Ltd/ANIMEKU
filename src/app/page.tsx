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

      <Section title="อนิเมะทั้งหมด" href="/category/ทั้งหมด">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {animes.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </Section>
    </>
  );
}
