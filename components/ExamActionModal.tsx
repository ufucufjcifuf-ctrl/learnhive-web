"use client";

import React, { useState } from "react";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { Play, BrainCircuit, BookOpen, Award, X, Share2, Calendar, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { QuestionCountModal } from "@/components/QuestionCountModal";

interface ExamActionModalProps {
  item: DashboardItem | null;
  onClose: () => void;
}

export const ExamActionModal: React.FC<ExamActionModalProps> = ({ item, onClose }) => {
  const router = useRouter();
  const [showCountModal, setShowCountModal] = useState(false);

  if (!item) return null;

  const rawCmd = item.command || item.id;
  const config = item.examConfig;

  const isLive =
    config?.startTimeMs &&
    config?.liveEndTimeMs &&
    Date.now() >= config.startTimeMs &&
    Date.now() <= config.liveEndTimeMs;

  const handleShare = () => {
    // 🔥 THE SEO LINK (Landing Page)
    const slug = item.slug || rawCmd;
    const url = `${window.location.origin}/p/${encodeURIComponent(slug)}`;
    
    if (navigator.share) {
      navigator.share({ title: item.seoTitle || item.title, url, text: `Give this exam on MCQ Hub: ${item.title}` });
    } else {
      navigator.clipboard.writeText(url);
      alert("পরীক্ষার লিংক কপি হয়েছে!");
    }
  };

  const handleStartExamClick = () => {
    const liveParams = config?.liveEndTimeMs
      ? `&liveEnd=${config.liveEndTimeMs}&hideSolution=${Boolean(config.hideSolutionUntilLiveEnds)}`
      : "";

    if (config?.allowUserToChooseCount || config?.allowDifficultyFilter) {
      setShowCountModal(true);
    } else {
      onClose();
      router.push(
        `/exam/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}${liveParams}`
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
        <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-2">
              <h3 className="font-extrabold text-base md:text-lg text-white leading-snug line-clamp-2">
                <MathText text={item.title} />
              </h3>
              {item.subtitle && <p className="text-xs text-gray-400 mt-1">{item.subtitle}</p>}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 transition"
                title="শেয়ার করুন"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 text-[11px] font-bold text-gray-400">
            {isLive && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1 rounded-xl flex items-center gap-1">
                <Radio size={12} className="animate-pulse" /> লাইভ চলছে
              </span>
            )}
            {config?.durationMinutes ? (
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                সময়: {config.durationMinutes} মিনিট
              </span>
            ) : null}
            {item.questionCount ? (
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                প্রশ্ন: {item.questionCount} টি
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleStartExamClick}
              className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                isLive
                  ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
              }`}
            >
              <Play size={16} className={isLive ? "fill-white" : "fill-black"} />
              {isLive ? "লাইভ পরীক্ষায় অংশ নিন (START LIVE)" : "পরীক্ষা শুরু করুন (START EXAM)"}
            </button>

            <button
              onClick={() => {
                onClose();
                router.push(`/adaptive/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-pink-600/15 hover:bg-pink-600/25 border border-pink-500/40 text-pink-300 font-extrabold text-xs transition flex items-center justify-center gap-2"
            >
              <BrainCircuit size={16} /> 🚀 স্মার্ট প্র্যাকটিস (AI ADAPTIVE)
            </button>

            {config?.attachedNoteLink && (
              <button
                onClick={() => {
                  onClose();
                  router.push(
                    `/note/${encodeURIComponent(config.attachedNoteLink!)}?title=${encodeURIComponent(
                      item.title
                    )}&type=${config.attachedNoteType || "NOTE_PDF"}`
                  );
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs transition flex items-center justify-center gap-2"
              >
                <BookOpen size={16} /> এই অধ্যায়ের নোট পড়ুন (READ NOTE)
              </button>
            )}

            {item.routineHtml && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/page/${encodeURIComponent(item.id)}?title=${encodeURIComponent(item.title)}`);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Calendar size={16} /> রুটিন ও সিলেবাস দেখুন
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                router.push(`/leaderboard/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs transition flex items-center justify-center gap-2"
            >
              <Award size={16} /> এই পরীক্ষার মেধা তালিকা (LEADERBOARD)
            </button>
          </div>

        </div>
      </div>

      {showCountModal && (
        <QuestionCountModal
          examId={rawCmd}
          examTitle={item.title}
          defaultDuration={config?.durationMinutes || 20}
          allowDifficultyFilter={config?.allowDifficultyFilter || false}
          onClose={() => {
            setShowCountModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
};