"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types";
import { MathText } from "@/components/MathText";
import { ArrowLeft, BookOpen, Play, Trash2, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";

export default function MistakesPage() {
  const router = useRouter();
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLimit, setSelectedLimit] = useState(10);

  useEffect(() => {
    // লোকালস্টোরেজ থেকে জমানো ভুল প্রশ্নগুলো আনা
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mcqhub_mistake_bank");
      if (stored) {
        try {
          setMistakes(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
  }, []);

  // মিসটেক ব্যাংক সম্পূর্ণ খালি করা
  const clearMistakes = () => {
    if (confirm("আপনি কি সমস্ত ভুল প্রশ্নের তালিকা মুছে ফেলতে চান?")) {
      setMistakes([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("mcqhub_mistake_bank");
      }
    }
  };

  // ভুল প্রশ্ন দিয়ে রিভিশন এক্সাম শুরু করা
  const startRevisionExam = () => {
    if (mistakes.length === 0) return;
    const questionsToRevise = mistakes.slice(0, selectedLimit);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mcqhub_revision_questions", JSON.stringify(questionsToRevise));
    }
    router.push(`/exam/MISTAKE_REVISION?title=Mistake+Bank+Revision`);
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
              <h1 className="font-extrabold text-base md:text-lg text-purple-400 flex items-center gap-2">
                <BookOpen size={20} /> মিসটেক ব্যাংক (Mistake Bank)
              </h1>
              <p className="text-[11px] text-gray-400">আপনার ভুল করা প্রশ্নগুলো শুধরে নেওয়ার সুযোগ</p>
            </div>
          </div>

          {mistakes.length > 0 && (
            <button
              onClick={clearMistakes}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold p-2"
            >
              <Trash2 size={14} /> খালি করুন
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">ভুল প্রশ্ন খোঁজা হচ্ছে...</div>
        ) : mistakes.length === 0 ? (
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-10 text-center shadow-xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 mb-4 shadow-emerald-500/20 shadow-lg">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold">কোনো ভুল প্রশ্ন জমা নেই! 🎉</h2>
            <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
              আপনি যখন কোনো মডেল টেস্টে ভুল উত্তর দেবেন, সেই প্রশ্নগুলো স্বয়ংক্রিয়ভাবে এখানে জমা হবে যাতে আপনি রিভিশন দিয়ে ভুল শোধরাতে পারেন।
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* রিভিশন এক্সাম স্টার্ট বক্স */}
            <div className="bg-[#121218] border border-purple-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold text-purple-400 block mb-1">
                  মোট ভুল জমেছে: {mistakes.length} টি
                </span>
                <p className="text-xs text-gray-300">এখনই একটি স্পেশাল রিভিশন টেস্ট দিয়ে ভুল শুধরে নিন।</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedLimit}
                  onChange={(e) => setSelectedLimit(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-cyan-400 outline-none"
                >
                  <option value={10}>১০টি প্রশ্ন</option>
                  <option value={20}>২০টি প্রশ্ন</option>
                  <option value={50}>৫০টি প্রশ্ন</option>
                  <option value={mistakes.length}>সব প্রশ্ন</option>
                </select>

                <button
                  onClick={startRevisionExam}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-purple-500/20"
                >
                  <Play size={16} className="fill-black" /> রিভিশন দিন
                </button>
              </div>
            </div>

            {/* ভুল প্রশ্নের প্রিভিউ তালিকা */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              ভুল হওয়া প্রশ্নসমূহ ({mistakes.length})
            </h3>

            <div className="flex flex-col gap-3">
              {mistakes.map((q, idx) => (
                <div key={q.id || idx} className="bg-[#121218] border border-white/5 rounded-2xl p-5 shadow-lg">
                  <span className="text-[10px] font-bold text-purple-400 block mb-1">প্রশ্ন #{idx + 1}</span>
                  <div className="text-sm font-semibold text-gray-100">
                    <MathText text={q.text} />
                  </div>
                  {q.explanation && (
                    <div className="mt-3 pt-3 border-t border-white/5 text-xs text-amber-200">
                      <span className="font-bold text-amber-400 block mb-0.5">💡 সঠিক ব্যাখ্যা:</span>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}