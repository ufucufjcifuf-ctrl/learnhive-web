"use client";

import React from "react";
import { Clock, Layers, List, Eye, Home, AlertTriangle } from "lucide-react";
import { sounds } from "@/lib/soundEffects";

interface Props {
  examTitle: string;
  questionsCount: number;
  timeLeft: number;
  submitted: boolean;
  isListView: boolean;
  setIsListView: React.Dispatch<React.SetStateAction<boolean>>;
  onExitClick: () => void;
  onOverviewClick: () => void;
  onSubmitClick: () => void;
}

export const ExamHeader: React.FC<Props> = ({
  examTitle, questionsCount, timeLeft, submitted, isListView,
  setIsListView, onExitClick, onOverviewClick, onSubmitClick
}) => {
  return (
    <>
      {timeLeft < 60 && !submitted && (
        <div className="w-full bg-red-600/90 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50 animate-bounce">
          <AlertTriangle size={16} /> সতর্কবার্তা: আর মাত্র ১ মিনিট বাকি আছে!
        </div>
      )}

      <header className="w-full max-w-5xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitClick}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <Home size={18} />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base text-white line-clamp-1">{examTitle}</h1>
            <p className="text-[11px] text-gray-400">{submitted ? "ফলাফল বিশ্লেষণ" : `প্রশ্ন: ${questionsCount} টি`}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {!submitted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-xs border bg-cyan-500/10 border-cyan-500 text-cyan-400">
              <Clock size={14} />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}

          {!submitted && (
            <button
              onClick={() => { sounds.playClick(); setIsListView((p) => !p); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10"
              title={isListView ? "একক প্রশ্ন মোড" : "তালিকা মোড"}
            >
              {isListView ? <Layers size={18} /> : <List size={18} />}
            </button>
          )}

          <button
            onClick={() => { sounds.playClick(); onOverviewClick(); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10"
            title="প্রশ্নের ওভারভিউ (OMR)"
          >
            <Eye size={18} />
          </button>

          {!submitted && (
            <button
              onClick={() => { sounds.playClick(); onSubmitClick(); }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-emerald-500/20 shadow-lg"
            >
              সাবমিট
            </button>
          )}
        </div>
      </header>
    </>
  );
};