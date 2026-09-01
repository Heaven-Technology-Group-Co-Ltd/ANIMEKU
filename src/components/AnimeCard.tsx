import Image from "next/image";
import Link from "next/link";
import { Star, Play, Eye } from "lucide-react";
import { cn, formatViews } from "@/lib/utils";
import type { Anime } from "@/lib/data";

export function AnimeCard({ anime, rank }: { anime: Anime; rank?: number }) {
  return (
    <Link
      href={`/anime/${anime.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#12121a] border border-white/[0.06] hover:border-white/15 hover:bg-[#1a1a24] transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
        <Image
          src={anime.cover}
          alt={anime.titleTh}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80" />

        {/* Top badges */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {rank && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white text-xs font-black text-black px-1.5">
              #{rank}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-bold tracking-wide text-white",
              anime.status === "กำลังฉาย" ? "bg-[#22c55e]" : anime.status === "จบแล้ว" ? "bg-zinc-700" : "bg-[#ff3b82]"
            )}
          >
            {anime.status}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {anime.rating.toFixed(1)}
        </div>

        {/* Hover play */}
        <div className="absolute inset-0 hidden place-items-center bg-black/40 backdrop-blur-[1px] group-hover:grid">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl">
            <Play className="h-5 w-5 fill-black ml-0.5" />
          </div>
        </div>

        {/* Bottom meta */}
        <div className="absolute bottom-0 w-full p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
            <span className="rounded bg-white/15 px-1.5 py-0.5 backdrop-blur">{anime.year}</span>
            <span className="rounded bg-white/15 px-1.5 py-0.5 backdrop-blur truncate">{anime.genres[0]}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:text-[#ff8fba] transition">
          {anime.titleTh}
        </h3>
        <p className="line-clamp-1 text-xs text-zinc-500">{anime.titleEn}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatViews(anime.views)}
          </span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px]">{anime.episodesTotal} ตอน</span>
        </div>
      </div>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#12121a] border border-white/5">
      <div className="aspect-[3/4] shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 shimmer rounded" />
        <div className="h-3 w-1/2 shimmer rounded" />
      </div>
    </div>
  );
}
