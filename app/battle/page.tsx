"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllSearchableItems } from "@/lib/layoutService";
import { createBattleRoomApi, saveBattleSession } from "@/lib/battleClient";
import { useAuth } from "@/lib/useAuth";
import { ApiError } from "@/lib/apiClient";
import { BattleMode, DashboardItem } from "@/types";
import {
  ArrowLeft,
  Bolt,
  CheckCircle2,
  Circle,
  Gamepad2,
  Group,
  LogIn,
  Search,
  Sparkles,
  Timer,
  AlertCircle,
} from "lucide-react";

const PLAYER_PRESETS = [
  { count: 2, label: "২ (1v1)" },
  { count: 5, label: "৫ জন" },
  { count: 10, label: "১০ জন" },
  { count: 25, label: "২৫ জন" },
  { count: 50, label: "৫০ জন" },
  { count: 100, label: "১০০ জন" },
];

function BattleHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isPro, loading: authLoading } = useAuth();

  const prefilledExamId = (searchParams.get("examId") || "").trim();
  const prefilledTitle = (searchParams.get("title") || "").trim();

  const [joinCode, setJoinCode] = useState("");
  const [exams, setExams] = useState<DashboardItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>(
    prefilledExamId ? [prefilledExamId] : []
  );
  const [customTitle, setCustomTitle] = useState(prefilledTitle);

  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [posMark, setPosMark] = useState(10);
  const [negMark, setNegMark] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [mode, setMode] = useState<BattleMode>("RACE");
  const [allowGuests, setAllowGuests] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAllSearchableItems()
      .then((items) => {
        if (!active) return;
        const allowed = items.filter(
          (it) =>
            it.type === "EXAM_FIREBASE" &&
            !it.isHidden &&
            it.examConfig?.isBattleEnabled !== false &&
            Boolean(it.command || it.id)
        );
        setExams(allowed);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingExams(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleExams = exams.filter((it) => {
    if (it.visibilityCondition === "PREMIUM_ONLY" && !isPro) return false;
    if (it.visibilityCondition === "FREE_ONLY" && isPro) return false;
    if ((it.isPremium || it.examConfig?.isPremium) && !isPro) return false;
    if (searchQuery.trim()) {
      return it.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      setErrorMsg("সঠিক ৬-অক্ষরের রুম কোড লিখুন।");
      return;
    }
    router.push(`/battle/${encodeURIComponent(clean)}`);
  };

  const toggleExamSelection = (cmd: string, title: string) => {
    setErrorMsg(null);
    setSelectedIds((prev) => {
      const next = prev.includes(cmd) ? prev.filter((id) => id !== cmd) : [...prev, cmd];
      if (next.length === 1) {
        const match = exams.find((ex) => (ex.command || ex.id) === next[0]);
        setCustomTitle(match?.title || title);
      } else if (next.length > 1) {
        setCustomTitle("Group Challenge");
      } else {
        setCustomTitle("");
      }
      return next;
    });
  };

  const handleCreateRoom = async () => {
    setErrorMsg(null);
    if (!user) {
      router.push("/login");
      return;
    }
    if (selectedIds.length === 0) {
      setErrorMsg("কমপক্ষে একটি পরীক্ষা বা বিষয় নির্বাচন করুন।");
      return;
    }

    setCreating(true);
    try {
      const combinedExamId = selectedIds.join(",");
      const finalTitle =
        customTitle.trim() ||
        (selectedIds.length > 1 ? "Custom Group Battle" : "Group Battle");

      const res = await createBattleRoomApi({
        examId: combinedExamId,
        title: finalTitle,
        questionCount,
        timePerQuestion,
        posMark,
        negMark,
        maxPlayers,
        mode,
        allowGuests,
        showExplanation,
      });

      saveBattleSession(res.roomId, res.wsUrl, user.uid);
      router.push(`/battle/${encodeURIComponent(res.roomId)}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "রুম তৈরি করা যায়নি।");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-28 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-purple-300 flex items-center gap-2">
                <Gamepad2 size={20} className="text-purple-400" /> গ্রুপ ব্যাটল এরিনা (Group Battle)
              </h1>
              <p className="text-[11px] text-gray-400">
                Android ও Web বন্ধুদের সাথে ২ থেকে ১০০ জনে লাইভ খেলুন
              </p>
            </div>
          </div>
        </div>

        {/* Join Existing Room Card */}
        <form
          onSubmit={handleJoinByCode}
          className="bg-gradient-to-br from-purple-900/25 via-[#121218] to-cyan-900/15 border border-purple-500/35 rounded-3xl p-5 md:p-6 mb-6 shadow-2xl"
        >
          <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 block mb-1.5">
            রুম কোড আছে?
          </span>
          <h2 className="text-base md:text-lg font-black text-white mb-3">
            বন্ধুর গ্রুপ ব্যাটল রুমে যোগ দিন
          </h2>

          <div className="flex gap-2.5">
            <input
              type="text"
              maxLength={8}
              placeholder="যেমন: X7B9K2"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-4 py-3 text-sm md:text-base font-mono font-black tracking-widest uppercase text-cyan-300 focus:border-cyan-400 outline-none"
            />
            <button
              type="submit"
              data-card-surface="custom"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-5 md:px-6 py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20 flex-shrink-0"
            >
              যোগ দিন →
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/35 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Create New Group Battle */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles size={17} className="text-amber-400" /> নতুন গ্রুপ ব্যাটল রুম তৈরি করুন
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                যেকোনো ১ বা একাধিক অধ্যায় মিলিয়ে রুম বানান
              </p>
            </div>
            {!authLoading && !user && (
              <Link
                href="/login"
                data-card-surface="custom"
                className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-3.5 py-2 rounded-xl text-xs transition"
              >
                <LogIn size={14} /> লগইন
              </Link>
            )}
          </div>

          {prefilledExamId && (
            <div className="bg-purple-500/15 border border-purple-500/35 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-purple-300 block">নির্বাচিত বিষয়:</span>
                <span className="font-bold text-white">{prefilledTitle || prefilledExamId}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
              >
                বদলান
              </button>
            </div>
          )}

          {/* Game Mode */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-2">ব্যাটল মোড</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("RACE")}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  mode === "RACE"
                    ? "bg-cyan-500/15 border-cyan-500 text-white"
                    : "bg-white/5 border-white/5 text-gray-400 hover:border-white/15"
                }`}
              >
                <Bolt size={18} className={mode === "RACE" ? "text-cyan-400 mb-1" : "text-gray-500 mb-1"} />
                <div className="font-extrabold text-xs">Speed Race</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  লাইভ রেসিং ট্র্যাকে দ্রুতগতির প্রতিযোগিতা
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("SYNCED")}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  mode === "SYNCED"
                    ? "bg-purple-500/20 border-purple-500 text-white"
                    : "bg-white/5 border-white/5 text-gray-400 hover:border-white/15"
                }`}
              >
                <Timer
                  size={18}
                  className={mode === "SYNCED" ? "text-purple-400 mb-1" : "text-gray-500 mb-1"}
                />
                <div className="font-extrabold text-xs">Synced Quiz</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  ক্লাসরুম স্টাইল: সবাই একসাথে একই প্রশ্ন
                </div>
              </button>
            </div>
          </div>

          {/* Max Players */}
          <div>
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 mb-2">
              <Group size={15} className="text-amber-400" /> সর্বোচ্চ প্লেয়ার ({maxPlayers} জন)
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_PRESETS.map((preset) => (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => setMaxPlayers(preset.count)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    maxPlayers === preset.count
                      ? "bg-amber-400 text-black border-amber-400 font-black"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/25"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions, Time & Speed Marks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-bold block mb-1">প্রশ্ন সংখ্যা</label>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) || 10)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-cyan-400 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-bold block mb-1">সময়/প্রশ্ন (সে.)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value) || 15)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-bold block mb-1">সর্বোচ্চ (+Mark)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={posMark}
                onChange={(e) => setPosMark(Number(e.target.value) || 10)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-bold block mb-1">ভুল (-Mark)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={negMark}
                onChange={(e) => setNegMark(Number(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-red-400 outline-none focus:border-red-400"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 text-xs text-gray-300">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span>লগইন ছাড়াই Web Guest-দের জয়েনের অনুমতি</span>
              <input
                type="checkbox"
                checked={allowGuests}
                onChange={(e) => setAllowGuests(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span>প্রতিটি প্রশ্নের পর ব্যাখ্যা প্রদর্শন</span>
              <input
                type="checkbox"
                checked={showExplanation}
                onChange={(e) => setShowExplanation(e.target.checked)}
                className="accent-emerald-400 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Exam Picker */}
          <div className="pt-2 border-t border-white/5">
            <label className="text-xs font-bold text-gray-300 block mb-2">
              বিষয় / অধ্যায় নির্বাচন করুন ({selectedIds.length} টি সিলেক্টেড)
            </label>
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="পরীক্ষার নাম লিখে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            {loadingExams ? (
              <p className="text-xs text-gray-500 py-6 text-center animate-pulse">
                পরীক্ষার তালিকা লোড হচ্ছে...
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {visibleExams.map((item) => {
                  const cmd = item.command || item.id;
                  const isSelected = selectedIds.includes(cmd);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleExamSelection(cmd, item.title)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-2 text-xs transition ${
                        isSelected
                          ? "bg-purple-500/15 border-purple-500 text-purple-200 font-bold"
                          : "bg-white/5 border-white/5 text-gray-300 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                        ) : (
                          <Circle size={16} className="text-gray-600 flex-shrink-0" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.questionCount > 0 && (
                        <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                          {item.questionCount}Q
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={creating || selectedIds.length === 0}
            data-card-surface="custom"
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-45 text-white font-black py-4 rounded-2xl text-xs md:text-sm transition shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            <Gamepad2 size={18} />
            <span>
              {creating
                ? "রুম তৈরি হচ্ছে..."
                : user
                ? "গ্রুপ ব্যাটল রুম তৈরি করুন 🚀"
                : "রুম তৈরি করতে লগইন করুন"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BattleHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0E] text-white flex items-center justify-center text-xs">
          গ্রুপ ব্যাটল এরিনা লোড হচ্ছে...
        </div>
      }
    >
      <BattleHubContent />
    </Suspense>
  );
}