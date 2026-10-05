"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Eye, Lock } from "lucide-react";
import { CelebrationConfetti } from "@/components/CelebrationConfetti";

interface Props {
  result: { correct: number; wrong: number; skipped: number; score: number; total: number };
  isSolutionLocked: boolean;
  examId: string;
}

export const ExamResultCard: React.FC<Props> = ({ result, isSolutionLocked, examId }) => {
  const router = useRouter();
  const isHighScorer = result.total > 0 && result.score / result.total >= 0.5;

  return (
    <section className="w-full max-w-4xl px-4 mt-6">
      {isHighScorer && <CelebrationConfetti />}
      <div className="bg-[#121218] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            পরীক্ষা সম্পন্ন
          </span>
          <h2 className="text-2xl font-black text-white mt-2">
            {isHighScorer ? "চমৎকার ফলাফল! 🌟" : "আপনার ফলাফল 🎉"}
          </h2>
          <p className="text-xs text-gray-400 mt-1">ভুল উত্তরের জন্য নেগেটিভ মার্কিং হিসাব করা হয়েছে।</p>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center w-full md:w-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
            <span className="text-[10px] text-gray-400 block font-bold">সঠিক</span>
            <span className="text-lg font-black text-emerald-400">{result.correct}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl">
            <span className="text-[10px] text-gray-400 block font-bold">ভুল</span>
            <span className="text-lg font-black text-red-400">{result.wrong}</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
            <span className="text-[10px] text-gray-400 block font-bold">স্কিপ</span>
            <span className="text-lg font-black text-gray-300">{result.skipped}</span>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-2xl">
            <span className="text-[10px] text-gray-400 block font-bold">নম্বর</span>
            <span className="text-lg font-black text-cyan-400">{result.score.toFixed(2)}</span>
          </div>
        </div>

        {isSolutionLocked ? (
          <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-2xl text-xs font-bold">
            <Lock size={16} />
            <span>লাইভ শেষ হলে সমাধান উন্মুক্ত হবে</span>
          </div>
        ) : (
          <button
            onClick={() => router.push(`/review/${examId}`)}
            className="mt-4 md:mt-0 flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-5 py-2.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <Eye size={16} /> সমাধান দেখুন →
          </button>
        )}
      </div>
    </section>
  );
};