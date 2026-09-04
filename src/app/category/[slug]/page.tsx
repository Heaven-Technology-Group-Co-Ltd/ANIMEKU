import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { filterByCategory, categories, getAnilistGenreForThai } from "@/lib/data";
import { getTopAnime, toAnime, CATEGORY_THAI } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import CategoryPills from "@/components/CategoryPills";
import { getSiteUrl } from "@/lib/env";
import { buildCanonicalUrl } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return categories.map((c) => ({ slug: encodeURIComponent(c) }));
}

// P2.3 ARCH-04: Thai -> AniList genre mapping is canonical in `@/lib/genres`
// (re-exported via `@/lib/data`). No local copy — same 13 labels + mappings.

// P2.5: category pages had no metadata (title fell back to the layout default
// and canonical fell back to layout "/"). Same-entity title/desc + absolute
// canonical from the P2.1 env origin.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = decodeURIComponent(slug);
  if (!(categories as readonly string[]).includes(cat)) return {};
  const canonical = buildCanonicalUrl(getSiteUrl(), `/category/${encodeURIComponent(cat)}`);
  return {
    title: `หมวดหมู่${cat} — แนะนำอนิเมะ${cat} | ANIMEKU`,
    description: `แนะนำอนิเมะแนว${cat} รีวิว จัดอันดับ ดูตัวอย่างแนะนำก่อนตัดสินใจ`,
    alternates: { canonical },
    openGraph: { title: `หมวดหมู่: ${cat}`, description: `แนะนำอนิเมะแนว${cat}`, url: canonical },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = decodeURIComponent(slug);
  if (!categories.includes(cat as typeof categories[number])) notFound();

  const localList = filterByCategory(cat);
  let liveCount = 0;
  let extra: ReturnType<typeof toAnime>[] = [];

  // ดึงสดจาก AniList ตาม genre (ยกเว้น ทั้งหมด) — graceful degrade
  const enGenre = getAnilistGenreForThai(cat);
  if (enGenre) {
    try {
      const live = await getTopAnime(24, enGenre);
      const localIds = new Set(localList.map((a) => a.id));
      extra = live
        .map((a) => toAnime(a))
        .filter((a) => !localIds.has(a.id) && !localList.find((l) => l.slug === a.slug))
        .slice(0, 12);
      liveCount = live.length;
    } catch (err) {
      console.error(`[category] AniList getTopAnime failed for genre="${enGenre}"`, err);
    }
  }

  const list = [...localList, ...extra];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-white">
        หมวดหมู่: <span className="text-[#ff3b82]">{cat}</span>
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        {localList.length} เรื่องจาก Top 104 {extra.length > 0 ? `+ ${extra.length} เรื่องสดจาก AniList` : ""} {enGenre ? `• ${liveCount} เรื่องในหมวดนี้บน AniList` : ""}
      </p>
      <div className="mt-4">
        <CategoryPills active={cat} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">หมวดหมู่ทั้งหมด: {CATEGORY_THAI.join(" • ")}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {list.map((a) => (
          <AnimeCard key={a.id} anime={a} />
        ))}
      </div>
      {list.length === 0 && <p className="text-zinc-500 mt-8">ไม่มีอนิเมะในหมวดนี้</p>}
    </div>
  );
}
