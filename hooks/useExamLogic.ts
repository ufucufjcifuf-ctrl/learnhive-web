"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Question } from "@/types";
import { saveExamHistory } from "@/lib/historyService";
import { enableExamAntiCheat } from "@/lib/antiCheat";
import { syncUserGlobalScore } from "@/lib/scoreService";
import { recordDailyActivity } from "@/lib/streakService";
import { sounds } from "@/lib/soundEffects";
import { shuffleArray } from "@/lib/utils";

export function useExamLogic(id: string) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const examTitle = searchParams.get("title") || "Online Model Test";
  const queryLimit = Number(searchParams.get("limit")) || -1;
  const queryDuration = Number(searchParams.get("duration")) || 0;
  const queryPos = searchParams.get("pos") ? Number(searchParams.get("pos")) : 1.0;
  const queryNeg = searchParams.get("neg") ? Number(searchParams.get("neg")) : 0.25;
  const queryShuffle = searchParams.get("shuffle") === "true";
  const queryDiff = searchParams.get("diff") || "ALL";

  const paramLiveEnd = searchParams.get("liveEnd") ? Number(searchParams.get("liveEnd")) : null;
  const paramHideSolution = searchParams.get("hideSolution") === "true";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [submitted, setSubmitted] = useState(false);

  const [liveEndTime, setLiveEndTime] = useState<number | null>(paramLiveEnd);
  const [hideSolutionUntilLiveEnds, setHideSolutionUntilLiveEnds] = useState<boolean>(paramHideSolution);

  const isSubmittingRef = useRef(false);
  const examStartTimeRef = useRef<number>(Date.now());
  const targetEndTimeRef = useRef<number>(Date.now() + 15 * 60 * 1000);
  const handleSubmitExamRef = useRef<() => void>(() => {});

  // ব্রাউজার অ্যান্টি-চিট (রাইট-ক্লিক ও কপি-কাট ব্লক)
  useEffect(() => {
    if (!submitted) {
      const cleanup = enableExamAntiCheat();
      return () => cleanup();
    }
  }, [submitted]);

  // লোকালস্টোরেজ থেকে বুকমার্ক লোড করা
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mcqhub_saved_questions_detail");
      if (stored) {
        try {
          const list: Question[] = JSON.parse(stored);
          const map: Record<string, boolean> = {};
          list.forEach((q) => { map[q.id] = true; });
          setBookmarks(map);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // এক্সামের প্রশ্নপত্র লোড করা
  useEffect(() => {
    async function fetchExam() {
      setLoading(true);
      try {
        const decodedId = decodeURIComponent(id);

        if (decodedId === "MISTAKE_REVISION") {
          const stored = sessionStorage.getItem("mcqhub_revision_questions");
          if (stored) {
            const list: Question[] = JSON.parse(stored);
            setQuestions(list);
            const totalSec = list.length * 60;
            setTimeLeft(totalSec);
            examStartTimeRef.current = Date.now();
            targetEndTimeRef.current = Date.now() + totalSec * 1000;
          }
          setLoading(false);
          return;
        }

        let loadedQuestions: Question[] = [];

        if (decodedId.startsWith("exam_")) {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          const docSnap = await getDoc(doc(db, "exams", decodedId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            loadedQuestions = data?.questions || [];
            if (data?.examConfig?.liveEndTimeMs) {
              setLiveEndTime(data.examConfig.liveEndTimeMs);
              setHideSolutionUntilLiveEnds(Boolean(data.examConfig.hideSolutionUntilLiveEnds));
            }
          }
        } else {
          const sheetParams = decodedId.split(",");
          for (const param of sheetParams) {
            const parts = param.trim().split("|LIMIT|");
            let pureSheetId = parts[0].trim();
            const chapterLimit = parts[1] ? Number(parts[1]) : null;
            let tab = "Sheet1";
            if (pureSheetId.includes(":")) {
              tab = pureSheetId.split(":")[1] || "Sheet1";
              pureSheetId = pureSheetId.split(":")[0];
            }
            const res = await fetch(
              `/api/sheet?sheetId=${encodeURIComponent(pureSheetId)}&tab=${encodeURIComponent(tab)}`
            );
            const json = await res.json();
            if (json.data && json.data.length > 0) {
              let fetched: Question[] = json.data;
              if (chapterLimit && chapterLimit > 0) {
                fetched = shuffleArray(fetched).slice(0, chapterLimit);
              }
              loadedQuestions = [...loadedQuestions, ...fetched];
            }
          }
        }

        if (loadedQuestions.length > 0) {
          if (queryDiff !== "ALL") {
            loadedQuestions = loadedQuestions.filter((q) => q.difficulty === queryDiff);
          }
          if (queryShuffle) {
            loadedQuestions = shuffleArray(loadedQuestions);
          }
          if (queryLimit > 0 && queryLimit < loadedQuestions.length) {
            loadedQuestions = loadedQuestions.slice(0, queryLimit);
          }
          setQuestions(loadedQuestions);

          if (typeof window !== "undefined") {
            // 🔥 ফিক্স: শুরু হওয়ার আসল সময় রিলোড দিলেও যেন অক্ষুণ্ণ থাকে
            const persistedStart = localStorage.getItem(`mcq_active_start_${decodedId}`);
            if (persistedStart) {
              examStartTimeRef.current = Number(persistedStart);
            } else {
              const now = Date.now();
              examStartTimeRef.current = now;
              localStorage.setItem(`mcq_active_start_${decodedId}`, String(now));
            }

            const savedEnd = localStorage.getItem(`mcq_active_end_${decodedId}`);
            const savedAnswers = localStorage.getItem(`mcq_active_answers_${decodedId}`);
            if (savedAnswers) {
              try { setAnswers(JSON.parse(savedAnswers)); } catch (e) {}
            }

            if (savedEnd) {
              const remaining = Math.max(0, Math.floor((Number(savedEnd) - Date.now()) / 1000));
              setTimeLeft(remaining);
              targetEndTimeRef.current = Number(savedEnd);
            } else {
              const totalSec = queryDuration > 0 ? queryDuration * 60 : loadedQuestions.length * 60;
              setTimeLeft(totalSec);
              const targetEnd = Date.now() + totalSec * 1000;
              targetEndTimeRef.current = targetEnd;
              localStorage.setItem(`mcq_active_end_${decodedId}`, String(targetEnd));
            }
          }
        } else {
          setFetchError("কোনো প্রশ্ন পাওয়া যায়নি। ইন্টারনেট সংযোগ ও শিট পারমিশন চেক করুন।");
        }
      } catch (e: any) {
        setFetchError(e.message || "Failed to load exam.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchExam();
  }, [id, queryDiff, queryShuffle, queryLimit, queryDuration]);

  // অপশন সিলেক্ট হ্যান্ডলার
  const handleSelectOption = useCallback(
    (qIdx: number, optIdx: number) => {
      sounds.playClick();
      setAnswers((prev) => {
        const updated = { ...prev, [qIdx]: optIdx };
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `mcq_active_answers_${decodeURIComponent(id)}`,
            JSON.stringify(updated)
          );
        }
        return updated;
      });
    },
    [id]
  );

  // ফ্ল্যাগ টগল
  const toggleFlag = useCallback((qIdx: number) => {
    sounds.playClick();
    setFlagged((p) => ({ ...p, [qIdx]: !p[qIdx] }));
  }, []);

  // বুকমার্ক টগল ও লোকাল স্টোরেজ সিঙ্ক
  const toggleBookmark = useCallback((q: Question) => {
    sounds.playClick();
    setBookmarks((prev) => {
      const isCurrentlySaved = Boolean(prev[q.id]);
      const updated = { ...prev, [q.id]: !isCurrentlySaved };

      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("mcqhub_saved_questions_detail");
          let savedList: Question[] = stored ? JSON.parse(stored) : [];

          if (!isCurrentlySaved) {
            if (!savedList.some((item) => item.id === q.id)) {
              savedList.push(q);
            }
          } else {
            savedList = savedList.filter((item) => item.id !== q.id);
          }

          localStorage.setItem("mcqhub_saved_questions_detail", JSON.stringify(savedList));
        } catch (e) {
          console.error("Bookmark Save Error:", e);
        }
      }

      return updated;
    });
  }, []);

  // স্কোর গণনা
  const calculateFinalScore = useCallback(() => {
    let correct = 0;
    let wrong = 0;
    let totalScore = 0;

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      const pos = q.customPositiveMark ?? queryPos;
      const neg = q.customNegativeMark ?? queryNeg;

      const correctAnswers =
        q.correctOptionIndices && q.correctOptionIndices.length > 0
          ? q.correctOptionIndices
          : q.correctOptionIndex !== -1
          ? [q.correctOptionIndex]
          : [];

      const isBonus = (q.options || []).length > 0 && correctAnswers.length === 0;

      if (isBonus) {
        correct++;
        totalScore += pos;
      } else if (selected !== undefined) {
        if (correctAnswers.includes(selected)) {
          correct++;
          totalScore += pos;
        } else {
          wrong++;
          totalScore -= neg;
        }
      }
    });

    return {
      correct,
      wrong,
      skipped: questions.length - (correct + wrong),
      score: totalScore,
      total: questions.length,
    };
  }, [questions, answers, queryPos, queryNeg]);

  // সাবমিট লজিক
  const handleSubmitExam = useCallback(() => {
    if (isSubmittingRef.current) return;

    // 🔥 ফিক্স: সঠিক শুরুর সময় দিয়ে অ্যান্টি-চিট ভ্যালিডেশন
    const timeSpentMs = Date.now() - examStartTimeRef.current;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount >= 5 && timeSpentMs < 5000) {
      alert("⚠️ Security Alert: অস্বাভাবিক গতি সনাক্ত হয়েছে! পরীক্ষাটি বাতিল করা হলো।");
      const decodedId = decodeURIComponent(id);
      localStorage.removeItem(`mcq_active_start_${decodedId}`);
      localStorage.removeItem(`mcq_active_end_${decodedId}`);
      localStorage.removeItem(`mcq_active_answers_${decodedId}`);
      router.push("/");
      return;
    }

    isSubmittingRef.current = true;
    setSubmitted(true);

    if (typeof window !== "undefined") {
      const decodedId = decodeURIComponent(id);
      localStorage.removeItem(`mcq_active_start_${decodedId}`);
      localStorage.removeItem(`mcq_active_end_${decodedId}`);
      localStorage.removeItem(`mcq_active_answers_${decodedId}`);

      const res = calculateFinalScore();
      const globalXP = res.correct * 1.0 - res.wrong * 0.25;

      saveExamHistory({
        examId: decodedId,
        examTitle,
        score: res.score,
        totalQuestions: res.total,
        correctAnswers: res.correct,
        wrongAnswers: res.wrong,
        skippedAnswers: res.skipped,
        timestamp: Date.now(),
      });

      syncUserGlobalScore(res.score);
      recordDailyActivity();

      const safeLiveEndTime = liveEndTime ? liveEndTime + 300_000 : null;

      const reviewPayload = {
        questions,
        answers,
        ...res,
        globalXP,
        liveEndTime: safeLiveEndTime,
        hideSolutionUntilLiveEnds,
      };

      sessionStorage.setItem(`mcqhub_review_${id}`, JSON.stringify(reviewPayload));
      localStorage.setItem(`mcqhub_persisted_review_${decodedId}`, JSON.stringify(reviewPayload));

      router.replace(
        `/result?id=${encodeURIComponent(id)}&title=${encodeURIComponent(
          examTitle
        )}&score=${res.score.toFixed(2)}&correct=${res.correct}&wrong=${res.wrong}&skipped=${
          res.skipped
        }&total=${res.total}&xp=${globalXP.toFixed(2)}`
      );
    }
  }, [
    id,
    examTitle,
    questions,
    answers,
    liveEndTime,
    hideSolutionUntilLiveEnds,
    calculateFinalScore,
    router,
  ]);

  // রেফ আপডেট (টাইমার যাতে answers পরিবর্তনের কারণে বারবার রিস্টার্ট না হয়)
  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  // 🔥 ফিক্সড টাইমার ইন্টারভাল (জিরো জিটার ও স্মুথ এক্সিকিউশন)
  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmitExamRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, submitted, questions.length]);

  return {
    questions,
    loading,
    fetchError,
    answers,
    flagged,
    bookmarks,
    timeLeft,
    submitted,
    examTitle,
    liveEndTime,
    hideSolutionUntilLiveEnds,
    handleSelectOption,
    toggleFlag,
    toggleBookmark,
    handleSubmitExam,
    calculateFinalScore,
  };
}