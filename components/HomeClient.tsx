"use client";

import React, { useState, useEffect } from "react";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";
import { Navbar } from "@/components/Navbar";
import { GlobalBanner } from "@/components/GlobalBanner";
import { Footer } from "@/components/Footer";
import { ExamActionModal } from "@/components/ExamActionModal";
import { searchItemsWithRanking } from "@/lib/searchService";
import { getAllSearchableItems } from "@/lib/layoutService";
import { createFolderSlug, createNoteSlug } from "@/lib/slugUtils";
import { getServerNow } from "@/lib/apiClient";
import { getCurrentStreak } from "@/lib/streakService";
import { useAuth } from "@/lib/useAuth";
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
  Gamepad2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NON_SEARCHABLE_TYPES = new Set([
  "NOTE_SHEET",
  "INFO_CARD",
  "TEXT",
  "SPACER",
  "DIVIDER",
  "IMAGE",
]);

export const HomeClient: React.FC<{ initialItems: DashboardItem[] }> = ({ initialItems }) => {
  const router = useRouter();
  const { profile, isPro } = useAuth();
  const [search, setSearch] = useState("");
  const [searchableItems, setSearchableItems] = useState<DashboardItem[]>(initialItems);
  const [selectedExamItem, setSelectedExamItem] = useState<DashboardItem | null>(null);
  const [greeting, setGreeting] = useState("স্বাগতম");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) setGreeting("শুভ সকাল");
    else if (hr >= 12 && hr < 17) setGreeting("শুভ অপরাহ্ন");
    else if (hr >= 17 && hr < 21) setGreeting("শুভ সন্ধ্যা");
    else setGreeting("স্বাগতম");

    setStreak(getCurrentStreak());

    getAllSearchableItems()
      .then((deepItems) => {
        if (deepItems && deepItems.length > 0) {
          setSearchableItems(deepItems);
        }
      })
      .catch(() => {});
  }, []);

  const visibleSearchPool = searchableItems.filter((it) => {
    if (it.isHidden || NON_SEARCHABLE_TYPES.has(it.type)) return false;
    if (it.visibilityCondition === "PREMIUM_ONLY" && !isPro) return false;
    if (it.visibilityCondition === "FREE_ONLY" && isPro) return false;
    return true;
  });

  const filteredItems = search.trim()
    ? searchItemsWithRanking(visibleSearchPool, search)
    : initialItems;

  const handleSearchItemClick = (item: DashboardItem) => {
    const rawCmd = item.command || item.id;
    const isLocked = Boolean((item.isPremium || item.examConfig?.isPremium) && !isPro);

    if (item.type === "EXAM_FIREBASE") {
      if (isLocked) {
        alert("👑 এটি একটি প্রিমিয়াম পরীক্ষা। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      const now = getServerNow();
      if (item.examConfig?.startTimeMs && now < item.examConfig.startTimeMs) {
        const dt = new Date(item.examConfig.startTimeMs).toLocaleString("bn-BD", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        alert(`⏳ এই পরীক্ষাটি এখনো শুরু হয়নি!\nশুরুর সময়: ${dt}`);
        return;
      }
      setSelectedExamItem(item);
    } else if (
      item.type === "FOLDER" ||
      item.type.includes("SECTION") ||
      item.type === "CAROUSEL" ||
      item.type === "HORIZONTAL_SCROLL"
    ) {
      const cleanSlug = createFolderSlug(item.title, rawCmd, item.slug);
      router.push(`/f/${encodeURIComponent(cleanSlug)}`);
    } else if (item.type === "NOTE_PDF") {
      if (isLocked) {
        alert("👑 এটি একটি প্রিমিয়াম PDF নোট। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      const noteSlug = createNoteSlug(item.title, rawCmd, item.slug);
      router.push(`/note/${encodeURIComponent(noteSlug)}`);
    } else if (item.type === "HTML_PAGE") {
      if (isLocked) {
        alert("👑 এটি প্রিমিয়াম কনটেন্ট। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      router.push(`/page/${encodeURIComponent(item.id)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type === "VIDEO_YOUTUBE") {
      if (isLocked) {
        alert("👑 এটি একটি প্রিমিয়াম ভিডিও ক্লাস। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      router.push(`/video/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      <GlobalBanner />
      <Navbar />

      <div className="w-full max-w-[1400px] flex justify-between gap-6 px-4 md:px-8 py-6">
        <aside className="hidden lg:flex flex-col w-[260px] sticky top-20 h-[calc(100vh-100px)] justify-between bg-[#121218] border border-white/5 rounded-3xl p-5 shadow-xl">
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-sm"
            >
              <Home size={18} /> হোম ফিড
            </Link>
            <Link
              href="/battle"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-purple-300 hover:text-white hover:bg-purple-500/15 font-bold text-sm transition border border-purple-500/20"
            >
              <Gamepad2 size={18} className="text-purple-400" /> গ্রুপ ব্যাটল এরিনা
            </Link>
            <Link
              href="/live"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
            >
              <Flame size={18} className="text-red-500" /> লাইভ ব্যাচ এক্সাম
            </Link>
            <Link
              href="/custom-exam"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
            >
              <Sliders size={18} className="text-cyan-400" /> কাস্টম এক্সাম
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
            >
              <Award size={18} className="text-amber-400" /> মেধা তালিকা
            </Link>
            <Link
              href="/mistakes"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
            >
              <BookOpen size={18} className="text-purple-400" /> মিসটেক ব্যাংক
            </Link>
            <Link
              href="/bookmarks"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
            >
              <Bookmark size={18} className="text-emerald-400" /> বুকমার্ক প্রশ্ন
            </Link>
          </nav>

          <Link
            href="/premium"
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 text-center block transition hover:scale-[1.02]"
          >
            <Sparkles size={22} className="text-amber-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-amber-300">প্রিমিয়াম সুবিধা</h4>
            <p className="text-[11px] text-gray-400 mt-1">
              সব পরীক্ষার ব্যাখ্যা এবং সম্পূর্ণ বিজ্ঞাপনমুক্ত সুবিধা পান।
            </p>
          </Link>
        </aside>

        <main className="w-full lg:max-w-[750px] min-h-screen flex flex-col pb-24 lg:pb-8">
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-4 sm:p-5 mb-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <Link href={profile ? "/profile" : "/login"} className="flex items-center gap-3 min-w-0 group">
                <div
                  className={`w-11 h-11 rounded-2xl p-[2px] flex-shrink-0 ${
                    isPro
                      ? "bg-gradient-to-tr from-amber-400 to-orange-500"
                      : "bg-gradient-to-tr from-cyan-400 to-blue-500"
                  }`}
                >
                  {profile?.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full rounded-[14px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-[#161620] flex items-center justify-center font-black text-base text-cyan-400">
                      {profile?.name ? profile.name[0].toUpperCase() : "H"}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-gray-400 block leading-tight">
                    {greeting} 👋
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white truncate group-hover:text-cyan-400 transition">
                    {profile?.name || "শিক্ষার্থী"}
                  </h2>
                </div>
              </Link>

              <div className="flex items-center gap-2 flex-shrink-0">
                {streak > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-black bg-orange-500/15 border border-orange-500/35 text-orange-400 px-2.5 py-1.5 rounded-xl">
                    <Flame size={13} className="fill-orange-400" /> {streak}d
                  </span>
                )}
                <Link
                  href="/mistakes"
                  className="hidden sm:flex items-center gap-1 text-[11px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 px-3 py-1.5 rounded-xl transition"
                >
                  <BookOpen size={13} /> মিসটেক
                </Link>
              </div>
            </div>

            <div className="relative group">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition"
              />
              <input
                type="text"
                placeholder="যেকোনো পরীক্ষা, অধ্যায় বা PDF নোট খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/70 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm outline-none text-white placeholder:text-gray-500 shadow-inner transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {search.trim() ? (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-400 mb-2">
                ফলাফল ({filteredItems.length} টি)
              </span>
              {filteredItems.length === 0 ? (
                <div className="bg-[#121218] border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-xs">
                  কোনো পরীক্ষা বা ফোল্ডার পাওয়া যায়নি।
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSearchItemClick(item)}
                    className="bg-[#121218] border border-white/5 hover:border-cyan-500/40 p-4 rounded-2xl cursor-pointer flex items-center justify-between transition active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 text-cyan-400">
                        {item.type === "EXAM_FIREBASE" ? (
                          <Play size={16} />
                        ) : item.type === "NOTE_PDF" ? (
                          <FileText size={16} />
                        ) : (
                          <Folder size={16} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-[11px] text-gray-400 line-clamp-1">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-extrabold">খুলুন →</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <SmartMatrixCanvas items={initialItems} />
              <Footer />
            </div>
          )}
        </main>

        <aside className="hidden xl:flex flex-col w-[300px] sticky top-20 h-[calc(100vh-100px)] gap-5">
          <div className="bg-gradient-to-br from-purple-900/25 via-[#121218] to-cyan-900/20 border border-purple-500/35 rounded-3xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2 mb-2">
              <Gamepad2 size={17} className="text-purple-400" /> গ্রুপ ব্যাটল (2–50+ জন)
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Android ও Web-এর বন্ধুদের সাথে রিয়েল-টাইম রেসিং ট্র্যাকে লাইভ কুইজ খেলুন!
            </p>
            <Link
              href="/battle"
              data-card-surface="custom"
              className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-center font-extrabold text-xs transition shadow-lg shadow-purple-500/20"
            >
              ব্যাটল এরিনায় যান ⚔️
            </Link>
          </div>

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

      {selectedExamItem && (
        <ExamActionModal item={selectedExamItem} onClose={() => setSelectedExamItem(null)} />
      )}
    </div>
  );
};