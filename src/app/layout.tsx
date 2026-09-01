import type { Metadata } from "next";
import { Kanit, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:1234"),
  title: {
    default: "ANIMEKU — ดูอนิเมะถูกลิขสิทธิ์ พากย์ไทย ซับไทย 4K",
    template: "%s | ANIMEKU",
  },
  description:
    "ดูอนิเมะออนไลน์ถูกลิขสิทธิ์ พากย์ไทย ซับไทย ภาพคมชัดระดับ 4K อัปเดตตอนใหม่ทุกวัน เร็วที่สุดในไทย - ANIMEKU",
  keywords: ["ดูอนิเมะ", "อนิเมะซับไทย", "อนิเมะพากย์ไทย", "anime", "ดูอนิเมะออนไลน์", "ANIMEKU"],
  authors: [{ name: "ANIMEKU" }],
  creator: "ANIMEKU",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ANIMEKU",
    title: "ANIMEKU — ดูอนิเมะถูกลิขสิทธิ์",
    description: "ดูอนิเมะซับไทย พากย์ไทย 4K อัปเดตไวที่สุด",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANIMEKU — ดูอนิเมะถูกลิขสิทธิ์",
    description: "ดูอนิเมะซับไทย พากย์ไทย 4K",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} ${outfit.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#06060a] text-zinc-100 selection:bg-[#ff3b82]/30">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
