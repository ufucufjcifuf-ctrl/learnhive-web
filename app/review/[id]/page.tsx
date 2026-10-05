"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question } from "@/types";
import { MathText } from "@/components/MathText";
import { ReportModal } from "@/components/ReportModal";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Bookmark,
  Check,
  Lock,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface ReviewData {
  questions: Question[];
  answers: Record<number, number>;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  liveEndTime?: number | null;
  hideSolutionUntilLiveEnds?: boolean;
}

export default function ReviewScreen() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<ReviewData | null>(null);
  const [filter, setFilter] = useState<"ALL" | "WRONG" | "SKIPPED" | "CORRECT">("ALL");
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const decodedId = decodeURIComponent(String(id));
      const stored =
        sessionStorage.getItem(`mcqhub_review_${id}`) ||
        localStorage.getItem(`mcqhub_persisted_review_${decodedId}`);

      if (stored) {
        try {
          setData(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }

      const bms = localStorage.getItem("mcqhub_saved_questions_detail");
      if (bms) {
        try {
          const list: Question[] = JSON.parse(bms);
          const map: Record<string, boolean> = {};
          list.forEach((q) => { map[q.id] = true; });
          setBookmarks(map);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [id]);

  const toggleBookmark = (q: Question) => {
    const isCurrentlySaved = Boolean(bookmarks[q.id]);
    const updated = { ...bookmarks, [q.id]: !isCurrentlySaved };
    setBookmarks(updated);

    if (typeof window !== "undefined") {
      try {
        let savedList: Question[] = [];
        const stored = localStorage.getItem("mcqhub_saved_questions_detail");
        if (stored) savedList = JSON.parse(stored);

        if (!isCurrentlySaved) {
          if (!savedList.some((item) => item.id === q.id)) savedList.push(q);
        } else {
          savedList = savedList.filter((item) => item.id !== q.id);
        }
        localStorage.setItem("mcqhub_saved_questions_detail", JSON.stringify(savedList));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-400 text-sm mb-4">এই পরীক্ষার কোনো সমাধান রেকর্ড পাওয়া যায়নি।</p>
        <button
          onClick={() => router.push("/")}
          className="bg-cyan-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl"
        >
          হোমপেজে ফিরে যান
        </button>
      </div>
    );
  }

  // অ্যান্টি-চিট লক যাচাই (৫ মিনিট গ্রেস পিরিয়ড সহ)
  const isLocked = Boolean(
    data.hideSolutionUntilLiveEnds &&
      data.liveEndTime &&
      Date.now() < data.liveEndTime + 300_000
  );

  if (isLocked) {
    const unlockDate = new Date(data.liveEndTime!).toLocaleString("bn-BD", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-[#121218] border border-red-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400 mb-4 shadow-lg shadow-red-500/20">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-white">অ্যান্টি-চিট প্রোটেকশন সক্রিয়</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            পরীক্ষায় অসদুপায় রোধ করতে লাইভ পরীক্ষা চলাকালীন সমাধান ও সঠিক উত্তর সম্পূর্ণ গোপন রাখা হয়েছে।
          </p>

          <div className="mt-6 bg-white/5 border border-white/10 p-3 rounded-2xl text-xs text-cyan-400 font-bold flex items-center justify-center gap-2">
            <Calendar size={14} />
            <span>সমাধান উন্মুক্ত হবে: {unlockDate}</span>
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full mt-6 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-3.5 rounded-2xl text-xs transition"
          >
            হোমপেজে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const filteredQuestions = data.questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
    const selected = data.answers[idx];
    const isAnswered = selected !== undefined;
    const correctAnswers =
      q.correctOptionIndices && q.correctOptionIndices.length > 0
        ? q.correctOptionIndices
        : q.correctOptionIndex !== -1
        ? [q.correctOptionIndex]
        : [];

    const isBonus = q.options.length > 0 && correctAnswers.length === 0;
    const isCorrect = isAnswered && (correctAnswers.includes(selected) || isBonus);

    if (filter === "CORRECT") return isCorrect;
    if (filter === "WRONG") return isAnswered && !isCorrect;
    if (filter === "SKIPPED") return !isAnswered;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-3xl">
        
        {/* টপ হেডার */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 sticky top-0 bg-[#0A0A0E]/90 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-extrabold text-base md:text-lg">সমাধান ও ব্যাখ্যা (Solutions)</h1>
              <p className="text-[11px] text-gray-400">মোট প্রশ্ন: {data.questions.length} টি</p>
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-black text-cyan-400 text-xs">
            স্কোর: {data.score.toFixed(2)}
          </div>
        </div>

        {/* ফিল্টার বাটন সমূহ */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-xl border transition ${
              filter === "ALL" ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            সব ({data.questions.length})
          </button>
          <button
            onClick={() => setFilter("WRONG")}
            className={`px-4 py-2 rounded-xl border transition ${
              filter === "WRONG" ? "bg-red-500 text-white border-red-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            ভুল উত্তর ({data.wrong}) ❌
          </button>
          <button
            onClick={() => setFilter("SKIPPED")}
            className={`px-4 py-2 rounded-xl border transition ${
              filter === "SKIPPED" ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            স্কিপড ({data.skipped}) ⚠️
          </button>
          <button
            onClick={() => setFilter("CORRECT")}
            className={`px-4 py-2 rounded-xl border transition ${
              filter === "CORRECT" ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            সঠিক ({data.correct}) ✅
          </button>
        </div>

        {/* প্রশ্নের তালিকা */}
        {filteredQuestions.length === 0 ? (
          <div className="bg-[#121218] border border-white/5 rounded-3xl p-12 text-center my-6">
            <p className="text-gray-400 text-sm">এই ক্যাটাগরিতে কোনো প্রশ্ন নেই।</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-20">
            {filteredQuestions.map(({ q, idx }) => {
              const selected = data.answers[idx];
              const isAnswered = selected !== undefined;
              const correctAnswers =
                q.correctOptionIndices && q.correctOptionIndices.length > 0
                  ? q.correctOptionIndices
                  : q.correctOptionIndex !== -1
                  ? [q.correctOptionIndex]
                  : [];

              const isBonus = q.options.length > 0 && correctAnswers.length === 0;
              const isCorrect = isAnswered && (correctAnswers.includes(selected) || isBonus);

              return (
                <div
                  key={q.id || idx}
                  className={`bg-[#121218] border rounded-3xl p-6 md:p-8 shadow-xl ${
                    !isAnswered
                      ? "border-white/10"
                      : isCorrect
                      ? "border-emerald-500/30"
                      : "border-red-500/30"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-cyan-400">প্রশ্ন নম্বর {idx + 1}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !isAnswered
                            ? "bg-gray-500/10 text-gray-400"
                            : isCorrect
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {!isAnswered ? "স্কিপড" : isCorrect ? "+১.০০ (সঠিক)" : "-০.২৫ (ভুল)"}
                      </span>
                      {isBonus && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          বোনাস প্রশ্ন
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReportingQuestion(q)}
                        title="রিপোর্ট করুন"
                        className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition"
                      >
                        <AlertCircle size={15} />
                      </button>
                      <button
                        onClick={() => toggleBookmark(q)}
                        className={`p-2 rounded-xl transition ${
                          bookmarks[q.id] ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Bookmark size={16} className={bookmarks[q.id] ? "fill-cyan-400" : ""} />
                      </button>
                    </div>
                  </div>

                  <div className="text-base md:text-lg font-bold text-gray-100">
                    <MathText text={q.text} />
                  </div>

                  <div className="flex flex-col gap-2.5 mt-5">
                    {q.options.map((opt, optIdx) => {
                      const isActualCorrect = correctAnswers.includes(optIdx) || isBonus;
                      const isUserSelected = selected === optIdx;

                      let optBg = "bg-white/5 border-white/5 text-gray-400";
                      let badgeBg = "bg-white/10 text-gray-400";

                      if (isActualCorrect) {
                        optBg = "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold";
                        badgeBg = "bg-emerald-500 text-black font-extrabold";
                      } else if (isUserSelected && !isActualCorrect) {
                        optBg = "bg-red-500/15 border-red-500/50 text-red-300";
                        badgeBg = "bg-red-500 text-white font-extrabold";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm transition ${optBg}`}
                        >
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${badgeBg}`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <div className="flex-1">
                            <MathText text={opt} />
                          </div>
                          {isActualCorrect && <CheckCircle2 size={16} className="text-emerald-400" />}
                          {isUserSelected && !isActualCorrect && <XCircle size={16} className="text-red-400" />}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                      <span className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
                        <Check size={14} /> সঠিক উত্তর ও ব্যাখ্যা:
                      </span>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reportingQuestion && (
        <ReportModal
          question={reportingQuestion}
          examId={String(id)}
          onClose={() => setReportingQuestion(null)}
        />
      )}
    </div>
  );
}