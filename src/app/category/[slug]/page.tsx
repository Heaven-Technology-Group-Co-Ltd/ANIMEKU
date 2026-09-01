import { notFound } from "next/navigation";
import { filterByCategory, categories } from "@/lib/data";
import { AnimeCard } from "@/components/AnimeCard";
import CategoryPills from "@/components/CategoryPills";

export async function generateStaticParams() {
  return categories.map((c) => ({ slug: encodeURIComponent(c) }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = decodeURIComponent(slug);
  if (!categories.includes(cat as typeof categories[number])) notFound();
  const list = filterByCategory(cat);
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-white">หมวดหมู่: <span className="text-[#ff3b82]">{cat}</span></h1>
      <p className="text-sm text-zinc-500 mt-1">{list.length} เรื่อง</p>
      <div className="mt-4"><CategoryPills active={cat} /></div>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {list.map((a) => <AnimeCard key={a.id} anime={a} />)}
      </div>
    </div>
  );
}
