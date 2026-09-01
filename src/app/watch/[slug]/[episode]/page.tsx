import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAnimeBySlug, animes } from "@/lib/data";
import { videoJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import TrailerPlayer from "@/components/TrailerPlayer";
import { AnimeCard } from "@/components/AnimeCard";
import { ChevronLeft, ChevronRight, Star, Eye, Clock, ListVideo, Sparkles } from "lucide-react";
import { formatViews } from "@/lib/utils";

export async function generateStaticParams() {
  // ครบทุกตอน + เรื่องยังไม่ฉายให้มี /1 สำหรับดู Trailer
  return animes.flatMap((a) => {
    if (a.episodes.length === 0) return [{ slug: a.slug, episode: "1" }];
    return a.episodes.map((ep) => ({ slug: a.slug, episode: String(ep.number) }));
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; episode: string }> }): Promise<Metadata> {
  const { slug, episode } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) return {};
  const ep = anime.episodes.find((e) => e.number === Number(episode));
  return {
    title: `${anime.titleTh} ตอนที่ ${episode} — ${ep?.titleTh ?? ""} | ANIMEKU`,
    description: `${anime.titleTh} ตอนที่ ${episode} ${anime.description.slice(0, 110)}`,
    openGraph: { title: `${anime.titleTh} ตอนที่ ${episode}`, images: [anime.cover] },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string; episode: string }> }) {
  const { slug, episode } = await params;
  const anime = getAnimeBySlug(slug);
  if (!anime) notFound();
  const epNum = Number(episode);
  let ep = anime.episodes.find((e) => e.number === epNum);
  // เรื่องยังไม่ฉาย: ไม่มี episodes แต่ให้ดู Trailer ได้ที่ ep 1
  if (!ep && anime.status === "ยังไม่ฉาย" && epNum === 1) {
    ep = {
      id: "trailer-1",
      number: 1,
      title: "Official Trailer",
      titleTh: "ตัวอย่างหลัก",
      duration: "01:32",
      thumbnail: anime.trailerThumbnail || anime.cover,
      views: anime.views,
      updatedAt: anime.season,
      hlsUrl: undefined,
    };
  }
  if (!ep) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:1234";
  const prev = epNum > 1 ? epNum - 1 : null;
  const next = epNum < anime.episodes.length ? epNum + 1 : null;
  const related = animes.filter((a) => a.id !== anime.id).slice(0, 4);

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(anime, ep, siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "หน้าแรก", url: "/" }, { name: anime.titleTh, url: `/anime/${anime.slug}` }, { name: `ตอนที่ ${ep.number}`, url: `/watch/${anime.slug}/${ep.number}` }], siteUrl)) }} />

      {/* Theater background */}
      <div className="relative">
        <div className="absolute inset-0 h-[520px] overflow-hidden">
          <Image src={anime.banner} alt="" fill className="object-cover opacity-20 blur-sm scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06060a]/60 via-[#06060a] to-[#06060a]" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span className="text-zinc-600">/</span>
            <Link href={`/anime/${anime.slug}`} className="hover:text-white flex items-center gap-1.5">
              <span className="hidden sm:inline-flex h-6 w-6 overflow-hidden rounded bg-zinc-800 relative">
                <Image src={anime.cover} alt={anime.titleTh} fill className="object-cover" />
              </span>
              {anime.titleTh}
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span className="rounded bg-[#ff3b82] px-1.5 py-0.5 text-xs font-black text-white">EP.{ep.number}</span>
              {ep.titleTh}
            </span>
          </div>

          {/* Grid: Player + Sidebar */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Player column */}
            <div>
              <TrailerPlayer
                title={`${anime.titleTh} — ตอนที่ ${ep.number} ${ep.titleTh}`}
                youtubeId={anime.trailerYoutubeId}
                youtubeDubId={anime.trailerDubYoutubeId}
                thumbnail={anime.trailerThumbnail || ep.thumbnail}
                animeSlug={anime.slug}
                episodeNumber={ep.number}
                hlsUrl={ep.hlsUrl}
              />

              {/* Official links */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-zinc-500 py-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> ดูถูกลิขสิทธิ์:
                </span>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(anime.titleEn + " ซับไทย")}`} target="_blank" rel="noopener" className="rounded-full bg-white text-black px-4 py-2 text-xs font-bold hover:bg-zinc-100">YouTube</a>
                <a href={`https://www.bilibili.tv/search?q=${encodeURIComponent(anime.titleTh)}`} target="_blank" rel="noopener" className="rounded-full bg-[#00a1d6] text-white px-4 py-2 text-xs font-bold">Bilibili</a>
                <a href={`https://www.iq.com/search?query=${encodeURIComponent(anime.titleEn)}`} target="_blank" rel="noopener" className="rounded-full bg-[#1cc749] text-white px-4 py-2 text-xs font-bold">iQIYI</a>
                <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.titleEn)}`} target="_blank" rel="noopener" className="rounded-full bg-[#f47521] text-white px-4 py-2 text-xs font-bold">Crunchyroll</a>
              </div>

              {/* Title block */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#12121a] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {anime.titleTh} <span className="text-[#ff3b82]">ตอนที่ {ep.number}</span>
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">{ep.titleTh} • {ep.title}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white text-black px-2.5 py-1 font-bold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {anime.rating.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-300">
                        <Eye className="h-3 w-3" /> {formatViews(anime.views)} วิว
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-300">
                        <Clock className="h-3 w-3" /> {ep.duration}
                      </span>
                      <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-400">{anime.studio} • {anime.year}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {prev && (
                      <Link href={`/watch/${anime.slug}/${prev}`} className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10">
                        <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                      </Link>
                    )}
                    {next ? (
                      <Link href={`/watch/${anime.slug}/${next}`} className="inline-flex items-center gap-1 rounded-full bg-[#ff3b82] px-5 py-2.5 text-sm font-black text-white hover:bg-[#ff5a96] shadow shadow-[#ff3b82]/20">
                        ตอนถัดไป <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link href={`/anime/${anime.slug}`} className="inline-flex items-center gap-1 rounded-full bg-white text-black px-5 py-2.5 text-sm font-bold">ดูตอนทั้งหมด</Link>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {anime.genres.map((g) => (
                    <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{g}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{anime.description}</p>
              </div>

              {/* Episode grid (mobile) */}
              <div className="mt-6 lg:hidden">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                  <ListVideo className="h-4 w-4 text-[#ff3b82]" /> ตอนทั้งหมด • {anime.episodes.length} ตอน
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {anime.episodes.map((e) => (
                    <Link key={e.id} href={`/watch/${anime.slug}/${e.number}`} className={`relative overflow-hidden rounded-xl border p-0 text-center transition ${e.number === epNum ? "border-[#ff3b82] bg-[#ff3b82] text-white shadow" : "border-white/10 bg-[#12121a] text-zinc-300 hover:bg-white/10"}`}>
                      <span className="flex h-10 items-center justify-center text-sm font-black">{e.number}</span>
                      <span className="absolute bottom-0 w-full left-0 h-1 bg-white/20">
                        <span className="block h-full bg-white" style={{ width: e.number <= epNum ? "100%" : "0%" }} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden lg:block space-y-4">
              {/* Episode list */}
              <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <ListVideo className="h-4 w-4 text-[#ff3b82]" /> ตอนทั้งหมด
                  </h3>
                  <span className="text-xs text-zinc-500">{epNum}/{anime.episodes.length}</span>
                </div>
                <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
                  {anime.episodes.map((e) => (
                    <Link
                      key={e.id}
                      href={`/watch/${anime.slug}/${e.number}`}
                      className={`flex gap-3 rounded-xl p-2 transition ${e.number === epNum ? "bg-[#ff3b82] text-white" : "hover:bg-white/[0.06] text-zinc-300"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${e.number === epNum ? "bg-white text-[#ff3b82]" : "bg-white/10 text-white"}`}>{e.number}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className={`text-sm font-semibold leading-4 line-clamp-1 ${e.number === epNum ? "text-white" : "text-white"}`}>{e.titleTh}</p>
                        <p className={`text-xs ${e.number === epNum ? "text-white/80" : "text-zinc-500"}`}>{e.duration} • {e.number <= epNum ? "ดูแล้ว" : "ยังไม่ดู"}</p>
                      </div>
                      {e.number === epNum && <span className="h-2 w-2 rounded-full bg-white animate-pulse mt-3 shrink-0" />}
                    </Link>
                  ))}
                </div>
                <Link href={`/anime/${anime.slug}`} className="flex items-center justify-center gap-1 p-3 text-xs font-semibold text-zinc-400 hover:text-white border-t border-white/5">
                  ดูหน้าอนิเมะ <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Related */}
              <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4">
                <h3 className="text-sm font-bold text-white mb-3">เรื่องที่คล้ายกัน</h3>
                <div className="grid grid-cols-2 gap-3">
                  {related.map((a) => (
                    <AnimeCard key={a.id} anime={a} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile related */}
          <div className="mt-6 lg:hidden">
            <h3 className="text-sm font-bold text-white mb-3">เรื่องที่คล้ายกัน</h3>
            <div className="grid grid-cols-2 gap-3">
              {related.map((a) => (
                <AnimeCard key={a.id} anime={a} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
