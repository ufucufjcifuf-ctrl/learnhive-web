"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExamHistory, clearExamHistory, HistoryRecord } from "@/lib/historyService";
import { ArrowLeft, Clock, Award, Trash2, Calendar, ChevronRight } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    setHistory(getExamHistory());
  }, []);

  const handleClear = () => {
    if (confirm("আপনি কি সমস্ত পরীক্ষার হিস্ট্রি মুছে ফেলতে চান?")) {
      clearExamHistory();
      setHistory([]);
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    if (percentage >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (percentage >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl pb-24">
        
        {/* হেডার */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-cyan-400 flex items-center gap-2">
                <Clock size={20} /> পরীক্ষার হিস্ট্রি (Exam History)
              </h1>
              <p className="text-[11px] text-gray-400">আপনার অতীতের সব পরীক্ষার ফলাফল ও পারফরম্যান্স</p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold p-2"
            >
              <Trash2 size={14} /> খালি করুন
            </button>
          )}
        </div>

        {/* হিস্ট্রি তালিকা */}
        {history.length === 0 ? (
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-10 text-center shadow-xl">
            <Clock size={40} className="text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-200">কোনো হিস্ট্রি পাওয়া যায়নি</h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">আপনি পরীক্ষা সম্পন্ন করলে স্বয়ংক্রিয়ভাবে এখানে তালিকা তৈরি হবে।</p>
            <Link
              href="/"
              className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
            >
              মডেল টেস্ট দিন
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((record) => {
              const dateStr = new Date(record.timestamp).toLocaleDateString("bn-BD", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const badgeStyle = getScoreColor(record.score, record.totalQuestions);

              return (
                <div
                  key={record.id}
                  onClick={() => router.push(`/review/${encodeURIComponent(record.examId)}`)}
                  className="bg-[#121218] border border-white/5 hover:border-cyan-500/30 p-5 rounded-3xl cursor-pointer flex justify-between items-center transition shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex-1 pr-3">
                    <h3 className="font-bold text-sm text-white line-clamp-1">{record.examTitle}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {dateStr}
                      </span>
                      <span>প্রশ্ন: {record.totalQuestions} টি</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold">
                      <span className="text-emerald-400">সঠিক: {record.correctAnswers}</span>
                      <span className="text-red-400">ভুল: {record.wrongAnswers}</span>
                      <span className="text-gray-500">স্কিপ: {record.skippedAnswers}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-2xl border font-black text-sm text-center ${badgeStyle}`}>
                      {record.score.toFixed(2)}
                    </div>
                    <ChevronRight size={18} className="text-gray-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}