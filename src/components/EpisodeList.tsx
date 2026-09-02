import Image from "next/image";
import Link from "next/link";
import { Play, Clock } from "lucide-react";
import { formatViews } from "@/lib/utils";
import type { Anime } from "@/lib/data";

export default function EpisodeList({ anime }: { anime: Anime }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {anime.episodes.map((ep) => (
        <Link
          key={ep.id}
          href={`/watch/${anime.slug}/${ep.number}`}
          className="group flex gap-3 rounded-2xl border border-white/[0.06] bg-[#12121a] p-2.5 hover:border-white/15 hover:bg-[#1a1a24] transition"
        >
          <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-zinc-900">
            <Image src={ep.thumbnail} alt={ep.titleTh} fill className="object-cover" sizes="128px" />
            <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
                <Play className="h-4 w-4 fill-black ml-0.5" />
              </span>
            </div>
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {ep.duration}
            </span>
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="line-clamp-1 text-sm font-semibold text-white group-hover:text-[#ff8fba]">ตอนที่ {ep.number}</p>
            <p className="line-clamp-1 text-xs text-zinc-500">{ep.titleTh}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3 w-3" /> {ep.duration} <span>• {formatViews(ep.views)} วิว</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
