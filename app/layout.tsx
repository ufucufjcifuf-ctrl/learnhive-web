import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { NetworkBanner } from "@/components/NetworkBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BottomNavBar } from "@/components/BottomNavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#00F0FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://learnhive-web.vercel.app"),
  title: {
    default: "Learn Hive - অনলাইন এক্সাম ও মডেল টেস্ট প্ল্যাটফর্ম",
    template: "%s | Learn Hive",
  },
  description: "বিসিএস, মেডিকেল, এইচএসসি ও এসএসসির পূর্ণাঙ্গ মডেল টেস্ট, নেগেティブ মার্কিং সহ লাইভ ব্যাচ এক্সাম এবং তাৎক্ষণিক মেধা তালিকা।",
  keywords: [
    "Learn Hive",
    "learnhive",
    "অনলাইন এক্সাম",
    "মডেল টেস্ট",
    "বিসিএস প্রস্তুতি",
    "HSC MCQ Exam",
    "মেডিকেল ভর্তি পরীক্ষা প্রস্তুতি",
    "Online Model Test Bangladesh",
    "MCQ Hub"
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Learn Hive - অনলাইন এক্সাম ও মডেল টেস্ট প্ল্যাটফর্ম",
    description: "বিসিএস, মেডিকেল ও এইচএসসি মডেল টেস্ট এবং লাইভ মেধা তালিকা।",
    url: "https://learnhive-web.vercel.app",
    siteName: "Learn Hive",
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Hive - অনলাইন এক্সাম ও মডেল টেস্ট প্ল্যাটফর্ম",
    description: "বিসিএস, মেডিকেল ও এইচএসসি মডেল টেস্ট এবং লাইভ মেধা তালিকা।",
  },
  // 🔥 আপনার আসল গুগল সার্চ কনসোল ভেরিফিকেশন কোড বসানো হয়েছে
  verification: {
    google: "qr6lfBtiMz0vQkeVwvbCSf_cVPMA55RlOOZ-cSJ0Vao",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0E] text-white selection:bg-cyan-500 selection:text-black`}>
        <NetworkBanner />
        {children}
        <BottomNavBar />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}