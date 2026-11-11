"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Question } from "@/types";
import { recordDailyActivity } from "@/lib/streakService";
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
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const [meritList, setMeritList] = useState<MeritItem[]>([]);
  const [loadingMerit, setLoadingMerit] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    async function loadBatchQuestions() {
      if (!id) return;
      setLoadingQuestions(true);

      try {
        const baseExamId = id.includes("_batch_") ? id.substring(0, id.indexOf("_batch_")) : id;

        if (baseExamId.startsWith("exam_")) {
          const { doc, getDoc } = await import("firebase/firestore");
          const snap = await getDoc(doc(db, "exams", baseExamId));
          if (snap.exists()) {
            const list = snap.data()?.questions || [];
            setQuestions(list);
            const duration = list.length * 60;
            setTimeLeft(duration);
            setTotalDuration(duration);
          }
        } else {
          let sheetId = baseExamId;
          let tab = "Sheet1";
          if (baseExamId.includes(":")) {
            sheetId = baseExamId.split(":")[0];
            tab = baseExamId.split(":")[1] || "Sheet1";
          }
          const res = await fetch(`/api/sheet?sheetId=${encodeURIComponent(sheetId)}&tab=${encodeURIComponent(tab)}`);
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setQuestions(json.data);
            const duration = json.data.length * 60;
            setTimeLeft(duration);
            setTotalDuration(duration);
          }
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

  useEffect(() => {
    if (!joined || submitted || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => handleSubmitExam(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joined, submitted, questions.length]);

  const loadMeritList = useCallback(async () => {
    setLoadingMerit(true);
    try {
      const q = query(collection(db, "exam_results"), where("examId", "==", id));
      const snap = await getDocs(q);
      const list: MeritItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          name: data.userName || data.studentName || "Unknown",
          roll: data.roll || "N/A",
          score: Number(data.score) || 0,
          timeTakenSec: Number(data.timeTakenSec) || 0,
        });
      });

      list.sort((a, b) => b.score - a.score || a.timeTakenSec - b.timeTakenSec);
      setMeritList(list);
    } catch (e) {
      console.error("Merit list error:", e);
    } finally {
      setLoadingMerit(false);
    }
  }, [id]);

  const handleSubmitExam = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setSubmitted(true);

    let correct = 0;
    let wrong = 0;
    let score = 0;

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      const pos = q.customPositiveMark ?? 1.0;
      const neg = q.customNegativeMark ?? 0.25;

      const correctAnswers =
        q.correctOptionIndices && q.correctOptionIndices.length > 0
          ? q.correctOptionIndices
          : q.correctOptionIndex !== -1
          ? [q.correctOptionIndex]
          : [];

      const isBonus = q.options.length > 0 && correctAnswers.length === 0;

      if (isBonus) {
        correct++;
        score += pos;
      } else if (selected !== undefined) {
        if (correctAnswers.includes(selected)) {
          correct++;
          score += pos;
        } else {
          wrong++;
          score -= neg;
        }
      }
    });

    setFinalScore(score);
    const timeSpent = totalDuration - timeLeft;

    recordDailyActivity();

    try {
      const currentUser = auth.currentUser;
      // 🔥 ফায়ারস্টোর স্কিমা ঠিক করা হলো (userName, isLiveAttempt, totalQuestions নিশ্চিত করা হয়েছে)
      await addDoc(collection(db, "exam_results"), {
        examId: id,
        userId: currentUser?.uid || `guest_${Date.now()}`,
        userName: name.trim(),
        studentName: name.trim(),
        userPhoto: currentUser?.photoURL || "",
        roll: roll.trim(),
        score: score,
        totalQuestions: questions.length,
        isLiveAttempt: true,
        timeTakenSec: timeSpent,
        timestamp: Date.now(),
      });
      loadMeritList();
    } catch (e) {
      console.error("Result save failed:", e);
    }
  }, [id, name, roll, questions, answers, totalDuration, timeLeft, loadMeritList]);

  const exportToCSV = () => {
    let csv = "Rank,Student Name,Roll / Phone,Score,Time (Seconds)\n";
    meritList.forEach((m, idx) => {
      csv += `${idx + 1},"${m.name}","${m.roll}",${m.score},${m.timeTakenSec}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Merit_List_${id}.csv`);
    document.body.appendChild(link);
    link.click();
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
          onJoin={() => setJoined(true)}
        />
      ) : !submitted ? (
        <div className="w-full max-w-4xl flex flex-col items-center pb-24">
          <header className="w-full max-w-4xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
            <div>
              <h2 className="font-extrabold text-sm md:text-base text-white">{name} ({roll})</h2>
              <p className="text-[11px] text-gray-400">{examTitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-xs border ${
                  timeLeft < 180 ? "bg-red-500/10 border-red-500 text-red-400 animate-pulse" : "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                }`}
              >
                <Clock size={14} />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </div>

              <button
                type="button"
                onClick={handleSubmitExam}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-emerald-500/20 shadow-lg"
              >
                খাতা জমা
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
                onSelect={(_, optIdx) => setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }))}
                onToggleFlag={() => {}}
                onToggleBookmark={() => {}}
                onReport={() => {}}
              />

              <div className="flex justify-between items-center bg-[#121218] border border-white/5 rounded-2xl p-4 shadow-xl">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((p) => p - 1)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 px-3 py-2 rounded-xl hover:bg-white/5"
                >
                  <ArrowLeft size={16} /> আগের প্রশ্ন
                </button>
                <button
                  type="button"
                  disabled={currentIdx === questions.length - 1}
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
    </div>
  );
}