import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRelated, animes } from "@/lib/data";
import { resolveAnime as resolveAnimeShared } from "@/lib/resolve-anime";
import { animeJsonLd, breadcrumbJsonLd, buildCanonicalUrl } from "@/lib/seo";
import TrailerPlayer from "@/components/TrailerPlayer";
import { AnimeCard } from "@/components/AnimeCard";
import { Star, Calendar, Clock, Play } from "lucide-react";
import LegalPlatforms from "@/components/LegalPlatforms";
import { getSiteUrl } from "@/lib/env";
import { resolveTrailerDub } from "@/lib/dubMap";

async function resolveAnime(slug: string) {
  return resolveAnimeShared(slug, "[anime]");
}

export async function generateStaticParams() {
  return animes.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const anime = await resolveAnime(slug);
  if (!anime) return {};
  // P2.5: absolute canonical from the P2.1 env origin (overrides layout "/" default).
  const canonical = buildCanonicalUrl(getSiteUrl(), `/anime/${anime.slug}`);
  return {
    title: `แนะนำ ${anime.titleTh} — รีวิว จัดอันดับ ดูตัวอย่างแนะนำ | ANIMEKU`,
    description: `แนะนำ ${anime.titleTh} — ${anime.description.slice(0, 130)} • รีวิว จัดอันดับ แนะนำอนิเมะถูกลิขสิทธิ์`,
    alternates: { canonical },
    openGraph: { title: `แนะนำ ${anime.titleTh}`, description: anime.description.slice(0, 155), url: canonical, images: [anime.cover] },
  };
}

export default async function AnimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = await resolveAnime(slug);
  if (!anime) notFound();
  const siteUrl = getSiteUrl();
  // P1.5: พากย์ไทยแสดงได้เฉพาะรายการที่ยืนยันใน dubMap เท่านั้น
  const dub = resolveTrailerDub(anime);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(animeJsonLd(anime, siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "หน้าแรก", url: "/" }, { name: anime.titleTh, url: `/anime/${anime.slug}` }], siteUrl)) }} />

      <div className="relative h-[320px] sm:h-[420px] overflow-hidden">
        <Image src={anime.banner} alt={anime.titleTh} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-[#06060a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06060a] via-transparent to-transparent" />
        <div className="absolute bottom-0 mx-auto w-full max-w-[1280px] left-1/2 -translate-x-1/2 px-4 sm:px-6 lg:px-8 pb-6 flex gap-4 items-end">
          <div className="hidden sm:block relative h-[180px] w-[128px] shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-xl">
            <Image src={anime.cover} alt={anime.titleTh} fill className="object-cover" sizes="128px" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b82] px-3 py-1 text-xs font-black text-white tracking-wide">⭐ แนะนำ • รีวิวจัดอันดับ</span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white leading-tight">{anime.titleTh}</h1>
            <p className="text-sm text-zinc-300">{anime.titleEn}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <span key={g} className="rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-xs text-white">{g}</span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1 bg-white text-black rounded-full px-2.5 py-1 font-semibold"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{anime.rating.toFixed(1)}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{anime.year}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{anime.duration.replace(" /ตอน","").replace("/ตอน","")}</span>
              <span>{anime.studio}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {anime.status === "ยังไม่ฉาย" && <span className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-black text-black">⏳ ยังไม่ฉาย • {anime.season}</span>}
              <Link href={`/watch/${anime.slug}/1`} className="inline-flex items-center gap-2 rounded-full bg-[#ff3b82] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#ff5a96]">
                <Play className="h-4 w-4 fill-white" /> ดูตัวอย่างแนะนำ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
        <p className="max-w-3xl text-sm leading-6 text-zinc-300">{anime.description}</p>
        <div className="mt-3 flex gap-2 text-xs">
          <span className={`rounded-full px-3 py-1.5 font-bold ${anime.status==="ยังไม่ฉาย" ? "bg-amber-500 text-black" : anime.status==="กำลังฉาย" ? "bg-[#22c55e] text-white" : "bg-zinc-700 text-white"}`}>{anime.status}</span>
          <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-zinc-300">{anime.season} • {anime.year}</span>
        </div>
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#12121a] p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><span className="rounded-full bg-[#ff3b82] px-2 py-0.5 text-xs">▶</span> ตัวอย่างแนะนำ — กดดูได้เลย</h2>
          <TrailerPlayer
            title={`แนะนำ ${anime.titleTh} — ตัวอย่างแนะนำ`}
            youtubeId={anime.trailerYoutubeId}
            youtubeDubId={dub.videoId}
            dubVerified={dub.verified}
            animeId={anime.id}
            thumbnail={anime.trailerThumbnail || anime.cover}
            animeSlug={anime.slug}
          />
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">⭐ เหตุผลที่แนะนำเรื่องนี้</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-300">
              <li>• เรตติ้ง {anime.rating.toFixed(1)}/10 • สตูดิโอ {anime.studio} • {anime.genres.slice(0, 3).join(" / ")}</li>
              <li>• เหมาะกับคนชอบแนว {anime.genres[0]}{anime.genres[1] ? ` และ ${anime.genres[1]}` : ""} — ดูตัวอย่างก่อนตัดสินใจ</li>
            </ul>
          </div>
          <div className="mt-4">
            <LegalPlatforms anime={anime} />
          </div>
        </div>
        <h2 className="mt-10 mb-4 text-lg font-bold text-white">เรื่องที่คล้ายกัน</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {getRelated(anime, 6).map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </div>
    </>
  );
}
