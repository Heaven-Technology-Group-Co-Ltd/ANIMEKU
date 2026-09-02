"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X, Bell, User } from "lucide-react";
import { useRouter } from "next/navigation";

const navLinks = [
  { label: "หน้าแรก", href: "/" },
  { label: "แนะนำ", href: "/category/ทั้งหมด" },
  { label: "จัดอันดับ", href: "/#trending" },
  { label: "มาใหม่", href: "/#latest" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06060a]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[64px] items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff3b82] to-[#7c3aed] text-sm font-black text-white">
              A
            </div>
            <span className="text-[20px] font-black tracking-tight">
              <span className="text-white">ANIME</span>
              <span className="text-[#ff3b82]">KU</span>
            </span>
            <span className="hidden sm:inline-flex ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-zinc-300">
              TH
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-[360px] items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาอนิเมะที่อยากให้แนะนำ..."
                className="h-9 w-full rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff3b82]/40 focus:bg-white/[0.08] focus:outline-none"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-300 transition">
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href="/search"
              className="flex h-9 items-center gap-2 rounded-full bg-[#ff3b82] px-4 text-sm font-semibold text-white hover:bg-[#ff5a96] transition"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white"
              aria-label="menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#0a0a0f] px-4 py-4">
          <form onSubmit={onSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาอนิเมะที่อยากให้แนะนำ..."
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#ff3b82]/40"
              />
            </div>
            <button type="submit" className="rounded-full bg-[#ff3b82] px-5 text-sm font-semibold text-white">
              ค้นหาแนะนำ
            </button>
          </form>
          <nav className="grid grid-cols-2 gap-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
