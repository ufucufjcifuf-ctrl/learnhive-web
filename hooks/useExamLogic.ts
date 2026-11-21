"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnswerEntry, ExamConfig, PublicQuestion, Question } from "@/types";
import { saveExamHistory } from "@/lib/historyService";
import { enableExamAntiCheat } from "@/lib/antiCheat";
import { recordDailyActivity } from "@/lib/streakService";
import { sounds } from "@/lib/soundEffects";
import { shuffleArray } from "@/lib/utils";
import { findItemDeeply } from "@/lib/layoutService";
import { apiFetch, ApiError, getServerNow } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import {
  clearExamSessionStorage,
  removeMistakesFromLocal,
  saveWrongMistakesToLocal,
} from "@/lib/examStorage";

export function useExamLogic(id: string) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryTitle = searchParams.get("title");
  const queryLimit = Number(searchParams.get("limit")) || -1;
  const queryDuration = Number(searchParams.get("duration")) || 0;
  const queryPos = searchParams.get("pos") ? Number(searchParams.get("pos")) : 1.0;
  const queryNeg = searchParams.get("neg") ? Number(searchParams.get("neg")) : 0.25;
  const queryShuffle = searchParams.get("shuffle") === "true";
  const queryDiff = (searchParams.get("diff") || "ALL").toUpperCase();
  const queryAutoRemove = searchParams.get("autoRemove") === "true";

  const paramLiveEnd = searchParams.get("liveEnd") ? Number(searchParams.get("liveEnd")) : null;
  const paramHideSolution = searchParams.get("hideSolution") === "true";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [examTitle, setExamTitle] = useState<string>(queryTitle || "Online Model Test");

  const decodedRawId = decodeURIComponent(id).trim();
  const isCustomExam = decodedRawId.includes(",") || decodedRawId.includes("|LIMIT|");
  const isMistakeRevision = decodedRawId === "MISTAKE_REVISION";

  const [canonicalExamId, setCanonicalExamId] = useState<string>(decodedRawId);
  const [customChapterIds, setCustomChapterIds] = useState<string[]>([]);
  const [liveEndTime, setLiveEndTime] = useState<number | null>(paramLiveEnd);
  const [hideSolutionUntilLiveEnds, setHideSolutionUntilLiveEnds] =
    useState<boolean>(paramHideSolution);
  const [posMarkState, setPosMarkState] = useState<number>(queryPos);
  const [negMarkState, setNegMarkState] = useState<number>(queryNeg);

  const isSubmittingRef = useRef(false);
  const targetEndTimeRef = useRef<number>(Date.now() + 15 * 60 * 1000);
  const examStartTimeRef = useRef<number>(Date.now());
  const totalDurationSecRef = useRef<number>(15 * 60);
  const handleSubmitExamRef = useRef<(fromTimer?: boolean) => void>(() => {});
  const cachedSolutionsRef = useRef<Record<string, AnswerEntry>>({});

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
          list.forEach((q) => {
            map[q.id] = true;
          });
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
      setFetchError(null);
      try {
        if (isMistakeRevision) {
          clearExamSessionStorage(decodedRawId);
          const stored = sessionStorage.getItem("mcqhub_revision_questions");
          if (stored) {
            let list: Question[] = JSON.parse(stored);
            if (queryLimit > 0 && list.length > queryLimit) {
              list = shuffleArray(list).slice(0, queryLimit);
            }
            setQuestions(list);
            const totalSec = queryDuration > 0 ? queryDuration * 60 : list.length * 60;
            totalDurationSecRef.current = totalSec;
            setTimeLeft(totalSec);
            targetEndTimeRef.current = Date.now() + totalSec * 1000;
            examStartTimeRef.current = Date.now();
          } else {
            setFetchError("রিভিশনের জন্য কোনো প্রশ্ন নির্বাচন করা হয়নি।");
          }
          setLoading(false);
          return;
        }

        let loadedQuestions: Question[] = [];
        let configDuration = queryDuration;

        if (isCustomExam) {
          const specs = decodedRawId
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          const chapterIdsForSolutions: string[] = [];

          const chapterResponses = await Promise.all(
            specs.map(async (spec) => {
              const parts = spec.split("|LIMIT|");
              const pureId = parts[0].trim();
              const chapterLimit = parts[1] ? Number(parts[1]) : null;
              try {
                const res = await apiFetch<{
                  success: boolean;
                  examId: string;
                  questions: PublicQuestion[];
                }>(`/api/exam/questions?id=${encodeURIComponent(pureId)}`, {
                  withOptionalAuth: true,
                });
                return { res, chapterLimit };
              } catch {
                return null;
              }
            })
          );

          const hasSpecificLimits = specs.some((s) => s.includes("|LIMIT|"));

          for (const entry of chapterResponses) {
            if (!entry || !entry.res?.questions?.length) continue;
            chapterIdsForSolutions.push(entry.res.examId);
            let qs: Question[] = entry.res.questions.map((pq) => ({
              ...pq,
              correctOptionIndex: -1,
              correctOptionIndices: [],
              explanation: "",
            }));

            if (queryShuffle) qs = shuffleArray(qs);
            if (entry.chapterLimit && entry.chapterLimit > 0) {
              qs = qs.slice(0, entry.chapterLimit);
            }
            loadedQuestions.push(...qs);
          }

          setCustomChapterIds(Array.from(new Set(chapterIdsForSolutions)));

          if (queryDiff !== "ALL") {
            const targetQs = loadedQuestions.filter((q) => q.difficulty === queryDiff);
            if (targetQs.length > 0) loadedQuestions = targetQs;
          }
          if (queryShuffle) loadedQuestions = shuffleArray(loadedQuestions);
          if (!hasSpecificLimits && queryLimit > 0 && queryLimit < loadedQuestions.length) {
            loadedQuestions = loadedQuestions.slice(0, queryLimit);
          }
        } else {
          let targetId = decodedRawId;
          const matchedItem = await findItemDeeply(decodedRawId).catch(() => null);
          if (matchedItem) {
            targetId = matchedItem.command || matchedItem.id;
            if (!queryTitle) setExamTitle(matchedItem.title);
            if (configDuration <= 0 && matchedItem.examConfig?.durationMinutes) {
              configDuration = matchedItem.examConfig.durationMinutes;
            }
          }

          const res = await apiFetch<{
            success: boolean;
            examId: string;
            title: string;
            isLive?: boolean;
            config?: Partial<ExamConfig>;
            questions: PublicQuestion[];
          }>(`/api/exam/questions?id=${encodeURIComponent(targetId)}`, {
            withOptionalAuth: true,
          });

          setCanonicalExamId(res.examId || targetId);
          if (res.title && !queryTitle) setExamTitle(res.title);

          const cfg = res.config || {};
          if (cfg.liveEndTimeMs) {
            setLiveEndTime(cfg.liveEndTimeMs);
            setHideSolutionUntilLiveEnds(cfg.hideSolutionUntilLiveEnds !== false);
          }
          if (configDuration <= 0 && cfg.durationMinutes) {
            configDuration = Number(cfg.durationMinutes);
          }
          if (!searchParams.get("pos") && cfg.positiveMark !== undefined) {
            setPosMarkState(cfg.positiveMark);
          }
          if (!searchParams.get("neg") && cfg.negativeMark !== undefined) {
            setNegMarkState(cfg.negativeMark);
          }

          let qs: Question[] = (res.questions || []).map((pq) => ({
            ...pq,
            correctOptionIndex: -1,
            correctOptionIndices: [],
            explanation: "",
          }));

          if (queryDiff !== "ALL") {
            const targetQs = qs.filter((q) => q.difficulty === queryDiff);
            if (queryLimit > 0 && targetQs.length < queryLimit) {
              const needed = queryLimit - targetQs.length;
              const others = shuffleArray(qs.filter((q) => q.difficulty !== queryDiff));
              qs = [...targetQs, ...others.slice(0, needed)];
            } else if (targetQs.length > 0) {
              qs = targetQs;
            }
          }

          const shouldShuffle = searchParams.has("shuffle")
            ? queryShuffle
            : cfg.isShuffleEnabled ?? false;
          if (shouldShuffle) qs = shuffleArray(qs);

          const effectiveLimit =
            queryLimit > 0 ? queryLimit : cfg.questionLimit && cfg.questionLimit > 0 ? cfg.questionLimit : -1;
          if (effectiveLimit > 0 && effectiveLimit < qs.length) {
            qs = qs.slice(0, effectiveLimit);
          }

          loadedQuestions = qs;
        }

        if (loadedQuestions.length > 0) {
          setQuestions(loadedQuestions);

          if (typeof window !== "undefined") {
            const savedEnd = localStorage.getItem(`mcq_active_end_${decodedRawId}`);
            const savedStart = localStorage.getItem(`mcq_active_start_${decodedRawId}`);
            const savedAnswers = localStorage.getItem(`mcq_active_answers_${decodedRawId}`);

            if (savedAnswers) {
              try {
                setAnswers(JSON.parse(savedAnswers));
              } catch {}
            }

            const totalSec = configDuration > 0 ? configDuration * 60 : loadedQuestions.length * 60;
            totalDurationSecRef.current = totalSec;

            if (savedStart) {
              examStartTimeRef.current = Number(savedStart);
            } else {
              examStartTimeRef.current = Date.now();
              localStorage.setItem(`mcq_active_start_${decodedRawId}`, String(examStartTimeRef.current));
            }

            if (savedEnd) {
              const remaining = Math.max(0, Math.floor((Number(savedEnd) - Date.now()) / 1000));
              setTimeLeft(remaining);
              targetEndTimeRef.current = Number(savedEnd);
            } else {
              setTimeLeft(totalSec);
              const targetEnd = Date.now() + totalSec * 1000;
              targetEndTimeRef.current = targetEnd;
              localStorage.setItem(`mcq_active_end_${decodedRawId}`, String(targetEnd));
            }
          }
        } else {
          setFetchError("কোনো প্রশ্ন পাওয়া যায়নি। ইন্টারনেট সংযোগ চেক করুন।");
        }
      } catch (e: unknown) {
        if (e instanceof ApiError) {
          setFetchError(e.message);
        } else {
          setFetchError(e instanceof Error ? e.message : "Failed to load exam.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchExam();
  }, [
    id,
    decodedRawId,
    isCustomExam,
    isMistakeRevision,
    queryTitle,
    queryDiff,
    queryShuffle,
    queryLimit,
    queryDuration,
    searchParams,
  ]);

  const handleSelectOption = useCallback(
    (qIdx: number, optIdx: number) => {
      sounds.playClick();
      setAnswers((prev) => {
        const updated = { ...prev, [qIdx]: optIdx };
        if (typeof window !== "undefined" && !isMistakeRevision) {
          localStorage.setItem(`mcq_active_answers_${decodedRawId}`, JSON.stringify(updated));
        }
        return updated;
      });
    },
    [decodedRawId, isMistakeRevision]
  );

  const toggleFlag = useCallback((qIdx: number) => {
    sounds.playClick();
    setFlagged((p) => ({ ...p, [qIdx]: !p[qIdx] }));
  }, []);

  const toggleBookmark = useCallback(
    async (q: Question) => {
      const serverNow = getServerNow();
      const isLiveRunning = Boolean(liveEndTime && serverNow < liveEndTime);
      if (hideSolutionUntilLiveEnds && isLiveRunning) {
        alert("⚠️ লাইভ পরীক্ষা চলাকালীন নকল রোধে বুকমার্ক করা নিষিদ্ধ!");
        return;
      }

      const isCurrentlySaved = Boolean(bookmarks[q.id]);
      const nextSavedState = !isCurrentlySaved;
      let questionToSave = q;

      if (
        nextSavedState &&
        !isMistakeRevision &&
        q.correctOptionIndex === -1 &&
        (!q.correctOptionIndices || q.correctOptionIndices.length === 0)
      ) {
        let cachedAns = cachedSolutionsRef.current[q.id];
        if (!cachedAns) {
          const targetIds = isCustomExam ? customChapterIds : [canonicalExamId];
          try {
            const bundles = await Promise.all(
              targetIds.map((chId) =>
                apiFetch<{ success: boolean; answersMap: Record<string, AnswerEntry> }>(
                  `/api/exam/solutions?id=${encodeURIComponent(chId)}`,
                  { withOptionalAuth: true }
                )
              )
            );
            for (const b of bundles) {
              if (b?.answersMap) Object.assign(cachedSolutionsRef.current, b.answersMap);
            }
            cachedAns = cachedSolutionsRef.current[q.id];
          } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
              alert("⚠️ লাইভ পরীক্ষা শেষ না হওয়া পর্যন্ত উত্তরসহ বুকমার্ক লক রয়েছে!");
              return;
            }
          }
        }
        if (cachedAns) {
          questionToSave = {
            ...q,
            correctOptionIndex: cachedAns.i,
            correctOptionIndices: cachedAns.c,
            explanation: cachedAns.e,
          };
        }
      }

      sounds.playClick();
      setBookmarks((prev) => ({ ...prev, [q.id]: nextSavedState }));

      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("mcqhub_saved_questions_detail");
          let savedList: Question[] = stored ? JSON.parse(stored) : [];

          if (nextSavedState) {
            if (!savedList.some((item) => item.id === q.id)) {
              savedList.push(questionToSave);
            }
          } else {
            savedList = savedList.filter((item) => item.id !== q.id);
          }

          localStorage.setItem("mcqhub_saved_questions_detail", JSON.stringify(savedList));
        } catch (e) {
          console.error("Bookmark Save Error:", e);
        }
      }

      if (auth.currentUser) {
        if (nextSavedState) {
          apiFetch("/api/user/bookmarks", {
            method: "POST",
            requireAuth: true,
            body: {
              questionId: q.id,
              questionJson: JSON.stringify(questionToSave),
              subject: examTitle,
            },
          }).catch(() => {});
        } else {
          apiFetch(`/api/user/bookmarks?questionId=${encodeURIComponent(q.id)}`, {
            method: "DELETE",
            requireAuth: true,
          }).catch(() => {});
        }
      }
    },
    [
      bookmarks,
      examTitle,
      hideSolutionUntilLiveEnds,
      liveEndTime,
      isMistakeRevision,
      isCustomExam,
      customChapterIds,
      canonicalExamId,
    ]
  );

  const calculateFinalScore = useCallback(() => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalScore = 0;

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      const pos = q.customPositiveMark ?? posMarkState;
      const neg = q.customNegativeMark ?? negMarkState;

      const correctAnswers =
        q.correctOptionIndices && q.correctOptionIndices.length > 0
          ? q.correctOptionIndices
          : q.correctOptionIndex !== -1
          ? [q.correctOptionIndex]
          : [];

      const isBonus =
        submitted && !isMistakeRevision && (q.options || []).length > 0 && correctAnswers.length === 0;

      if (isBonus) {
        correct++;
        totalScore += pos;
      } else if (selected === undefined || !submitted || correctAnswers.length === 0) {
        skipped++;
      } else if (correctAnswers.includes(selected)) {
        correct++;
        totalScore += pos;
      } else {
        wrong++;
        totalScore -= neg;
      }
    });

    return {
      correct,
      wrong,
      skipped,
      score: totalScore,
      total: questions.length,
    };
  }, [questions, answers, posMarkState, negMarkState, submitted, isMistakeRevision]);

  const clearActiveExamSession = useCallback(() => {
    clearExamSessionStorage(decodedRawId);
  }, [decodedRawId]);

  const handleSubmitExam = useCallback(
    async (fromTimer = false) => {
      if (isSubmittingRef.current || questions.length === 0) return;

      const answeredCount = Object.keys(answers).length;
      const timeSpentMs = Date.now() - examStartTimeRef.current;

      if (!fromTimer && answeredCount >= 5 && timeSpentMs < 5000) {
        clearActiveExamSession();
        alert("⚠️ Security Alert: অস্বাভাবিক দ্রুত উত্তর প্রদানের কারণে পরীক্ষা বাতিল করা হয়েছে!");
        router.replace("/");
        return;
      }

      isSubmittingRef.current = true;
      setSubmitting(true);

      const timeTakenSec = Math.max(1, Math.round(timeSpentMs / 1000));

      let finalCorrect = 0;
      let finalWrong = 0;
      let finalSkipped = 0;
      let finalScore = 0;
      let finalGlobalXP = 0;
      let solvedQuestions = questions;
      let finalIsSolutionLocked = false;
      let finalIsExplanationLocked = false;
      let finalLiveEnd: number | null = liveEndTime ? liveEndTime + 300_000 : null;

      try {
        if (isCustomExam || isMistakeRevision) {
          const mergedAnsMap: Record<string, AnswerEntry> = {};

          if (isCustomExam && customChapterIds.length > 0) {
            const solResults = await Promise.all(
              customChapterIds.map(async (chId) => {
                try {
                  return await apiFetch<{ success: boolean; answersMap: Record<string, AnswerEntry> }>(
                    `/api/exam/solutions?id=${encodeURIComponent(chId)}`,
                    { withOptionalAuth: true }
                  );
                } catch (err) {
                  if (err instanceof ApiError && err.status === 403) {
                    return null;
                  }
                  throw err;
                }
              })
            );
            for (const sr of solResults) {
              if (sr?.answersMap) Object.assign(mergedAnsMap, sr.answersMap);
            }
          }

          const wrongList: Question[] = [];
          const correctedIds: string[] = [];

          solvedQuestions = questions.map((q, idx) => {
            const ans = isCustomExam ? mergedAnsMap[q.id] : undefined;

            if (isCustomExam && !ans) {
              finalSkipped++;
              return q;
            }

            const hydratedQ: Question = ans
              ? {
                  ...q,
                  correctOptionIndex: ans.i,
                  correctOptionIndices: ans.c,
                  explanation: ans.e,
                }
              : q;

            const selected = answers[idx];
            const pos = hydratedQ.customPositiveMark ?? posMarkState;
            const neg = hydratedQ.customNegativeMark ?? negMarkState;

            const correctAnswers =
              hydratedQ.correctOptionIndices && hydratedQ.correctOptionIndices.length > 0
                ? hydratedQ.correctOptionIndices
                : hydratedQ.correctOptionIndex !== -1
                ? [hydratedQ.correctOptionIndex]
                : [];

            if (isMistakeRevision && correctAnswers.length === 0) {
              finalSkipped++;
              return hydratedQ;
            }

            const isBonus = hydratedQ.options.length > 0 && correctAnswers.length === 0;

            if (isBonus) {
              finalCorrect++;
              finalScore += pos;
              finalGlobalXP += 1.0;
            } else if (selected === undefined) {
              finalSkipped++;
            } else if (correctAnswers.includes(selected)) {
              finalCorrect++;
              finalScore += pos;
              finalGlobalXP += 1.0;
              if (isMistakeRevision && queryAutoRemove) {
                correctedIds.push(hydratedQ.id);
              }
            } else {
              finalWrong++;
              finalScore -= neg;
              finalGlobalXP -= 0.25;
              wrongList.push(hydratedQ);
            }

            return hydratedQ;
          });

          if (!isMistakeRevision) {
            saveWrongMistakesToLocal(wrongList);
          } else if (correctedIds.length > 0) {
            removeMistakesFromLocal(correctedIds);
          }

          if (auth.currentUser) {
            if (!isMistakeRevision && wrongList.length > 0) {
              apiFetch("/api/user/mistakes", {
                method: "POST",
                requireAuth: true,
                body: {
                  addMistakes: wrongList.slice(0, 50).map((wq) => ({
                    questionId: wq.id,
                    examId: "CUSTOM_EXAM",
                    examTitle,
                    questionJson: JSON.stringify(wq),
                  })),
                },
              }).catch(() => {});
            } else if (isMistakeRevision && correctedIds.length > 0) {
              apiFetch("/api/user/mistakes", {
                method: "POST",
                requireAuth: true,
                body: { removeQuestionIds: correctedIds },
              }).catch(() => {});
            }

            apiFetch("/api/analytics/exam-summary", {
              method: "POST",
              requireAuth: true,
              body: {
                topicId: isMistakeRevision ? "MISTAKE_REVISION" : "CUSTOM_EXAM",
                topicTitle: examTitle,
                answered: finalCorrect + finalWrong,
                correct: finalCorrect,
                wrong: finalWrong,
                timeTakenSec,
              },
            }).catch(() => {});
          }
        } else {
          const submitRes = await apiFetch<{
            success: boolean;
            total: number;
            correct: number;
            wrong: number;
            skipped: number;
            score: number;
            globalXP: number;
            isSolutionLocked: boolean;
            isExplanationLocked?: boolean;
            liveEndTimeMs: number | null;
            solutions: Record<string, AnswerEntry>;
          }>("/api/exam/submit", {
            method: "POST",
            withOptionalAuth: true,
            body: {
              examId: canonicalExamId,
              examTitle,
              questionIds: questions.map((q) => q.id),
              answers,
              timeTakenSec,
              posMark: posMarkState,
              negMark: negMarkState,
            },
          });

          finalCorrect = submitRes.correct;
          finalWrong = submitRes.wrong;
          finalSkipped = submitRes.skipped;
          finalScore = submitRes.score;
          finalGlobalXP = submitRes.globalXP;
          finalIsSolutionLocked = submitRes.isSolutionLocked;
          finalIsExplanationLocked = Boolean(submitRes.isExplanationLocked);
          finalLiveEnd = submitRes.liveEndTimeMs ? submitRes.liveEndTimeMs + 300_000 : null;

          const wrongList: Question[] = [];
          solvedQuestions = questions.map((q, idx) => {
            const ans = submitRes.solutions?.[q.id];
            const hydrated: Question = ans
              ? {
                  ...q,
                  correctOptionIndex: ans.i,
                  correctOptionIndices: ans.c,
                  explanation: ans.e,
                }
              : q;

            const selected = answers[idx];
            if (ans && selected !== undefined) {
              const correctAnswers =
                ans.c && ans.c.length > 0 ? ans.c : ans.i !== -1 ? [ans.i] : [];
              if (correctAnswers.length > 0 && !correctAnswers.includes(selected)) {
                wrongList.push(hydrated);
              }
            }
            return hydrated;
          });

          if (!finalIsSolutionLocked) {
            saveWrongMistakesToLocal(wrongList);
          }
        }
      } catch (err) {
        console.error("Exam submit error:", err);
        alert(
          err instanceof Error
            ? err.message
            : "নেটওয়ার্ক সমস্যার কারণে পরীক্ষা সাবমিট হয়নি। আবার চেষ্টা করুন।"
        );
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }

      setQuestions(solvedQuestions);
      setSubmitted(true);
      setSubmitting(false);
      clearActiveExamSession();
      recordDailyActivity();

      if (typeof window !== "undefined") {
        saveExamHistory({
          examId: canonicalExamId,
          examTitle,
          score: finalScore,
          totalQuestions: questions.length,
          correctAnswers: finalCorrect,
          wrongAnswers: finalWrong,
          skippedAnswers: finalSkipped,
          timestamp: Date.now(),
        });

        const reviewPayload = {
          examId: canonicalExamId,
          questions: solvedQuestions,
          answers,
          correct: finalCorrect,
          wrong: finalWrong,
          skipped: finalSkipped,
          score: finalScore,
          total: questions.length,
          globalXP: finalGlobalXP,
          isSolutionLocked: finalIsSolutionLocked,
          isExplanationLocked: finalIsExplanationLocked,
          liveEndTime: finalLiveEnd,
          hideSolutionUntilLiveEnds: finalIsSolutionLocked || hideSolutionUntilLiveEnds,
        };

        sessionStorage.setItem(`mcqhub_review_${decodedRawId}`, JSON.stringify(reviewPayload));
        sessionStorage.setItem(`mcqhub_review_${canonicalExamId}`, JSON.stringify(reviewPayload));
        localStorage.setItem(`mcqhub_persisted_review_${decodedRawId}`, JSON.stringify(reviewPayload));
        localStorage.setItem(
          `mcqhub_persisted_review_${canonicalExamId}`,
          JSON.stringify(reviewPayload)
        );

        router.replace(
          `/result?id=${encodeURIComponent(decodedRawId)}&canonicalId=${encodeURIComponent(
            canonicalExamId
          )}&title=${encodeURIComponent(examTitle)}&score=${finalScore.toFixed(
            2
          )}&correct=${finalCorrect}&wrong=${finalWrong}&skipped=${finalSkipped}&total=${
            questions.length
          }&xp=${finalGlobalXP.toFixed(2)}`
        );
      }
    },
    [
      decodedRawId,
      canonicalExamId,
      examTitle,
      questions,
      answers,
      isCustomExam,
      isMistakeRevision,
      customChapterIds,
      posMarkState,
      negMarkState,
      queryAutoRemove,
      liveEndTime,
      hideSolutionUntilLiveEnds,
      clearActiveExamSession,
      router,
    ]
  );

  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  useEffect(() => {
    if (loading || submitted || submitting || questions.length === 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmitExamRef.current(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, submitted, submitting, questions.length]);

  return {
    questions,
    loading,
    fetchError,
    answers,
    flagged,
    bookmarks,
    timeLeft,
    submitting,
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
    clearActiveExamSession,
  };
}