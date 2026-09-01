"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function CategoryPills({ active }: { active?: string }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {categories.map((c) => {
        const isActive = active ? c === active : c === "ทั้งหมด";
        const href = `/category/${encodeURIComponent(c)}`;
        return (
          <Link
            key={c}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition",
              isActive
                ? "bg-[#ff3b82] text-white border-[#ff3b82]"
                : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            {c}
          </Link>
        );
      })}
    </div>
  );
}
