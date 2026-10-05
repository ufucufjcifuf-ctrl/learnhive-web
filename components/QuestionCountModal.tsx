"use client";

import React, { useState } from "react";
import { X, Clock, HelpCircle, Play, Sliders } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuestionCountModalProps {
  examId: string;
  examTitle: string;
  defaultDuration: number;
  allowDifficultyFilter?: boolean;
  onClose: () => void;
}

export const QuestionCountModal: React.FC<QuestionCountModalProps> = ({
  examId,
  examTitle,
  defaultDuration,
  allowDifficultyFilter = false,
  onClose,
}) => {
  const router = useRouter();

  const [selectedChip, setSelectedChip] = useState<string>("20");
  const [customQ, setCustomQ] = useState("");
  const [customTime, setCustomTime] = useState(defaultDuration > 0 ? String(defaultDuration) : "20");
  const [difficulty, setDifficulty] = useState<string>("ALL");

  const chips = ["10", "20", "30", "50", "ALL"];
  const diffLevels = [
    { code: "ALL", label: "মিক্সড (সব)" },
    { code: "A", label: "সহজ (A)" },
    { code: "B", label: "মাঝারি (B)" },
    { code: "C", label: "কঠিন (C)" },
    { code: "D", label: "এক্সপার্ট (D)" },
  ];

  const handleStart = () => {
    let finalLimit = -1;
    if (selectedChip === "ALL") finalLimit = -1;
    else if (selectedChip === "CUSTOM") finalLimit = Number(customQ) || -1;
    else finalLimit = Number(selectedChip) || -1;

    const finalTime = Number(customTime) || (defaultDuration > 0 ? defaultDuration : 20);

    onClose();
    router.push(
      `/exam/${encodeURIComponent(examId)}?title=${encodeURIComponent(
        examTitle
      )}&limit=${finalLimit}&duration=${finalTime}&diff=${difficulty}`
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* হেডার */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <h3 className="font-extrabold text-sm md:text-base text-white">পরীক্ষার সেটআপ (Exam Setup)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* কাঠিন্যের লেভেল ফিল্টার (যদি অন থাকে) */}
        {allowDifficultyFilter && (
          <div className="mb-4">
            <span className="text-[11px] font-bold text-gray-400 block mb-2">লেভেল নির্বাচন করুন</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {diffLevels.map((lvl) => (
                <button
                  key={lvl.code}
                  type="button"
                  onClick={() => setDifficulty(lvl.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex-shrink-0 ${
                    difficulty === lvl.code
                      ? "bg-amber-400 text-black border-amber-400 font-extrabold"
                      : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* কুইক প্রশ্ন সংখ্যা চিপস */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-gray-400 block mb-2">কতটি প্রশ্ন চান?</span>
          <div className="grid grid-cols-5 gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setSelectedChip(chip);
                  setCustomQ("");
                }}
                className={`py-2 rounded-xl text-xs font-black border transition ${
                  selectedChip === chip
                    ? "bg-cyan-500 text-black border-cyan-500 shadow-md shadow-cyan-500/20"
                    : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* কাস্টম ইনপুট সমূহ */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 flex flex-col gap-3">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">কাস্টম সেটআপ</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">কাস্টম প্রশ্ন</label>
              <input
                type="number"
                placeholder="যেমন: ১৫"
                value={customQ}
                onChange={(e) => {
                  setCustomQ(e.target.value);
                  setSelectedChip("CUSTOM");
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">সময় (মিনিট)</label>
              <input
                type="number"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:border-amber-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* সাবমিট বাটন */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Play size={16} className="fill-black" /> পরীক্ষা শুরু করুন
        </button>

      </div>
    </div>
  );
};