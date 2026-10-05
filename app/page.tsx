"use client";

import React, { useEffect, useState } from "react";
import { getCachedHomeLayout } from "@/lib/layoutService";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";
import { Navbar } from "@/components/Navbar";
import { GlobalBanner } from "@/components/GlobalBanner";
import { Footer } from "@/components/Footer";
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
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedHomeLayout().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filteredItems = items.filter(
    (it) =>
      it.title.toLowerCase().includes(search.toLowerCase()) ||
      it.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      
      {/* গ্লোবাল ব্যানার ও ন্যাভবার */}
      <GlobalBanner />
      <Navbar />

      <div className="w-full max-w-[1400px] flex justify-between gap-6 px-4 md:px-8 py-6">
        
        {/* কলাম ১: সাইডবার (Desktop Only) */}
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

        {/* কলাম ২: সেন্ট্রাল স্টেজ (Smart Matrix ক্যানভাস) */}
        <main className="w-full lg:max-w-[750px] min-h-screen flex flex-col pb-24 lg:pb-8">
          {/* সার্চ বার */}
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

          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-44 bg-white/5 rounded-3xl w-full"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-white/5 rounded-2xl"></div>
                <div className="h-32 bg-white/5 rounded-2xl"></div>
              </div>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="flex flex-col flex-1">
              <SmartMatrixCanvas items={filteredItems} />
              <Footer />
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">কোনো কনটেন্ট পাওয়া যায়নি।</div>
          )}
        </main>

        {/* কলাম ৩: ডান পাশের উইজেট প্যানেল (Desktop Only) */}
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

          <div className="bg-[#121218] border border-white/5 rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
            <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2 mb-4">
              <Award size={16} /> গ্লোবাল র‍্যাঙ্কিং
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              {["সাকিব আল হাসান", "তানজিদ তামিম", "মেহেদী হাসান"].map((name, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-cyan-400">#{i + 1}</span>
                    <span className="font-semibold text-gray-200">{name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">১০০% স্কোর</span>
                </div>
              ))}
            </div>
            <Link href="/leaderboard" className="mt-auto text-center text-xs font-bold text-gray-400 hover:text-white pt-4">
              সম্পূর্ণ মেধা তালিকা দেখুন →
            </Link>
          </div>
        </aside>

      </div>

      {/* মোবাইল বটম বার */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121218]/95 backdrop-blur-md border-t border-white/10 flex justify-around items-center px-4 z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-cyan-400">
          <Home size={18} />
          <span className="text-[10px] font-bold">হোম</span>
        </Link>
        <Link href="/live" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <Flame size={18} />
          <span className="text-[10px] font-bold">লাইভ</span>
        </Link>
        <Link href="/custom-exam" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <Sliders size={18} />
          <span className="text-[10px] font-bold">কাস্টম</span>
        </Link>
        <Link href="/mistakes" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <BookOpen size={18} />
          <span className="text-[10px] font-bold">মিসটেক</span>
        </Link>
      </nav>
    </div>
  );
}