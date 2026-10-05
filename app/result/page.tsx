"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CelebrationConfetti } from "@/components/CelebrationConfetti";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Home,
  Eye,
  Award,
} from "lucide-react";

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const examId = searchParams.get("id") || "";
  const total = Number(searchParams.get("total")) || 0;
  const correct = Number(searchParams.get("correct")) || 0;
  const wrong = Number(searchParams.get("wrong")) || 0;
  const skipped = Number(searchParams.get("skipped")) || 0;
  const score = Number(searchParams.get("score")) || 0;
  const globalXP = Number(searchParams.get("xp")) || 0;

  const totalSafe = total === 0 ? 1 : total;
  const correctPct = Math.round((correct / totalSafe) * 100);
  const wrongPct = Math.round((wrong / totalSafe) * 100);
  const skippedPct = Math.max(0, 100 - (correctPct + wrongPct));

  const isOutstanding = total > 0 && correct / total >= 0.8;
  const isGreat = total > 0 && correct / total >= 0.5;

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-between p-4 md:p-6 pb-12 selection:bg-cyan-500 selection:text-black">
      {isGreat && <CelebrationConfetti />}

      <div className="w-full max-w-md flex flex-col items-center text-center my-auto">
        
        {/* হেডলাইন */}
        <h1 className="text-3xl font-black tracking-wide text-white flex items-center justify-center gap-2 mb-6">
          {isOutstanding ? "Outstanding! 🌟" : isGreat ? "Great Job! 🎉" : "Keep Practicing! 💪"}
        </h1>

        {/* সলিড পাই-চার্ট (অ্যান্ড্রয়েডের হুবহু পাই-চার্ট) */}
        <div className="relative w-48 h-48 rounded-full mb-6 shadow-2xl flex items-center justify-center">
          <div
            className="w-full h-full rounded-full transition-all duration-1000"
            style={{
              background: `conic-gradient(#00E676 0% ${correctPct}%, #FF4545 ${correctPct}% ${correctPct + wrongPct}%, #4B5563 ${correctPct + wrongPct}% 100%)`,
            }}
          />
          {/* পাই-চার্টের ভেতরের পার্সেন্টেজ টেক্সট */}
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none text-xs font-black text-black">
            {correctPct >= 10 && (
              <span className="bg-white/90 px-2 py-0.5 rounded-full shadow-md text-emerald-800">
                {correctPct}%
              </span>
            )}
            {skippedPct >= 10 && (
              <span className="bg-white/90 px-2 py-0.5 rounded-full shadow-md text-gray-800">
                {skippedPct}%
              </span>
            )}
          </div>
        </div>

        {/* প্রাপ্ত নম্বর */}
        <span className="text-xs text-gray-400 font-semibold block mb-1">Total Earned Score</span>
        <span className="text-5xl font-black text-cyan-400 tracking-tight block mb-6">
          {score.toFixed(2)}
        </span>

        {/* Global XP ব্যাজ */}
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-5 py-2 rounded-full flex items-center gap-2 text-xs font-black mb-6 shadow-lg shadow-amber-500/5">
          <Award size={16} />
          <span>Global XP Earned: {globalXP >= 0 ? `+${globalXP.toFixed(2)}` : globalXP.toFixed(2)}</span>
        </div>

        {/* লেজেন্ডস (ডটস) */}
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-300 mb-8">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> {correctPct}% Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {wrongPct}% Wrong
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> {skippedPct}% Skipped
          </span>
        </div>

        {/* স্ট্যাটাস কার্ড ৩টি */}
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <div className="bg-[#121218] border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center">
            <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
            <span className="text-2xl font-black text-white">{correct}</span>
            <span className="text-[11px] text-gray-400 font-bold mt-0.5">Correct</span>
          </div>

          <div className="bg-[#121218] border border-red-500/30 rounded-2xl p-4 flex flex-col items-center">
            <XCircle size={20} className="text-red-500 mb-2" />
            <span className="text-2xl font-black text-white">{wrong}</span>
            <span className="text-[11px] text-gray-400 font-bold mt-0.5">Wrong</span>
          </div>

          <div className="bg-[#121218] border border-white/10 rounded-2xl p-4 flex flex-col items-center">
            <MinusCircle size={20} className="text-gray-400 mb-2" />
            <span className="text-2xl font-black text-white">{skipped}</span>
            <span className="text-[11px] text-gray-400 font-bold mt-0.5">Skipped</span>
          </div>
        </div>

        {/* বটম বাটন দুটি: HOME & REVIEW */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => router.replace("/")}
            className="w-full bg-[#161620] hover:bg-[#1E1E2C] border border-white/10 text-white font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition"
          >
            <Home size={16} /> HOME
          </button>

          <button
            onClick={() => router.push(`/review/${encodeURIComponent(examId)}`)}
            className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-400/20"
          >
            <Eye size={16} /> REVIEW
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0E] text-white flex items-center justify-center">ফলাফল তৈরি হচ্ছে...</div>}>
      <ResultContent />
    </Suspense>
  );
}