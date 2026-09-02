"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Runtime error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="rounded-3xl border border-white/10 bg-[#12121a] p-8 sm:p-10">
        <p className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-bold text-red-300">
          เกิดข้อผิดพลาด — ลองใหม่ได้
        </p>
        <h1 className="mt-4 text-2xl font-black text-white">มีบางอย่างผิดพลาด</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          ระบบขัดข้องชั่วคราว อาจเกิดจากเครือข่ายหรือ AniList ล่ม — กดลองใหม่ หรือกลับหน้าแรกแล้วค้นหาเรื่องอื่น
        </p>
        {error.digest && (
          <p className="mt-3 text-xs font-mono text-zinc-500">digest: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => reset()}
            className="rounded-full bg-[#ff3b82] px-6 py-2.5 text-sm font-black text-white hover:bg-[#ff5a96]"
          >
            ลองใหม่
          </button>
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:bg-zinc-100"
          >
            กลับหน้าแรก
          </Link>
          <Link
            href="/search"
            className="rounded-full bg-white/[0.06] border border-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10"
          >
            ค้นหาอนิเมะ
          </Link>
        </div>
      </div>
    </div>
  );
}
