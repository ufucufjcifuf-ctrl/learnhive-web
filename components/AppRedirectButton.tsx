"use client";

import React, { useState } from "react";
import { Smartphone, Play, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  examId: string;
  examTitle: string;
}

export const AppRedirectButton: React.FC<Props> = ({ examId, examTitle }) => {
  const router = useRouter();
  const [openingApp, setOpeningApp] = useState(false);

  const handleOpenApp = () => {
    setOpeningApp(true);
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.robinsheikh.mcqhub";
    const fallbackEncoded = encodeURIComponent(playStoreUrl);
    
    // Android Chrome Intent Format (ম্যাচিং Android MainActivity deep-link filter)
    const intentUrl = `intent://exam/${encodeURIComponent(examId)}#Intent;scheme=https;package=com.robinsheikh.mcqhub;S.browser_fallback_url=${fallbackEncoded};end`;

    // অ্যাপ ওপেন করার চেষ্টা
    window.location.href = intentUrl;

    setTimeout(() => {
      setOpeningApp(false);
    }, 2500);
  };

  const handleWebExam = () => {
    router.push(`/exam/${encodeURIComponent(examId)}?title=${encodeURIComponent(examTitle)}`);
  };

  return (
    <div className="flex flex-col gap-3 mt-4 w-full max-w-md mx-auto">
      {/* অ্যান্ড্রয়েড অ্যাপে ওপেন করার বাটন */}
      <button
        type="button"
        onClick={handleOpenApp}
        disabled={openingApp}
        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 text-sm shadow-xl shadow-cyan-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Smartphone size={18} className="fill-black" />
        <span>{openingApp ? "অ্যাপ চালু হচ্ছে..." : "OPEN IN ANDROID APP (BEST)"}</span>
      </button>

      {/* ওয়েব ব্রাউজারে পরীক্ষা দেওয়ার বাটন */}
      <button
        type="button"
        onClick={handleWebExam}
        className="w-full bg-[#121218] hover:bg-[#1A1A22] border border-white/10 hover:border-cyan-500/40 text-gray-200 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all"
      >
        <Play size={16} className="fill-gray-300" />
        <span>ওয়েবসাইটে পরীক্ষা দিন (Continue on Web)</span>
        <ArrowRight size={15} />
      </button>

      <p className="text-center text-[11px] text-gray-500 mt-1 leading-relaxed">
        * অ্যান্ড্রয়েড অ্যাপে পরীক্ষা দিলে ল্যাগ-ফ্রি ইন্টারফেস, ওএমআর শিট এবং তাৎক্ষণিক গ্লোবাল মেধা তালিকা পাওয়া যায়।
      </p>
    </div>
  );
};