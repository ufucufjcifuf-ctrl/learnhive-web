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
  title: "Learn Hive - অনলাইন এক্সাম ও মডেল টেস্ট প্ল্যাটফর্ম",
  description: "বিসিএস, মেডিকেল, এইচএসসি ও এসএসসির পূর্ণাঙ্গ মডেল টেস্ট, নেগেটিভ মার্কিং সহ লাইভ ব্যাচ এক্সাম এবং তাৎক্ষণিক মেধা তালিকা।",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0E] text-white selection:bg-cyan-500 selection:text-black`}>
        <NetworkBanner />
        {children}
        {/* 🔥 অ্যান্ড্রয়েডের মতো গ্লোবাল বটম বার */}
        <BottomNavBar />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}