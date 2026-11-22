"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllSearchableItems } from "@/lib/layoutService";
import { searchItemsWithRanking } from "@/lib/searchService";
import { createFolderSlug, createExamSlug, createNoteSlug } from "@/lib/slugUtils";
import { getServerNow } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { ExamActionModal } from "@/components/ExamActionModal";
import { ArrowLeft, Search, Play, Folder, FileText, X, Share2 } from "lucide-react";

const NON_SEARCHABLE_TYPES = new Set([
  "NOTE_SHEET",
  "INFO_CARD",
  "TEXT",
  "SPACER",
  "DIVIDER",
  "IMAGE",
]);

export default function SearchPage() {
  const router = useRouter();
  const { isPro } = useAuth();
  const [queryText, setQueryText] = useState("");
  const [allItems, setAllItems] = useState<DashboardItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "EXAM" | "FOLDER" | "NOTE">("ALL");
  const [history, setHistory] = useState<string[]>([]);
  const [selectedExamItem, setSelectedExamItem] = useState<DashboardItem | null>(null);

  useEffect(() => {
    getAllSearchableItems().then((items) => {
      setAllItems(items.filter((it) => !it.isHidden && !NON_SEARCHABLE_TYPES.has(it.type)));
    });

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mcqhub_search_history");
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const handleSearchClick = (item: DashboardItem) => {
    if (queryText.trim() && !history.includes(queryText.trim())) {
      const updated = [queryText.trim(), ...history.slice(0, 9)];
      setHistory(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("mcqhub_search_history", JSON.stringify(updated));
      }
    }

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

  const handleShareClick = (e: React.MouseEvent, item: DashboardItem) => {
    e.stopPropagation();
    const rawCmd = item.command || item.id;
    const isFolder = item.type === "FOLDER" || item.type.includes("SECTION");
    const isNote = item.type === "NOTE_PDF";
    const slug = isFolder
      ? createFolderSlug(item.title, rawCmd, item.slug)
      : isNote
      ? createNoteSlug(item.title, rawCmd, item.slug)
      : createExamSlug(item.title, rawCmd, item.slug);
    const routePrefix = isFolder ? "/f/" : isNote ? "/note/" : "/p/";
    const url = `${window.location.origin}${routePrefix}${encodeURIComponent(slug)}`;

    if (navigator.share) {
      navigator.share({
        title: item.seoTitle || item.title,
        url,
        text: `Learn Hive-এ দেখুন:\n${item.title}\n${url}`,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("লিংক কপি হয়েছে!");
    }
  };

  const removeHistoryItem = (term: string) => {
    const updated = history.filter((h) => h !== term);
    setHistory(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("mcqhub_search_history", JSON.stringify(updated));
    }
  };

  const visibleItems = allItems.filter((it) => {
    if (it.visibilityCondition === "PREMIUM_ONLY" && !isPro) return false;
    if (it.visibilityCondition === "FREE_ONLY" && isPro) return false;
    return true;
  });

  const rankedResults = searchItemsWithRanking(visibleItems, queryText);

  const filtered = rankedResults.filter((it) => {
    if (activeFilter === "EXAM") return it.type === "EXAM_FIREBASE";
    if (activeFilter === "FOLDER") return it.type === "FOLDER" || it.type.includes("SECTION");
    if (activeFilter === "NOTE") return it.type === "NOTE_PDF";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="যেকোনো পরীক্ষা বা বিষয় খুঁজুন..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-cyan-500 outline-none transition shadow-xl"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl border transition ${
              activeFilter === "ALL" ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/5 border-white/5 text-gray-400"
            }`}
          >
            সব
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("EXAM")}
            className={`px-3 py-1.5 rounded-xl border transition ${
              activeFilter === "EXAM" ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/5 border-white/5 text-gray-400"
            }`}
          >
            পরীক্ষা
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("FOLDER")}
            className={`px-3 py-1.5 rounded-xl border transition ${
              activeFilter === "FOLDER" ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/5 border-white/5 text-gray-400"
            }`}
          >
            ফোল্ডার
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("NOTE")}
            className={`px-3 py-1.5 rounded-xl border transition ${
              activeFilter === "NOTE" ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/5 border-white/5 text-gray-400"
            }`}
          >
            PDF নোট
          </button>
        </div>

        {!queryText && history.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">সাম্প্রতিক সার্চ</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((term, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-[#121218] border border-white/5 px-3 py-1.5 rounded-xl text-xs text-gray-300"
                >
                  <span className="cursor-pointer hover:text-cyan-400" onClick={() => setQueryText(term)}>
                    {term}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeHistoryItem(term)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {queryText.trim() && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              ফলাফল ({filtered.length})
            </span>

            {filtered.length === 0 ? (
              <div className="bg-[#121218] border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-xs">
                &quot;{queryText}&quot; দিয়ে কোনো ফলাফল পাওয়া যায়নি।
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSearchClick(item)}
                  className="bg-[#121218] border border-white/5 hover:border-cyan-500/40 p-4 rounded-2xl cursor-pointer flex items-center justify-between transition shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 flex-1 pr-2">
                    <div className="p-2.5 rounded-xl bg-white/5 text-cyan-400 flex-shrink-0">
                      {item.type === "EXAM_FIREBASE" ? (
                        <Play size={16} />
                      ) : item.type === "NOTE_PDF" ? (
                        <FileText size={16} />
                      ) : (
                        <Folder size={16} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white line-clamp-1">
                        <MathText text={item.title} />
                      </h4>
                      {item.subtitle && <p className="text-[11px] text-gray-400 line-clamp-1">{item.subtitle}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleShareClick(e, item)}
                      className="p-2 text-gray-400 hover:text-cyan-400 transition"
                      title="শেয়ার করুন"
                    >
                      <Share2 size={16} />
                    </button>
                    <span className="text-xs text-cyan-400 font-extrabold">খুলুন →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedExamItem && (
        <ExamActionModal item={selectedExamItem} onClose={() => setSelectedExamItem(null)} />
      )}
    </div>
  );
}