"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Trash2, Play, CheckCircle2 } from "lucide-react";
import { MathText } from "@/components/MathText";
import { Question } from "@/types";

export default function BookmarksPage() {
  const router = useRouter();
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mcqhub_saved_questions_detail");
      if (stored) {
        try {
          setSavedQuestions(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
  }, []);

  const removeBookmark = (id: string) => {
    const updated = savedQuestions.filter((q) => q.id !== id);
    setSavedQuestions(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("mcqhub_saved_questions_detail", JSON.stringify(updated));
    }
  };

  const clearAll = () => {
    if (confirm("আপনি কি সমস্ত বুকমার্ক করা প্রশ্ন মুছে ফেলতে চান?")) {
      setSavedQuestions([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("mcqhub_saved_questions_detail");
      }
    }
  };

  const startBookmarkPractice = () => {
    if (savedQuestions.length === 0) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mcqhub_revision_questions", JSON.stringify(savedQuestions));
    }
    router.push(`/exam/MISTAKE_REVISION?title=Bookmarked+Questions+Practice`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl pb-24">
        
        {/* হেডার */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-emerald-400 flex items-center gap-2">
                <Bookmark size={20} /> সেভ করা প্রশ্নসমূহ (Saved Questions)
              </h1>
              <p className="text-[11px] text-gray-400">পরীক্ষার সময় আপনার বুকমার্ক করে রাখা প্রশ্নগুলো</p>
            </div>
          </div>

          {savedQuestions.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold p-2"
            >
              <Trash2 size={14} /> সব মুছুন
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">প্রশ্ন খোঁজা হচ্ছে...</div>
        ) : savedQuestions.length === 0 ? (
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-10 text-center shadow-xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 mb-4">
              <Bookmark size={32} />
            </div>
            <h2 className="text-xl font-bold">কোনো বুকমার্ক প্রশ্ন জমা নেই</h2>
            <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
              যেকোনো পরীক্ষা দেওয়ার সময় বুকমার্ক বাটনে ক্লিক করলে সেই প্রশ্নটি এখানে জমা হবে যাতে আপনি পরে রিভিশন দিতে পারেন।
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* প্র্যাকটিস বাটন বক্স */}
            <div className="bg-[#121218] border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-400 block mb-1">
                  মোট সেভ করা প্রশ্ন: {savedQuestions.length} টি
                </span>
                <p className="text-xs text-gray-300">এই প্রশ্নগুলো দিয়ে একটি কুইক রিভিশন টেস্ট দিন।</p>
              </div>

              <button
                onClick={startBookmarkPractice}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
              >
                <Play size={16} className="fill-black" /> পরীক্ষা দিন
              </button>
            </div>

            {/* প্রশ্নের তালিকা */}
            <div className="flex flex-col gap-4">
              {savedQuestions.map((q, idx) => (
                <div key={q.id || idx} className="bg-[#121218] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5 text-xs">
                    <span className="font-extrabold text-cyan-400">প্রশ্ন নম্বর #{idx + 1}</span>
                    <button
                      onClick={() => removeBookmark(q.id)}
                      className="text-gray-500 hover:text-red-400 transition"
                      title="বুকমার্ক মুছুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="text-base font-bold text-gray-100">
                    <MathText text={q.text} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="bg-white/5 p-2.5 rounded-xl flex items-center gap-2 text-gray-300">
                        <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <MathText text={opt} />
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                      <span className="font-bold block text-amber-400 mb-0.5">💡 সঠিক ব্যাখ্যা:</span>
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