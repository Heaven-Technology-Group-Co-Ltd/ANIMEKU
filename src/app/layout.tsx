import type { Metadata } from "next";
import { Kanit, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteUrl } from "@/lib/env";

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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "ANIMEKU — แนะนำอนิเมะถูกลิขสิทธิ์ รีวิว จัดอันดับ ซับไทย พากย์ไทย",
    template: "%s | ANIMEKU",
  },
  description:
    "แนะนำอนิเมะถูกลิขสิทธิ์ รีวิว จัดอันดับ ซับไทย พากย์ไทย อัปเดตทุกวัน คัดมาแล้วว่าเด็ดจริง — ANIMEKU แหล่งแนะนำอนิเมะอันดับ 1",
  keywords: ["แนะนำอนิเมะ", "รีวิวอนิเมะ", "จัดอันดับอนิเมะ", "อนิเมะซับไทย", "อนิเมะพากย์ไทย", "anime", "ANIMEKU"],
  authors: [{ name: "ANIMEKU" }],
  creator: "ANIMEKU",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ANIMEKU",
    title: "ANIMEKU — แนะนำอนิเมะถูกลิขสิทธิ์",
    description: "แนะนำอนิเมะ รีวิว จัดอันดับ ซับไทย พากย์ไทย คัดมาแล้วว่าเด็ดจริง",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANIMEKU — แนะนำอนิเมะถูกลิขสิทธิ์",
    description: "แนะนำอนิเมะ รีวิว จัดอันดับ ซับไทย พากย์ไทย",
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
