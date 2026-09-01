import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAnimeBySlug, animes } from "@/lib/data";
import { videoJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import VideoPlayer from "@/components/VideoPlayer";
import { ChevronLeft, ChevronRight } from "lucide-react";

export async function generateStaticParams() {
  return animes.flatMap((a) => a.episodes.slice(0, 3).map((ep) => ({ slug: a.slug, episode: String(ep.number) })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; episode: string }> }): Promise<Metadata> {
  const { slug, episode } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) return {};
  return { title: `${anime.titleTh} ตอนที่ ${episode} — ดูอนิเมะ`, description: anime.description.slice(0, 150) };
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string; episode: string }> }) {
  const { slug, episode } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) notFound();
  const epNum = Number(episode);
  const ep = anime.episodes.find((e) => e.number === epNum);
  if (!ep) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:1234";
  const prev = epNum > 1 ? epNum - 1 : null;
  const next = epNum < anime.episodes.length ? epNum + 1 : null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(anime, ep, siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "หน้าแรก", url: "/" }, { name: anime.titleTh, url: `/anime/${anime.slug}` }, { name: `ตอนที่ ${ep.number}`, url: `/watch/${anime.slug}/${ep.number}` }], siteUrl)) }} />

      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
        <Link href={`/anime/${anime.slug}`} className="hover:text-white flex items-center gap-1"><ChevronLeft className="h-4 w-4" />{anime.titleTh}</Link>
        <span>•</span><span className="text-white">ตอนที่ {ep.number}</span>
      </div>

      <VideoPlayer
        title={`${anime.titleTh} — ตอนที่ ${ep.number} ${ep.titleTh}`}
        hlsUrl={ep.hlsUrl}
        poster={ep.thumbnail}
        animeSlug={anime.slug}
        episodeNumber={ep.number}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {prev && <Link href={`/watch/${anime.slug}/${prev}`} className="rounded-full bg-white/[0.06] border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-1"><ChevronLeft className="h-4 w-4" />ตอนก่อนหน้า</Link>}
        {next && <Link href={`/watch/${anime.slug}/${next}`} className="rounded-full bg-[#ff3b82] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff5a96] flex items-center gap-1">ตอนถัดไป<ChevronRight className="h-4 w-4" /></Link>}
        <Link href={`/anime/${anime.slug}`} className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold">ดูตอนทั้งหมด</Link>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#12121a] p-4">
        <h1 className="text-lg font-bold text-white">{anime.titleTh} ตอนที่ {ep.number} — {ep.titleTh}</h1>
        <p className="text-sm text-zinc-400 mt-1">{anime.genres.join(" • ")} • {ep.duration} • {anime.studio}</p>
        <p className="text-sm text-zinc-300 mt-3 leading-6">{anime.description}</p>
      </div>

      <div className="mt-6 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {anime.episodes.map((e) => (
          <Link key={e.id} href={`/watch/${anime.slug}/${e.number}`} className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold transition ${e.number === epNum ? "bg-[#ff3b82] text-white border-[#ff3b82]" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10"}`}>
            {e.number}
          </Link>
        ))}
      </div>
    </div>
  );
}
