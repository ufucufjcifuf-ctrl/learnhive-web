"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ApiError, getServerNow } from "@/lib/apiClient";
import {
  BattleSocketManager,
  clearBattleSession,
  fetchBattleRoomPreview,
  joinBattleRoomApi,
  loadBattleSession,
  saveBattleSession,
} from "@/lib/battleClient";
import { sounds } from "@/lib/soundEffects";
import {
  BattleConnectionState,
  BattleReactionPopup,
  BattleRoomPreview,
  BattleRoomSnapshot,
} from "@/types";
import { ArrowLeft, Gamepad2, LogIn, Smartphone } from "lucide-react";
import { BattleLobbyView } from "@/components/battle/BattleLobbyView";
import { BattlePlayView } from "@/components/battle/BattlePlayView";
import { BattleResultView } from "@/components/battle/BattleResultView";

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const roomId = params?.id ? decodeURIComponent(String(params.id)).trim().toUpperCase() : "";

  const [preview, setPreview] = useState<BattleRoomPreview | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<BattleRoomSnapshot | null>(null);
  const [connState, setConnState] = useState<BattleConnectionState>("DISCONNECTED");

  const [guestName, setGuestName] = useState("");
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [countdownSec, setCountdownSec] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(15);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealingQIndex, setRevealingQIndex] = useState<number | null>(null);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [feedbackExplanation, setFeedbackExplanation] = useState("");
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [lastWasCorrect, setLastWasCorrect] = useState(false);

  const [speedBanner, setSpeedBanner] = useState<string | null>(null);
  const [reactions, setReactions] = useState<BattleReactionPopup[]>([]);
  const [resultTab, setResultTab] = useState<"RANKINGS" | "SOLUTIONS">("RANKINGS");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const socketRef = useRef<BattleSocketManager | null>(null);
  const snapshotRef = useRef<BattleRoomSnapshot | null>(null);
  const pendingQRef = useRef<number>(-1);
  const lastTimedOutQRef = useRef<number>(-1);
  const isRevealingRef = useRef<boolean>(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoJoinedRef = useRef<boolean>(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const ensureSocketManager = () => {
    if (socketRef.current) return socketRef.current;

    const mgr = new BattleSocketManager({
      onSnapshot: (snap) => {
        setSnapshot(snap);
        if (snap) {
          if (snap.status === "playing") {
            setErrorMsg(null);
            if (!isRevealingRef.current) {
              pendingQRef.current = -1;
              lastTimedOutQRef.current = -1;
              setIsSubmitting(false);
            }
          }
          if (snap.mode === "SYNCED" && snap.status === "playing") {
            const savedAns = snap.myAnswers[String(snap.syncedQIndex)];
            setIsAnswerLocked(savedAns !== undefined);
            if (savedAns !== undefined) {
              setSelectedOpt(savedAns >= 0 ? savedAns : null);
            }
            if (snap.syncedPhase === "REVEAL") {
              isRevealingRef.current = true;
              setIsRevealing(true);
            } else {
              isRevealingRef.current = false;
              setIsRevealing(false);
              if (savedAns === undefined) {
                setSelectedOpt(null);
              }
            }
          }
        }
      },
      onConnectionChange: (st) => setConnState(st),
      onAnswerResult: (res) => {
        if (res.isCorrect) sounds.playCorrect();
        else sounds.playWrong();

        setErrorMsg(null);
        setIsSubmitting(false);
        isRevealingRef.current = true;
        setRevealingQIndex(res.qIndex);
        setIsRevealing(true);
        setCorrectIndices(res.correctIndices);
        setFeedbackExplanation(res.explanation);
        setLastEarnedPoints(res.earnedPoints);
        setLastWasCorrect(res.isCorrect);

        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = setTimeout(
          () => {
            isRevealingRef.current = false;
            pendingQRef.current = -1;
            setRevealingQIndex(null);
            setIsRevealing(false);
            setSelectedOpt(null);
            setCorrectIndices([]);
            setFeedbackExplanation("");
          },
          res.isTimeout ? 550 : 750
        );
      },
      onAnswerLocked: (locked) => {
        setErrorMsg(null);
        setIsSubmitting(false);
        setIsAnswerLocked(true);
        setSelectedOpt(locked.selectedIndex >= 0 ? locked.selectedIndex : null);
      },
      onSyncedReveal: (reveal) => {
        setErrorMsg(null);
        setIsSubmitting(false);
        isRevealingRef.current = true;
        setIsRevealing(true);
        setCorrectIndices(reveal.correctIndices);
        setFeedbackExplanation(reveal.explanation);
      },
      onSyncedNextQuestion: () => {
        setErrorMsg(null);
        pendingQRef.current = -1;
        lastTimedOutQRef.current = -1;
        isRevealingRef.current = false;
        setRevealingQIndex(null);
        setIsSubmitting(false);
        setIsAnswerLocked(false);
        setIsRevealing(false);
        setSelectedOpt(null);
        setCorrectIndices([]);
        setFeedbackExplanation("");
      },
      onSpeedHighlight: (hl) => {
        const sec = (hl.speedMs / 1000).toFixed(1);
        setSpeedBanner(`⚡ ${hl.name} মাত্র ${sec} সেকেন্ডে সঠিক উত্তর দিয়েছে!`);
        if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
        speedTimerRef.current = setTimeout(() => setSpeedBanner(null), 2200);
      },
      onReaction: (reaction) => {
        setReactions((prev) => [...prev, reaction].slice(-14));
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 2100);
      },
      onError: (msg) => {
        pendingQRef.current = -1;
        setIsSubmitting(false);
        setErrorMsg(msg);
      },
    });

    socketRef.current = mgr;
    return mgr;
  };

  useEffect(() => {
    if (!roomId || authLoading) return;
    let cancelled = false;

    async function bootstrap() {
      const existingSession = loadBattleSession(roomId);
      if (existingSession) {
        if (user && existingSession.myUid !== user.uid) {
          clearBattleSession(roomId);
        } else {
          setPreviewLoaded(true);
          ensureSocketManager().connect(
            roomId,
            existingSession.wsUrl,
            existingSession.myUid,
            existingSession.guestName
          );
          return;
        }
      }

      const info = await fetchBattleRoomPreview(roomId);
      if (cancelled) return;
      setPreview(info);
      setPreviewLoaded(true);

      if (info && user && !autoJoinedRef.current) {
        autoJoinedRef.current = true;
        setJoining(true);
        try {
          const joined = await joinBattleRoomApi(roomId);
          if (cancelled) return;
          saveBattleSession(roomId, joined.wsUrl, joined.uid);
          ensureSocketManager().connect(roomId, joined.wsUrl, joined.uid);
        } catch (err) {
          if (!cancelled) {
            setErrorMsg(err instanceof ApiError ? err.message : "রুমে যোগ দেওয়া যায়নি।");
          }
        } finally {
          if (!cancelled) setJoining(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [roomId, user, authLoading]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const snap = snapshotRef.current;
      if (!snap || snap.status !== "playing") return;

      const now = getServerNow();
      if (snap.startedAtMs > now) {
        const cd = Math.min(3, Math.max(1, Math.ceil((snap.startedAtMs - now) / 1000)));
        setCountdownSec(cd);
        setTimeLeftSec(snap.rules.timePerQuestion);
        return;
      }

      setCountdownSec(0);

      if (snap.mode === "SYNCED") {
        const remMs = Math.max(0, snap.syncedDeadlineMs - now);
        setTimeLeftSec(Math.ceil(remMs / 1000));
      } else if (!snap.myHasFinished && !isRevealingRef.current) {
        const qStart = snap.myQStartedAtMs > 0 ? snap.myQStartedAtMs : snap.startedAtMs;
        const endMs = qStart + snap.rules.timePerQuestion * 1000;
        const remMs = Math.max(0, endMs - now);
        setTimeLeftSec(Math.ceil(remMs / 1000));

        if (
          remMs === 0 &&
          pendingQRef.current !== snap.myQIndex &&
          lastTimedOutQRef.current !== snap.myQIndex
        ) {
          const sent = socketRef.current?.submitAnswer(snap.myQIndex, -1) ?? false;
          if (sent) {
            lastTimedOutQRef.current = snap.myQIndex;
            pendingQRef.current = snap.myQIndex;
            setIsSubmitting(true);
          }
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = guestName.trim();
    if (!cleanName) {
      setErrorMsg("অনুগ্রহ করে আপনার নাম লিখুন।");
      return;
    }
    setErrorMsg(null);
    setJoining(true);
    try {
      const joined = await joinBattleRoomApi(roomId, cleanName);
      saveBattleSession(roomId, joined.wsUrl, joined.uid, cleanName);
      ensureSocketManager().connect(roomId, joined.wsUrl, joined.uid, cleanName);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "রুমে যোগ দেওয়া যায়নি।");
    } finally {
      setJoining(false);
    }
  };

  const handleOpenAndroidApp = () => {
    const playStore = "https://play.google.com/store/apps/details?id=com.robinsheikh.mcqhub";
    const intentUrl = `intent://learnhive-web.vercel.app/battle/${encodeURIComponent(
      roomId
    )}#Intent;scheme=https;package=com.robinsheikh.mcqhub;S.browser_fallback_url=${encodeURIComponent(
      playStore
    )};end`;
    window.location.href = intentUrl;
  };

  const handleShareRoom = async () => {
    const url = `${window.location.origin}/battle/${encodeURIComponent(roomId)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Learn Hive Group Battle",
          text: `আমার গ্রুপ ব্যাটল রুমে যোগ দাও!\nRoom Code: ${roomId}\nLink: ${url}`,
          url,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectOption = (optIdx: number) => {
    if (!snapshot || snapshot.status !== "playing" || countdownSec > 0) return;
    if (isSubmitting || isRevealing || isAnswerLocked) return;

    const qIdx = snapshot.mode === "SYNCED" ? snapshot.syncedQIndex : snapshot.myQIndex;
    if (pendingQRef.current === qIdx) return;

    const sent = socketRef.current?.submitAnswer(qIdx, optIdx) ?? false;
    if (!sent) {
      setErrorMsg("সংযোগ পুনরুদ্ধার হচ্ছে, ১–২ সেকেন্ড পর আবার ক্লিক করুন।");
      return;
    }

    sounds.playClick();
    setErrorMsg(null);
    pendingQRef.current = qIdx;
    setSelectedOpt(optIdx);
    setIsSubmitting(true);
  };

  const handleExitToHome = () => {
    clearBattleSession(roomId);
    socketRef.current?.disconnect();
    router.push("/");
  };

  const handleLeaveConfirmed = () => {
    setShowLeaveConfirm(false);
    socketRef.current?.leaveRoom();
    router.push("/battle");
  };

  // 1. Pre-Join / Connecting / Guest Entry Screen
  if (!snapshot) {
    const isConnectingSocket = connState === "CONNECTING" || connState === "RECONNECTING";

    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Link href="/battle" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </Link>
            <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
              ROOM: {roomId}
            </span>
          </div>

          {!previewLoaded || joining || isConnectingSocket ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-400">ব্যাটল রুমে সংযুক্ত হচ্ছে...</p>
            </div>
          ) : !preview && errorMsg ? (
            <div className="py-6 text-center">
              <p className="text-sm font-bold text-red-400 mb-4">{errorMsg}</p>
              <Link
                href="/battle"
                data-card-surface="custom"
                className="inline-block bg-cyan-500 text-black font-black px-5 py-2.5 rounded-xl text-xs"
              >
                অন্য রুম কোড দিন
              </Link>
            </div>
          ) : !preview ? (
            <div className="py-6 text-center">
              <Gamepad2 size={36} className="text-gray-500 mx-auto mb-3" />
              <h2 className="text-base font-black text-white">রুমটি পাওয়া যায়নি</h2>
              <p className="text-xs text-gray-400 mt-1 mb-5">
                রুম কোডটি ভুল হতে পারে অথবা ম্যাচটির মেয়াদ শেষ হয়েছে।
              </p>
              <Link
                href="/battle"
                data-card-surface="custom"
                className="inline-block bg-cyan-500 text-black font-black px-5 py-2.5 rounded-xl text-xs"
              >
                ব্যাটল এরিনায় ফিরুন
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-full">
                  {preview.mode === "SYNCED" ? "⏱️ Synced Quiz" : "⚡ Speed Race"}
                </span>
                <h1 className="text-xl font-black text-white mt-3">{preview.examTitle}</h1>
                <p className="text-xs text-gray-400 mt-1">
                  হোস্ট: <b className="text-gray-200">{preview.hostName || "Host"}</b> • প্লেয়ার:{" "}
                  <b className="text-amber-400">
                    {preview.playerCount}/{preview.rules.maxPlayers}
                  </b>
                </p>
                <p className="text-[11px] text-cyan-400 mt-1 font-semibold">
                  {preview.rules.questionCount} প্রশ্ন • {preview.rules.timePerQuestion} সেকেন্ড/প্রশ্ন
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-semibold">
                  {errorMsg}
                </div>
              )}

              {!user && !preview.allowGuests ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                  <p className="text-xs text-amber-200 font-bold mb-3">
                    এই ব্যাটল রুমে অংশ নিতে অনুগ্রহ করে লগইন করুন।
                  </p>
                  <Link
                    href="/login"
                    data-card-surface="custom"
                    className="inline-flex items-center gap-2 bg-cyan-500 text-black font-black px-5 py-2.5 rounded-xl text-xs"
                  >
                    <LogIn size={14} /> লগইন করুন
                  </Link>
                </div>
              ) : !user ? (
                <form onSubmit={handleGuestJoin} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      আপনার নাম (Guest)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={32}
                      placeholder="যেমন: তানভীর আহমেদ"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    data-card-surface="custom"
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
                  >
                    ওয়েবেই ব্যাটলে যোগ দিন 🚀
                  </button>
                  <Link
                    href="/login"
                    className="text-center text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    Global XP পেতে চাইলে অ্যাকাউন্টে লগইন করুন
                  </Link>
                </form>
              ) : null}

              <button
                type="button"
                onClick={handleOpenAndroidApp}
                data-card-surface="custom"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition"
              >
                <Smartphone size={15} className="text-emerald-400" />
                Android অ্যাপে ওপেন করুন (Open in App)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Waiting Lobby
  if (snapshot.status === "waiting") {
    return (
      <BattleLobbyView
        snapshot={snapshot}
        connState={connState}
        copied={copied}
        errorMsg={errorMsg}
        reactions={reactions}
        showLeaveConfirm={showLeaveConfirm}
        onShowLeaveConfirm={setShowLeaveConfirm}
        onLeaveConfirmed={handleLeaveConfirmed}
        onCopyCode={handleCopyCode}
        onShareRoom={handleShareRoom}
        onSendReaction={(emoji) => socketRef.current?.sendReaction(emoji)}
        onStartBattle={() => {
          setErrorMsg(null);
          socketRef.current?.startBattle();
        }}
      />
    );
  }

  // 3. Live Battle Play Screen
  if (snapshot.status === "playing" && (!snapshot.myHasFinished || isRevealing)) {
    return (
      <BattlePlayView
        snapshot={snapshot}
        connState={connState}
        countdownSec={countdownSec}
        timeLeftSec={timeLeftSec}
        selectedOpt={selectedOpt}
        isSubmitting={isSubmitting}
        isAnswerLocked={isAnswerLocked}
        isRevealing={isRevealing}
        revealingQIndex={revealingQIndex}
        correctIndices={correctIndices}
        feedbackExplanation={feedbackExplanation}
        lastEarnedPoints={lastEarnedPoints}
        lastWasCorrect={lastWasCorrect}
        speedBanner={speedBanner}
        reactions={reactions}
        errorMsg={errorMsg}
        showLeaveConfirm={showLeaveConfirm}
        onShowLeaveConfirm={setShowLeaveConfirm}
        onLeaveConfirmed={handleLeaveConfirmed}
        onSelectOption={handleSelectOption}
        onSendReaction={(emoji) => socketRef.current?.sendReaction(emoji)}
        onNextSyncedQuestion={() => socketRef.current?.nextSyncedQuestion()}
      />
    );
  }

  // 4. Waiting For Others / Result Podium & Solutions
  return (
    <BattleResultView
      snapshot={snapshot}
      resultTab={resultTab}
      onSetResultTab={setResultTab}
      onExitToHome={handleExitToHome}
      onNewMatch={() => {
        clearBattleSession(roomId);
        socketRef.current?.disconnect();
        router.push("/battle");
      }}
    />
  );
}