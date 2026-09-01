import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Clock } from "lucide-react";
import type { Anime } from "@/lib/data";

export default function Hero({ anime }: { anime: Anime }) {
  return (
    <section className="relative overflow-hidden">
      {/* Banner */}
      <div className="absolute inset-0">
        <Image
          src={anime.banner}
          alt={anime.titleTh}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-[#06060a]/70 to-[#06060a]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06060a] via-[#06060a]/60 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-end">
          {/* Left */}
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#ff3b82] px-3 py-1 text-xs font-bold text-white">🔥 มาแรงอันดับ 1</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {anime.season}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {anime.status}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white drop-shadow">
              {anime.titleTh}
            </h1>
            <p className="mt-1 text-sm sm:text-base font-medium text-zinc-300">{anime.titleEn}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-300 sm:text-[15px]">
              {anime.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 border border-white/10">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-white font-semibold">{anime.rating.toFixed(1)}</span>/10
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {anime.year}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {anime.duration}
              </span>
              <span className="text-zinc-500">สตูดิโอ: {anime.studio}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/watch/${anime.slug}/1`}
                className="inline-flex items-center gap-2 rounded-full bg-[#ff3b82] px-6 py-3 text-sm font-bold text-white hover:bg-[#ff5a96] transition shadow-lg shadow-[#ff3b82]/20"
              >
                <Play className="h-5 w-5 fill-white" />
                ดูตอนที่ 1
              </Link>
              <Link
                href={`/anime/${anime.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white text-zinc-900 px-6 py-3 text-sm font-bold hover:bg-zinc-100 transition"
              >
                รายละเอียด
              </Link>
            </div>
          </div>

          {/* Right - Trailer Card */}
          <div className="hidden lg:block">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl">
              <div className="relative aspect-video bg-zinc-900">
                <Image src={anime.cover} alt={anime.titleTh} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/30" />
                <Link
                  href={`/watch/${anime.slug}/1`}
                  className="absolute inset-0 grid place-items-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl hover:scale-105 transition">
                    <Play className="h-6 w-6 fill-black ml-0.5" />
                  </span>
                </Link>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                  ตัวอย่าง
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white line-clamp-1">{anime.titleTh} — ตัวอย่างหลัก</p>
                <p className="text-xs text-zinc-500">ซับไทย • 1080p • 01:32</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
