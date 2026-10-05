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
  const examStartTimeRef = useRef<number>(Date.now()); // 🔥 Anti-Cheat Timer

  // Anti-Cheat Events
  useEffect(() => {
    if (!submitted) {
      const cleanup = enableExamAntiCheat();
      return () => cleanup();
    }
  }, [submitted]);

  // Load Bookmarks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mcqhub_saved_questions_detail");
      if (stored) {
        try {
          const list: Question[] = JSON.parse(stored);
          const map: Record<string, boolean> = {};
          list.forEach((q) => { map[q.id] = true; });
          setBookmarks(map);
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  // Fetch Exam Data
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
            setTimeLeft(list.length * 60);
            examStartTimeRef.current = Date.now(); // Start timer tracking
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
            const res = await fetch(`/api/sheet?sheetId=${encodeURIComponent(pureSheetId)}&tab=${encodeURIComponent(tab)}`);
            const json = await res.json();
            if (json.data && json.data.length > 0) {
              let fetched: Question[] = json.data;
              if (chapterLimit && chapterLimit > 0) fetched = shuffleArray(fetched).slice(0, chapterLimit);
              loadedQuestions = [...loadedQuestions, ...fetched];
            }
          }
        }

        if (loadedQuestions.length > 0) {
          if (queryDiff !== "ALL") loadedQuestions = loadedQuestions.filter((q) => q.difficulty === queryDiff);
          if (queryShuffle) loadedQuestions = shuffleArray(loadedQuestions);
          if (queryLimit > 0 && queryLimit < loadedQuestions.length) loadedQuestions = loadedQuestions.slice(0, queryLimit);
          setQuestions(loadedQuestions);

          examStartTimeRef.current = Date.now(); // Start timer tracking

          if (typeof window !== "undefined") {
            const savedEnd = localStorage.getItem(`mcq_active_end_${decodedId}`);
            const savedAnswers = localStorage.getItem(`mcq_active_answers_${decodedId}`);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

            if (savedEnd) {
              const remaining = Math.floor((Number(savedEnd) - Date.now()) / 1000);
              if (remaining > 0) setTimeLeft(remaining);
              else { setTimeLeft(0); handleSubmitExam(); }
            } else {
              const totalSec = queryDuration > 0 ? queryDuration * 60 : loadedQuestions.length * 60;
              setTimeLeft(totalSec);
              localStorage.setItem(`mcq_active_end_${decodedId}`, String(Date.now() + totalSec * 1000));
            }
          }
        } else setFetchError("কোনো প্রশ্ন পাওয়া যায়নি।");
      } catch (e: any) { setFetchError(e.message || "Failed to load."); } 
      finally { setLoading(false); }
    }
    if (id) fetchExam();
  }, [id]);

  // Timer Engine
  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); setTimeout(() => handleSubmitExam(), 0); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, questions.length]);

  const handleSelectOption = useCallback((qIdx: number, optIdx: number) => {
    sounds.playClick();
    setAnswers((prev) => {
      const updated = { ...prev, [qIdx]: optIdx };
      if (typeof window !== "undefined") localStorage.setItem(`mcq_active_answers_${decodeURIComponent(id)}`, JSON.stringify(updated));
      return updated;
    });
  }, [id]);

  const toggleFlag = useCallback((qIdx: number) => { sounds.playClick(); setFlagged((p) => ({ ...p, [qIdx]: !p[qIdx] })); }, []);

  const calculateFinalScore = useCallback(() => {
    let correct = 0, wrong = 0, totalScore = 0;
    questions.forEach((q, idx) => {
      const selected = answers[idx];
      const pos = q.customPositiveMark ?? queryPos;
      const neg = q.customNegativeMark ?? queryNeg;
      const correctAnswers = q.correctOptionIndices?.length > 0 ? q.correctOptionIndices : q.correctOptionIndex !== -1 ? [q.correctOptionIndex] : [];
      const isBonus = q.options.length > 0 && correctAnswers.length === 0;

      if (isBonus) { correct++; totalScore += pos; } 
      else if (selected !== undefined) {
        if (correctAnswers.includes(selected)) { correct++; totalScore += pos; } 
        else { wrong++; totalScore -= neg; }
      }
    });
    return { correct, wrong, skipped: questions.length - (correct + wrong), score: totalScore, total: questions.length };
  }, [questions, answers, queryPos, queryNeg]);

  const handleSubmitExam = useCallback(() => {
    if (isSubmittingRef.current) return;

    // 🔥 Server & Client Unified Anti-Cheat Logic (Pro-Tip Applied)
    const timeSpentMs = Date.now() - examStartTimeRef.current;
    const answeredCount = Object.keys(answers).length;
    const totalDurationMs = queryDuration > 0 ? queryDuration * 60 * 1000 : questions.length * 60 * 1000;
    const isJustStarted = (timeLeft * 1000) >= totalDurationMs - 10000; // Only blocks if done in first 10 seconds

    if (isJustStarted && answeredCount >= 5 && timeSpentMs < 5000) {
      alert("⚠️ Security Alert: অস্বাভাবিক গতি সনাক্ত হয়েছে! পরীক্ষাটি বাতিল করা হলো।");
      router.push("/");
      return;
    }

    isSubmittingRef.current = true;
    setSubmitted(true);
    
    if (typeof window !== "undefined") {
      const decodedId = decodeURIComponent(id);
      localStorage.removeItem(`mcq_active_end_${decodedId}`);
      localStorage.removeItem(`mcq_active_answers_${decodedId}`);
      const res = calculateFinalScore();

      saveExamHistory({
        examId: decodedId, examTitle, score: res.score, totalQuestions: res.total,
        correctAnswers: res.correct, wrongAnswers: res.wrong, skippedAnswers: res.skipped, timestamp: Date.now(),
      });
      syncUserGlobalScore(res.score);
      recordDailyActivity();
      if (res.total > 0 && res.score / res.total >= 0.5) sounds.playCelebrate();

      sessionStorage.setItem(`mcqhub_review_${id}`, JSON.stringify({ questions, answers, ...res, liveEndTime, hideSolutionUntilLiveEnds }));
    }
  }, [id, examTitle, questions, answers, liveEndTime, hideSolutionUntilLiveEnds, calculateFinalScore, timeLeft, queryDuration, router]);

  return {
    questions, loading, fetchError, answers, flagged, bookmarks, timeLeft, submitted,
    examTitle, liveEndTime, hideSolutionUntilLiveEnds,
    handleSelectOption, toggleFlag, setBookmarks, handleSubmitExam, calculateFinalScore
  };
}