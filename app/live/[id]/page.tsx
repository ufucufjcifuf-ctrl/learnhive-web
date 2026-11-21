"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ExamConfig, LeaderboardEntry, PublicQuestion, Question } from "@/types";
import { recordDailyActivity } from "@/lib/streakService";
import { apiFetch } from "@/lib/apiClient";
import { ExamQuestionCard } from "@/components/exam/ExamQuestionCard";
import { LiveJoinCard } from "@/components/live/LiveJoinCard";
import { LiveMeritTable, MeritItem } from "@/components/live/LiveMeritTable";
import { Clock, ArrowRight, ArrowLeft } from "lucide-react";

export default function BatchLiveExamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const examTitle = searchParams.get("title") || "Live Batch Exam";

  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [totalDuration, setTotalDuration] = useState(15 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const [meritList, setMeritList] = useState<MeritItem[]>([]);
  const [loadingMerit, setLoadingMerit] = useState(false);
  const isSubmittingRef = useRef(false);
  const examStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    async function loadBatchQuestions() {
      if (!id) return;
      setLoadingQuestions(true);

      try {
        const res = await apiFetch<{
          success: boolean;
          config?: Partial<ExamConfig>;
          questions: PublicQuestion[];
        }>(`/api/exam/questions?id=${encodeURIComponent(id)}`, {
          withOptionalAuth: true,
        });

        const list: Question[] = (res.questions || []).map((pq) => ({
          ...pq,
          correctOptionIndex: -1,
          correctOptionIndices: [],
          explanation: "",
        }));

        if (list.length > 0) {
          setQuestions(list);
          const cfgMin = res.config?.durationMinutes || 0;
          const duration = cfgMin > 0 ? cfgMin * 60 : list.length * 60;
          setTimeLeft(duration);
          setTotalDuration(duration);
        }
      } catch (err) {
        console.error("Batch exam load failed:", err);
      } finally {
        setLoadingQuestions(false);
      }
    }

    loadBatchQuestions();
  }, [id]);

  useEffect(() => {
    if (!joined || submitted) return;

    const handleVisibility = () => {
      if (document.hidden) {
        alert("⚠️ সতর্কতা: পরীক্ষার ট্যাব ছেড়ে অন্য ট্যাবে যাওয়া নিষিদ্ধ!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [joined, submitted]);

  const loadMeritList = useCallback(async () => {
    setLoadingMerit(true);
    try {
      const res = await apiFetch<{ success: boolean; topList: LeaderboardEntry[] }>(
        `/api/leaderboard?examId=${encodeURIComponent(id)}&mode=LIVE_ONLY`,
        { cache: "no-store" }
      );
      const list: MeritItem[] = (res.topList || []).map((entry) => ({
        name: entry.name || "Unknown",
        roll: entry.roll || "N/A",
        score: Number(entry.score) || 0,
        timeTakenSec: Number(entry.timeTakenSec) || 0,
      }));
      setMeritList(list);
    } catch (e) {
      console.error("Merit list error:", e);
    } finally {
      setLoadingMerit(false);
    }
  }, [id]);

  const handleSubmitExam = useCallback(
    async (fromTimer = false) => {
      if (isSubmittingRef.current || questions.length === 0) return;

      const answeredCount = Object.keys(answers).length;
      const elapsedMs = Date.now() - examStartTimeRef.current;
      if (!fromTimer && answeredCount >= 5 && elapsedMs < 5000) {
        alert("⚠️ Security Alert: অস্বাভাবিক দ্রুত উত্তর প্রদানের কারণে পরীক্ষা বাতিল হয়েছে!");
        router.push("/");
        return;
      }

      isSubmittingRef.current = true;
      setSubmitting(true);

      const timeSpent = Math.max(1, totalDuration - timeLeft);

      try {
        const submitRes = await apiFetch<{ success: boolean; score: number }>("/api/exam/submit", {
          method: "POST",
          withOptionalAuth: true,
          body: {
            examId: id,
            examTitle,
            studentName: name.trim(),
            roll: roll.trim(),
            questionIds: questions.map((q) => q.id),
            answers,
            timeTakenSec: timeSpent,
          },
        });
        setFinalScore(submitRes.score);
        setSubmitted(true);
        setSubmitting(false);
        recordDailyActivity();
        await loadMeritList();
      } catch (e) {
        console.error("Batch result save failed:", e);
        alert(
          e instanceof Error
            ? e.message
            : "নেটওয়ার্ক সমস্যার কারণে খাতা জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
        );
        isSubmittingRef.current = false;
        setSubmitting(false);
      }
    },
    [id, examTitle, name, roll, questions, answers, totalDuration, timeLeft, loadMeritList, router]
  );

  useEffect(() => {
    if (!joined || submitted || submitting || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => handleSubmitExam(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joined, submitted, submitting, questions.length, handleSubmitExam]);

  const exportToCSV = () => {
    let csv = "Rank,Student Name,Roll / Phone,Score,Time (Seconds)\n";
    meritList.forEach((m, idx) => {
      const safeName = String(m.name || "").replace(/"/g, '""');
      const safeRoll = String(m.roll || "").replace(/"/g, '""');
      csv += `${idx + 1},"${safeName}","${safeRoll}",${m.score},${m.timeTakenSec}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Merit_List_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      {!joined ? (
        <LiveJoinCard
          examTitle={examTitle}
          name={name}
          setName={setName}
          roll={roll}
          setRoll={setRoll}
          totalQuestions={questions.length}
          totalDurationMin={Math.floor(totalDuration / 60)}
          loadingQuestions={loadingQuestions}
          onJoin={() => {
            examStartTimeRef.current = Date.now();
            setJoined(true);
          }}
        />
      ) : !submitted ? (
        <div className="w-full max-w-4xl flex flex-col items-center pb-24">
          <header className="w-full max-w-4xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
            <div>
              <h2 className="font-extrabold text-sm md:text-base text-white">
                {name} ({roll})
              </h2>
              <p className="text-[11px] text-gray-400">{examTitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-xs border ${
                  timeLeft < 180
                    ? "bg-red-500/10 border-red-500 text-red-400 animate-pulse"
                    : "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                }`}
              >
                <Clock size={14} />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(false)}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-emerald-500/20 shadow-lg"
              >
                {submitting ? "জমা হচ্ছে..." : "খাতা জমা"}
              </button>
            </div>
          </header>

          {questions.length > 0 && (
            <main className="w-full px-4 py-6 flex flex-col gap-6">
              <ExamQuestionCard
                index={currentIdx}
                question={questions[currentIdx]}
                selectedOption={answers[currentIdx]}
                isFlagged={false}
                isBookmarked={false}
                submitted={false}
                onSelect={(_, optIdx) => !submitting && setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }))}
                onToggleFlag={() => {}}
                onToggleBookmark={() => {}}
                onReport={() => {}}
              />

              <div className="flex justify-between items-center bg-[#121218] border border-white/5 rounded-2xl p-4 shadow-xl">
                <button
                  type="button"
                  disabled={currentIdx === 0 || submitting}
                  onClick={() => setCurrentIdx((p) => p - 1)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 px-3 py-2 rounded-xl hover:bg-white/5"
                >
                  <ArrowLeft size={16} /> আগের প্রশ্ন
                </button>
                <button
                  type="button"
                  disabled={currentIdx === questions.length - 1 || submitting}
                  onClick={() => setCurrentIdx((p) => p + 1)}
                  className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-30 px-3 py-2 rounded-xl hover:bg-white/5"
                >
                  পরের প্রশ্ন <ArrowRight size={16} />
                </button>
              </div>
            </main>
          )}
        </div>
      ) : (
        <LiveMeritTable
          examTitle={examTitle}
          name={name}
          roll={roll}
          finalScore={finalScore}
          meritList={meritList}
          loadingMerit={loadingMerit}
          onExportCSV={exportToCSV}
          onGoHome={() => router.push("/")}
        />
      )}

      {submitting && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
          <div className="w-11 h-11 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-extrabold text-emerald-300">উত্তরপত্র মূল্যায়ন করা হচ্ছে...</p>
        </div>
      )}
    </div>
  );
}