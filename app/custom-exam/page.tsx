"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCachedHomeLayout } from "@/lib/layoutService";
import { DashboardItem } from "@/types";
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle2,
  Circle,
  Bookmark,
  Trash2,
  Sliders,
  Shuffle,
  Zap,
} from "lucide-react";

interface CustomPreset {
  id: string;
  name: string;
  selectedIds: string[];
  questionCount: number;
  durationMin: number;
  posMark: number;
  negMark: number;
}

export default function CustomExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<DashboardItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(25);
  const [durationMin, setDurationMin] = useState(20);

  // মার্কিং স্কিম
  const [markingScheme, setMarkingScheme] = useState<"STANDARD" | "BCS" | "CUSTOM">("STANDARD");
  const [posMark, setPosMark] = useState(1.0);
  const [negMark, setNegMark] = useState(0.25);

  // মোড টগল
  const [isShuffle, setIsShuffle] = useState(true);
  const [isPractice, setIsPractice] = useState(false);

  // সেভ করা প্রিসেট সমূহ
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showPresetModal, setShowPresetModal] = useState(false);

  useEffect(() => {
    getCachedHomeLayout().then((items) => {
      setExams(items.filter((it) => it.type === "EXAM_FIREBASE"));
    });

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mcqhub_custom_presets");
      if (saved) setPresets(JSON.parse(saved));
    }
  }, []);

  const toggleSelect = (cmd: string) => {
    setSelectedIds((prev) =>
      prev.includes(cmd) ? prev.filter((id) => id !== cmd) : [...prev, cmd]
    );
  };

  const handleSchemeChange = (scheme: "STANDARD" | "BCS" | "CUSTOM") => {
    setMarkingScheme(scheme);
    if (scheme === "STANDARD") {
      setPosMark(1.0);
      setNegMark(0.25);
    } else if (scheme === "BCS") {
      setPosMark(1.0);
      setNegMark(0.5);
    }
  };

  const saveCurrentPreset = () => {
    if (!presetName.trim() || selectedIds.length === 0) return;
    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      selectedIds,
      questionCount,
      durationMin,
      posMark,
      negMark,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("mcqhub_custom_presets", JSON.stringify(updated));
    }
    setPresetName("");
    setShowPresetModal(false);
  };

  const applyPreset = (p: CustomPreset) => {
    setSelectedIds(p.selectedIds);
    setQuestionCount(p.questionCount);
    setDurationMin(p.durationMin);
    setPosMark(p.posMark);
    setNegMark(p.negMark);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("mcqhub_custom_presets", JSON.stringify(updated));
    }
  };

  const handleStartExam = () => {
    if (selectedIds.length === 0) {
      alert("কমপক্ষে একটি অধ্যায় বা পরীক্ষা নির্বাচন করুন!");
      return;
    }
    const combinedId = selectedIds.join(",");
    router.push(
      `/exam/${encodeURIComponent(combinedId)}?title=Custom+Challenge&limit=${questionCount}&duration=${durationMin}&pos=${posMark}&neg=${negMark}&shuffle=${isShuffle}`
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl flex flex-col pb-28">
        
        {/* হেডার */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-extrabold text-base md:text-lg">কাস্টম এক্সাম মেকার (Custom Setup)</h1>
              <p className="text-[11px] text-gray-400">একাধিক বিষয় মিলিয়ে নিজের মডেল টেস্ট তৈরি করুন</p>
            </div>
          </div>

          <button
            onClick={() => setShowPresetModal(true)}
            disabled={selectedIds.length === 0}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl disabled:opacity-40"
          >
            + প্রিসেট সেভ করুন
          </button>
        </div>

        {/* সেভ করা প্রিসেট তালিকা */}
        {presets.length > 0 && (
          <div className="mb-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">
              আমার সেভ করা রুটিন প্রিসেট
            </span>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#121218] border border-white/10 p-2.5 rounded-2xl flex items-center gap-2 flex-shrink-0"
                >
                  <span onClick={() => applyPreset(p)} className="text-xs font-bold text-gray-200 cursor-pointer hover:text-cyan-400">
                    {p.name}
                  </span>
                  <button onClick={() => deletePreset(p.id)} className="text-gray-500 hover:text-red-400 p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* এক্সাম কনফিগারেশন বক্স */}
        <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 mb-6 shadow-xl flex flex-col gap-4">
          <h3 className="font-bold text-sm text-cyan-400">পরীক্ষার সেটিংস</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">মোট প্রশ্ন সংখ্যা</label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-cyan-400 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">সময় (মিনিট)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-amber-400 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* মার্কিং স্কিম নির্বাচন */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-2">নেগেটিভ মার্কিং স্কিম</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSchemeChange("STANDARD")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  markingScheme === "STANDARD"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-white/5 border-white/5 text-gray-400"
                }`}
              >
                স্ট্যান্ডার্ড (+১ / -০.২৫)
              </button>
              <button
                type="button"
                onClick={() => handleSchemeChange("BCS")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  markingScheme === "BCS"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-white/5 border-white/5 text-gray-400"
                }`}
              >
                বিসিএস (+১ / -০.৫০)
              </button>
              <button
                type="button"
                onClick={() => handleSchemeChange("CUSTOM")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  markingScheme === "CUSTOM"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-white/5 border-white/5 text-gray-400"
                }`}
              >
                কাস্টম মার্ক
              </button>
            </div>
          </div>

          {/* কাস্টম মার্ক ইনপুট */}
          {markingScheme === "CUSTOM" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">সঠিক উত্তরের মান (+Mark)</label>
                <input
                  type="number"
                  step="0.1"
                  value={posMark}
                  onChange={(e) => setPosMark(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">ভুল উত্তরের কর্তন (-Mark)</label>
                <input
                  type="number"
                  step="0.05"
                  value={negMark}
                  onChange={(e) => setNegMark(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-red-400"
                />
              </div>
            </div>
          )}

          {/* অপশন টগল */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-300">
            <span className="flex items-center gap-2">
              <Shuffle size={14} className="text-cyan-400" /> প্রশ্নগুলো এলোমেলো (Shuffle) করুন
            </span>
            <input
              type="checkbox"
              checked={isShuffle}
              onChange={(e) => setIsShuffle(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* বিষয় নির্বাচন */}
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          অধ্যায় / বিষয় নির্বাচন করুন ({selectedIds.length} টি সিলেক্টেড)
        </h3>

        <div className="flex flex-col gap-2.5">
          {exams.map((item) => {
            const isSelected = selectedIds.includes(item.command || item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.command || item.id)}
                className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                  isSelected
                    ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/5"
                    : "bg-[#121218] border-white/5 text-gray-300 hover:border-white/15"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <CheckCircle2 size={18} className="text-cyan-400" />
                  ) : (
                    <Circle size={18} className="text-gray-600" />
                  )}
                  <span className="font-bold text-sm">{item.title}</span>
                </div>
                {item.examConfig?.durationMinutes && (
                  <span className="text-[10px] text-gray-500 font-mono">{item.examConfig.durationMinutes}m</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ফিক্সড বটম স্টার্ট বাটন */}
        <div className="fixed bottom-6 left-0 right-0 max-w-2xl mx-auto px-4 z-40">
          <button
            onClick={handleStartExam}
            disabled={selectedIds.length === 0}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black py-4 rounded-2xl text-sm transition shadow-2xl shadow-cyan-500/30 flex items-center justify-center gap-2"
          >
            <Play size={18} className="fill-black" /> পরীক্ষা শুরু করুন ({selectedIds.length} বিষয়)
          </button>
        </div>

      </div>

      {/* প্রিসেট সেভ মডাল */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
            <h3 className="text-base font-black text-white mb-2">এই রুটিনটি সেভ করুন</h3>
            <p className="text-xs text-gray-400 mb-4">পরবর্তীতে ১ ক্লিকে এই একই বিষয়ের পরীক্ষা দিতে পারবেন।</p>
            <input
              type="text"
              placeholder="রুটিনের নাম (যেমন: Physics Weekly)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-amber-400 outline-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPresetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={saveCurrentPreset}
                disabled={!presetName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-black"
              >
                সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}