"use client";

import React from "react";
import { Smartphone, Play, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  examId: string;
  examTitle: string;
}

export const AppRedirectButton: React.FC<Props> = ({ examId, examTitle }) => {
  const router = useRouter();

  const handleOpenApp = () => {
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.robinsheikh.mcqhub";
    const fallbackEncoded = encodeURIComponent(playStoreUrl);
    
    // Android Chrome Intent Format
    const intentUrl = `intent://exam/${encodeURIComponent(examId)}#Intent;scheme=https;package=com.robinsheikh.mcqhub;S.browser_fallback_url=${fallbackEncoded};end`;

    // Attempt to open native app
    window.location.href = intentUrl;
  };

  const handleWebExam = () => {
    router.push(`/exam/${encodeURIComponent(examId)}?title=${encodeURIComponent(examTitle)}`);
  };

  return (
    <div className="flex flex-col gap-3 mt-8 w-full max-w-sm mx-auto">
      <button
        onClick={handleOpenApp}
        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-xl shadow-cyan-500/30 transition transform hover:scale-[1.02]"
      >
        <Smartphone size={18} /> OPEN IN ANDROID APP (BEST)
      </button>

      <button
        onClick={handleWebExam}
        className="w-full bg-white/5 border border-white/10 text-gray-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm transition hover:bg-white/10"
      >
        <Play size={16} /> Continue in Web Browser <ArrowRight size={16} />
      </button>
      
      <p className="text-center text-[10px] text-gray-500 mt-2">
        * Using the Android App provides an ad-free experience, offline capabilities, and faster performance.
      </p>
    </div>
  );
};