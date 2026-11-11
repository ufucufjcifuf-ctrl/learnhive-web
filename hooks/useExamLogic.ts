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
import { findItemDeeply } from "@/lib/layoutService";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export function useExamLogic(id: string) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryTitle = searchParams.get("title");
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
  const [examTitle, setExamTitle] = useState<string>(queryTitle || "Online Model Test");

  const [canonicalExamId, setCanonicalExamId] = useState<string>(decodeURIComponent(id).trim());

  const [liveEndTime, setLiveEndTime] = useState<number | null>(paramLiveEnd);
  const [hideSolutionUntilLiveEnds, setHideSolutionUntilLiveEnds] = useState<boolean>(paramHideSolution);

  const isSubmittingRef = useRef(false);
  const targetEndTimeRef = useRef<number>(Date.now() + 15 * 60 * 1000);
  const handleSubmitExamRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!submitted) {
      const cleanup = enableExamAntiCheat();
      return () => cleanup();
    }
  }, [submitted]);

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

  useEffect(() => {
    async function fetchExam() {
      setLoading(true);
      try {
        let decodedId = decodeURIComponent(id).trim();

        if (decodedId === "MISTAKE_REVISION") {
          const stored = sessionStorage.getItem("mcqhub_revision_questions");
          if (stored) {
            const list: Question[] = JSON.parse(stored);
            setQuestions(list);
            const totalSec = list.length * 60;
            setTimeLeft(totalSec);
            targetEndTimeRef.current = Date.now() + totalSec * 1000;
          }
          setLoading(false);
          return;
        }

        let actualCommand = decodedId;
        let configDuration: number = queryDuration;

        if (!decodedId.startsWith("exam_") && !decodedId.includes(":") && !decodedId.includes(",")) {
          const matchedItem = await findItemDeeply(decodedId);
          if (matchedItem) {
            actualCommand = matchedItem.command || matchedItem.id;
            setCanonicalExamId(actualCommand);
            if (!queryTitle) setExamTitle(matchedItem.title);
            if (configDuration <= 0 && matchedItem.examConfig?.durationMinutes) {
              configDuration = matchedItem.examConfig.durationMinutes;
            }
          }
        } else {
          setCanonicalExamId(actualCommand);
        }

        let loadedQuestions: Question[] = [];

        if (actualCommand.startsWith("exam_")) {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db: fireDb } = await import("@/lib/firebase");
          const docSnap = await getDoc(doc(fireDb, "exams", actualCommand));
          if (docSnap.exists()) {
            const data = docSnap.data();
            loadedQuestions = data?.questions || [];
            if (data?.title && !queryTitle) {
              setExamTitle(data.title);
            }
            if (data?.examConfig?.liveEndTimeMs) {
              setLiveEndTime(data.examConfig.liveEndTimeMs);
              setHideSolutionUntilLiveEnds(Boolean(data.examConfig.hideSolutionUntilLiveEnds));
            }
            if (configDuration <= 0 && data?.examConfig?.durationMinutes) {
              configDuration = Number(data.examConfig.durationMinutes);
            }
          }
        } else {
          const sheetParams = actualCommand.split(",");
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
              const totalSec = configDuration > 0 ? configDuration * 60 : loadedQuestions.length * 60;
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
  }, [id, queryTitle, queryDiff, queryShuffle, queryLimit, queryDuration]);

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

  const toggleFlag = useCallback((qIdx: number) => {
    sounds.playClick();
    setFlagged((p) => ({ ...p, [qIdx]: !p[qIdx] }));
  }, []);

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

  const handleSubmitExam = useCallback(async () => {
    if (isSubmittingRef.current) return;

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
        examId: canonicalExamId,
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
      const isLiveAttempt = Boolean(safeLiveEndTime && Date.now() <= safeLiveEndTime);

      // 🔥 অ্যান্ড্রয়েডের মতো ফায়ারস্টোরে `exam_results` আপলোড নিশ্চিত করা হলো
      if (!canonicalExamId.includes(",") && canonicalExamId !== "MISTAKE_REVISION") {
        try {
          const user = auth.currentUser;
          await addDoc(collection(db, "exam_results"), {
            userId: user ? user.uid : `web_guest_${Date.now()}`,
            userName: user ? user.displayName || user.email || "Web Student" : "Web Student",
            userPhoto: user?.photoURL || "",
            examId: canonicalExamId,
            score: res.score,
            totalQuestions: res.total,
            isLiveAttempt: isLiveAttempt,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("Failed to upload exam_results from web:", err);
        }
      }

      const reviewPayload = {
        questions,
        answers,
        ...res,
        globalXP,
        liveEndTime: safeLiveEndTime,
        hideSolutionUntilLiveEnds,
      };

      sessionStorage.setItem(`mcqhub_review_${id}`, JSON.stringify(reviewPayload));
      sessionStorage.setItem(`mcqhub_review_${canonicalExamId}`, JSON.stringify(reviewPayload));
      localStorage.setItem(`mcqhub_persisted_review_${decodedId}`, JSON.stringify(reviewPayload));
      localStorage.setItem(`mcqhub_persisted_review_${canonicalExamId}`, JSON.stringify(reviewPayload));

      router.replace(
        `/result?id=${encodeURIComponent(id)}&canonicalId=${encodeURIComponent(
          canonicalExamId
        )}&title=${encodeURIComponent(examTitle)}&score=${res.score.toFixed(2)}&correct=${
          res.correct
        }&wrong=${res.wrong}&skipped=${res.skipped}&total=${res.total}&xp=${globalXP.toFixed(2)}`
      );
    }
  }, [
    id,
    canonicalExamId,
    examTitle,
    questions,
    answers,
    liveEndTime,
    hideSolutionUntilLiveEnds,
    calculateFinalScore,
    router,
  ]);

  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

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
    canonicalExamId,
    liveEndTime,
    hideSolutionUntilLiveEnds,
    handleSelectOption,
    toggleFlag,
    toggleBookmark,
    handleSubmitExam,
    calculateFinalScore,
  };
}