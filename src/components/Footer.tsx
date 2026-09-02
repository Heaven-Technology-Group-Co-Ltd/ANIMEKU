import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#08080c] mt-10">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff3b82] to-[#7c3aed] text-sm font-black text-white">
                A
              </div>
              <span className="text-lg font-black">
                <span className="text-white">ANIME</span>
                <span className="text-[#ff3b82]">KU</span>
              </span>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              แนะนำอนิเมะถูกลิขสิทธิ์ รีวิว จัดอันดับ ซับไทย พากย์ไทย คัดมาแล้วว่าเด็ดจริง อัปเดตทุกวัน
              สร้างด้วย Next.js App Router + Tailwind CSS เพื่อ SEO และ Performance สูงสุด • โหมดแนะนำ (จากโหมดดู)
            </p>
            <div className="mt-4 flex gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-white/5 px-2.5 py-1">SEO Optimized</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1">Core Web Vitals 90+</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1">Mobile First</span>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">เมนู</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="/" className="hover:text-white">หน้าแรก</Link></li>
              <li><Link href="/category/ทั้งหมด" className="hover:text-white">หมวดหมู่แนะนำ</Link></li>
              <li><Link href="/search" className="hover:text-white">ค้นหาแนะนำ</Link></li>
              <li><Link href="/#trending" className="hover:text-white">จัดอันดับแนะนำ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">ช่วยเหลือ</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>© 2026 ANIMEKU</li>
              <li>นโยบายความเป็นส่วนตัว</li>
              <li>เงื่อนไขการใช้งาน</li>
              <li className="text-zinc-500">Docker Port: 1234 • Next.js 16</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-zinc-500">
          สร้างเพื่อการศึกษา — ใช้รูปจาก Unsplash/Picsum เป็นตัวอย่างเท่านั้น
        </div>
      </div>
    </footer>
  );
}
