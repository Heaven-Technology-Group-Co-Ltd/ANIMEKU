import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Section({
  title, subtitle, href, children, id,
}: { title: string; subtitle?: string; href?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#ff3b82] hover:text-[#ff5a96]">
            ดูทั้งหมด <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
