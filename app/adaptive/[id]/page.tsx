"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Question } from "@/types";
import { MathText } from "@/components/MathText";
import { sounds } from "@/lib/soundEffects";
import { ArrowLeft, Flame, BrainCircuit, CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";

export default function AdaptivePracticePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const title = searchParams.get("title") || "Smart AI Practice";

  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<{ A: Question[]; B: Question[]; C: Question[]; D: Question[] }>({
    A: [],
    B: [],
    C: [],
    D: [],
  });

  const [currentLevel, setCurrentLevel] = useState<"A" | "B" | "C" | "D">("B");
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [consecutive, setConsecutive] = useState(0);

  useEffect(() => {
    async function loadQuestions() {
      try {
        let sheetId = id;
        let tab = "Sheet1";
        if (id.includes(":")) {
          sheetId = id.split(":")[0];
          tab = id.split(":")[1] || "Sheet1";
        }
        const res = await fetch(`/api/sheet?sheetId=${encodeURIComponent(sheetId)}&tab=${encodeURIComponent(tab)}`);
        const json = await res.json();
        const all: Question[] = json.data || [];

        const pA: Question[] = [];
        const pB: Question[] = [];
        const pC: Question[] = [];
        const pD: Question[] = [];

        all.forEach((q) => {
          if (q.difficulty === "A") pA.push(q);
          else if (q.difficulty === "C") pC.push(q);
          else if (q.difficulty === "D") pD.push(q);
          else pB.push(q);
        });

        pA.sort(() => Math.random() - 0.5);
        pB.sort(() => Math.random() - 0.5);
        pC.sort(() => Math.random() - 0.5);
        pD.sort(() => Math.random() - 0.5);

        setPools({ A: pA, B: pB, C: pC, D: pD });
        const initial = pB.pop() || pA.pop() || pC.pop() || pD.pop() || null;
        setCurrentQ(initial);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadQuestions();
  }, [id]);

  const loadNextQuestion = (nextLvl: "A" | "B" | "C" | "D") => {
    setSelectedOpt(null);
    setCurrentLevel(nextLvl);

    const pool = pools[nextLvl];
    let next: Question | null = null;

    if (pool.length > 0) {
      next = pool.pop()!;
    } else {
      const fallbackLevels: ("A" | "B" | "C" | "D")[] = ["B", "C", "A", "D"];
      for (const lvl of fallbackLevels) {
        if (pools[lvl].length > 0) {
          next = pools[lvl].pop()!;
          setCurrentLevel(lvl);
          break;
        }
      }
    }

    setCurrentQ(next);
  };

  const handleSelect = (idx: number) => {
    if (selectedOpt !== null || !currentQ) return;
    setSelectedOpt(idx);
    setTotalCount((p) => p + 1);

    const correctAnswers =
      currentQ.correctOptionIndices && currentQ.correctOptionIndices.length > 0
        ? currentQ.correctOptionIndices
        : [currentQ.correctOptionIndex];

    const isCorrect = correctAnswers.includes(idx);

    if (isCorrect) {
      sounds.playCorrect(); // 🔥 সঠিক উত্তরের সাউন্ড
      setCorrectCount((p) => p + 1);
      setStreak((p) => p + 1);
      const newConsecutive = consecutive + 1;
      setConsecutive(newConsecutive);

      if (newConsecutive >= 2) {
        setConsecutive(0);
        const upMap: Record<string, "A" | "B" | "C" | "D"> = { A: "B", B: "C", C: "D", D: "D" };
        setTimeout(() => loadNextQuestion(upMap[currentLevel]), 1800);
      } else {
        setTimeout(() => loadNextQuestion(currentLevel), 1800);
      }
    } else {
      sounds.playWrong(); // 🔥 ভুল উত্তরের বাজার সাউন্ড
      setStreak(0);
      setConsecutive(0);
      const downMap: Record<string, "A" | "B" | "C" | "D"> = { D: "C", C: "B", B: "A", A: "A" };
      setTimeout(() => loadNextQuestion(downMap[currentLevel]), 2500);
    }
  };

  const levelInfo = {
    A: { name: "EASY", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    B: { name: "MEDIUM", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
    C: { name: "HARD", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    D: { name: "EXPERT", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  }[currentLevel];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400 animate-pulse">স্মার্ট অ্যালগরিদম প্রস্তুত হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl">
        
        {/* টপ হেডার ও স্ট্যাটাস */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sounds.playClick();
                router.back();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-extrabold text-base line-clamp-1">{title}</h1>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${levelInfo.color}`}>
                লেভেল: {levelInfo.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono font-bold text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full">
              <Flame size={14} className={streak > 1 ? "fill-red-500" : ""} /> {streak}
            </span>
            <span className="text-xs font-bold text-gray-400">
              স্কোর: {correctCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* প্রশ্ন কার্ড */}
        {currentQ ? (
          <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="text-base md:text-lg font-bold text-gray-100">
              <MathText text={currentQ.text} />
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const correctAnswers =
                  currentQ.correctOptionIndices && currentQ.correctOptionIndices.length > 0
                    ? currentQ.correctOptionIndices
                    : [currentQ.correctOptionIndex];
                const isCorrect = correctAnswers.includes(idx);

                let optStyle = "bg-white/5 border-white/5 hover:border-white/20 text-gray-300";
                if (selectedOpt !== null) {
                  if (isCorrect) optStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                  else if (isSelected) optStyle = "bg-red-500/20 border-red-500 text-red-300";
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedOpt !== null}
                    onClick={() => handleSelect(idx)}
                    className={`flex items-center gap-4 w-full p-4 rounded-2xl text-left font-semibold text-sm transition border ${optStyle}`}
                  >
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs bg-white/10">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1">
                      <MathText text={opt} />
                    </div>
                    {selectedOpt !== null && isCorrect && <CheckCircle2 size={18} className="text-emerald-400" />}
                    {selectedOpt !== null && isSelected && !isCorrect && <XCircle size={18} className="text-red-400" />}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && currentQ.explanation && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed animate-fade-in">
                <span className="font-bold block text-amber-400 mb-1">💡 সমাধান ও ব্যাখ্যা:</span>
                <MathText text={currentQ.explanation} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#121218] border border-white/5 rounded-3xl p-10 text-center">
            <h2 className="text-xl font-bold text-emerald-400">অভিনন্দন! 🎉</h2>
            <p className="text-xs text-gray-400 mt-2">আপনি এই অধ্যায়ের সব প্রশ্ন সফলভাবে অনুশীলন করেছেন।</p>
          </div>
        )}
      </div>
    </div>
  );
}