"use client";

import React, { useState } from "react";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";
import { Navbar } from "@/components/Navbar";
import { GlobalBanner } from "@/components/GlobalBanner";
import { Footer } from "@/components/Footer";
import { searchItemsWithRanking } from "@/lib/searchService";
import {
  Home,
  Award,
  Bookmark,
  BookOpen,
  Sparkles,
  Flame,
  Sliders,
  Search,
  Users,
  Play,
  Folder,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const HomeClient: React.FC<{ initialItems: DashboardItem[] }> = ({ initialItems }) => {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // অ্যান্ড্রয়েডের হুবহু র‍্যাঙ্কিং সার্চ অ্যালগরিদম (০ms লেটেন্সি)
  const filteredItems = search.trim()
    ? searchItemsWithRanking(initialItems, search)
    : initialItems;

  const handleSearchItemClick = (item: DashboardItem) => {
    const rawCmd = item.command || item.id;
    if (item.type === "EXAM_FIREBASE") {
      router.push(`/exam/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type === "FOLDER" || item.type.includes("SECTION")) {
      router.push(`/folder/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type.startsWith("NOTE")) {
      router.push(`/note/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}&type=${item.type}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      <GlobalBanner />
      <Navbar />

      <div className="w-full max-w-[1400px] flex justify-between gap-6 px-4 md:px-8 py-6">
        
        {/* ডেস্কটপ সাইডবার */}
        <aside className="hidden lg:flex flex-col w-[260px] sticky top-20 h-[calc(100vh-100px)] justify-between bg-[#121218] border border-white/5 rounded-3xl p-5 shadow-xl">
          <nav className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-sm">
              <Home size={18} /> হোম ফিড
            </Link>
            <Link href="/live" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition">
              <Flame size={18} className="text-red-500" /> লাইভ ব্যাচ এক্সাম
            </Link>
            <Link href="/custom-exam" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition">
              <Sliders size={18} className="text-cyan-400" /> কাস্টম এক্সাম
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition">
              <Award size={18} className="text-amber-400" /> মেধা তালিকা
            </Link>
            <Link href="/mistakes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition">
              <BookOpen size={18} className="text-purple-400" /> মিসটেক ব্যাংক
            </Link>
            <Link href="/bookmarks" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition">
              <Bookmark size={18} className="text-emerald-400" /> বুকমার্ক প্রশ্ন
            </Link>
          </nav>

          <Link href="/premium" className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 text-center block transition hover:scale-[1.02]">
            <Sparkles size={22} className="text-amber-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-amber-300">প্রিমিয়াম সুবিধা</h4>
            <p className="text-[11px] text-gray-400 mt-1">সব পরীক্ষার ব্যাখ্যা এবং সম্পূর্ণ বিজ্ঞাপনমুক্ত সুবিধা পান।</p>
          </Link>
        </aside>

        {/* সেন্ট্রাল স্টেজ (Smart Matrix ক্যানভাস) */}
        <main className="w-full lg:max-w-[750px] min-h-screen flex flex-col pb-24 lg:pb-8">
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="যেকোনো পরীক্ষা বা অধ্যায় খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:border-cyan-500 outline-none text-white shadow-xl transition"
            />
          </div>

          {search.trim() ? (
            /* সার্চ রেজাল্ট ভিউ */
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-400 mb-2">ফলাফল ({filteredItems.length} টি)</span>
              {filteredItems.length === 0 ? (
                <div className="bg-[#121218] border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-xs">
                  কোনো পরীক্ষা বা ফোল্ডার পাওয়া যায়নি।
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSearchItemClick(item)}
                    className="bg-[#121218] border border-white/5 hover:border-cyan-500/40 p-4 rounded-2xl cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 text-cyan-400">
                        {item.type === "EXAM_FIREBASE" ? <Play size={16} /> : item.type.startsWith("NOTE") ? <FileText size={16} /> : <Folder size={16} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{item.title}</h4>
                        {item.subtitle && <p className="text-[11px] text-gray-400 line-clamp-1">{item.subtitle}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-extrabold">খুলুন →</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* সম্পূর্ণ রেডিমেড প্রাক-রেন্ডার করা ম্যাট্রিক্স */
            <div className="flex flex-col flex-1">
              <SmartMatrixCanvas items={initialItems} />
              <Footer />
            </div>
          )}
        </main>

        {/* ডান পাশের উইজেট প্যানেল */}
        <aside className="hidden xl:flex flex-col w-[300px] sticky top-20 h-[calc(100vh-100px)] gap-6">
          <div className="bg-[#121218] border border-white/5 rounded-3xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2 mb-3">
              <Users size={16} className="text-cyan-400" /> লাইভ ব্যাচ পরীক্ষা
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              আপনার ব্যাচের শিক্ষার্থীদের নিয়ে একসাথে পরীক্ষা নিতে চান?
            </p>
            <Link
              href="/live"
              className="block w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-center font-bold text-xs transition"
            >
              ব্যাচ এক্সাম হাব খুলুন →
            </Link>
          </div>
        </aside>

      </div>
    </div>
  );
};