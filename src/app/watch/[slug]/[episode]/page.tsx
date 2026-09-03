import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAnimeBySlug, animes } from "@/lib/data";
import { getAnimeByIdAni, toAnime } from "@/lib/anilist";
import { videoJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import TrailerPlayer from "@/components/TrailerPlayer";
import { AnimeCard } from "@/components/AnimeCard";
import { Star, Eye } from "lucide-react";
import { formatViews } from "@/lib/utils";
import LegalPlatforms from "@/components/LegalPlatforms";
import { getSiteUrl } from "@/lib/env";

async function resolveAnime(slug: string) {
  const local = getAnimeBySlug(slug);
  if (local) return local;
  const id = Number(slug.split("-")[0]);
  if (isNaN(id) || id <= 0) return null;
  try {
    const ani = await getAnimeByIdAni(id);
    if (ani) return toAnime(ani);
  } catch (err) {
    console.error(`[watch] AniList fallback failed for slug="${slug}"`, err);
  }
  return null;
}

export async function generateStaticParams() {
  // โหมดแนะนำ: มีแค่ตัวอย่างเดียวต่อเรื่อง ไม่ต้องมีหลายตอน
  return animes.map((a) => ({ slug: a.slug, episode: "1" }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; episode: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const anime = await resolveAnime(slug);
  if (!anime) return {};
  return {
    title: `แนะนำ ${anime.titleTh} — ดูตัวอย่างแนะนำ | ANIMEKU`,
    description: `แนะนำ ${anime.titleTh} — ${anime.description.slice(0, 120)} • ดูตัวอย่างแนะนำก่อนตัดสินใจ`,
    openGraph: { title: `แนะนำ ${anime.titleTh} — ตัวอย่างแนะนำ`, images: [anime.cover] },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string; episode: string }> }) {
  const { slug, episode } = await params;
  // Only trailer episode 1 is supported — unsupported episodes 2..5 must 404 (P0-1 + P0-4)
  if (episode !== "1") notFound();
  const anime = await resolveAnime(slug);
  if (!anime) notFound();
  const siteUrl = getSiteUrl();
  const related = animes.filter((a) => a.id !== anime.id).slice(0, 4);

  // สร้าง ep จำลองสำหรับ Trailer โดยเฉพาะ
  const ep = {
    id: "trailer",
    number: 1,
    title: "Official Trailer",
    titleTh: "ตัวอย่างแนะนำ",
    duration: "01:32",
    thumbnail: anime.trailerThumbnail || anime.cover,
    views: anime.views,
    updatedAt: anime.season,
    hlsUrl: undefined,
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(anime, { number: ep.number, titleTh: ep.titleTh, thumbnail: ep.thumbnail }, siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "หน้าแรก", url: "/" }, { name: anime.titleTh, url: `/anime/${anime.slug}` }, { name: `ตัวอย่างแนะนำ`, url: `/watch/${anime.slug}/1` }], siteUrl)) }} />

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
              <span className="rounded bg-[#ff3b82] px-1.5 py-0.5 text-xs font-black text-white">แนะนำ</span>
              ตัวอย่างแนะนำ
            </span>
          </div>

          {/* Grid: Player + Sidebar */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Player column */}
            <div>
              <TrailerPlayer
                title={`แนะนำ ${anime.titleTh} — ตัวอย่างแนะนำ`}
                youtubeId={anime.trailerYoutubeId}
                youtubeDubId={anime.trailerDubYoutubeId}
                thumbnail={anime.trailerThumbnail || anime.cover}
                animeSlug={anime.slug}
                hlsUrl={undefined}
              />

              {/* Legal platforms per anime */}
              <div className="mt-3">
                <LegalPlatforms anime={anime} compact />
              </div>

              {/* Title block */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#12121a] p-5">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  แนะนำ {anime.titleTh} <span className="text-[#ff3b82]">ตัวอย่างแนะนำ</span>
                </h1>
                <p className="text-sm text-zinc-400 mt-1">{anime.titleEn} • ตัวอย่าง Official PV</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white text-black px-2.5 py-1 font-bold">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {anime.rating.toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-300">
                    <Eye className="h-3 w-3" /> {formatViews(anime.views)} วิว
                  </span>
                  <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-400">{anime.studio} • {anime.year}</span>
                  <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-zinc-400">{anime.season}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {anime.genres.map((g) => (
                    <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">{g}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{anime.description}</p>
              </div>

              {/* เหตุผลที่แนะนำ */}
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
                <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">⭐ เหตุผลที่แนะนำเรื่องนี้</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-300">
                  <li>• เรตติ้ง {anime.rating.toFixed(1)}/10 • สตูดิโอ {anime.studio} • {anime.genres.slice(0, 3).join(" / ")}</li>
                  <li>• เหมาะกับคนชอบแนว {anime.genres[0]} {anime.genres[1] ? `และ ${anime.genres[1]}` : ""} — ดูตัวอย่างก่อนตัดสินใจ</li>
                  <li>• ค้นหาเรื่องนี้บนแพลตฟอร์มถูกลิขสิทธิ์ผ่านปุ่มด้านบน แล้วตรวจสอบสิทธิ์การรับชมปัจจุบันบนแพลตฟอร์ม</li>
                </ul>
              </div>
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden lg:block space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#12121a] p-4">
                <h3 className="text-sm font-bold text-white mb-2">เกี่ยวกับเรื่องนี้</h3>
                <div className="space-y-2 text-sm text-zinc-400">
                  <p><span className="text-zinc-500">สตูดิโอ:</span> {anime.studio}</p>
                  <p><span className="text-zinc-500">ปี:</span> {anime.year} • {anime.season}</p>
                  <p><span className="text-zinc-500">สถานะ:</span> {anime.status}</p>
                </div>
                <Link href={`/anime/${anime.slug}`} className="mt-4 flex w-full items-center justify-center rounded-full bg-white text-black py-2.5 text-sm font-bold hover:bg-zinc-100">ดูหน้ารีวิวแนะนำ</Link>
              </div>

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
