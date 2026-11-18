"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { MathText } from "@/components/MathText";
import { CelebrationConfetti } from "@/components/CelebrationConfetti";
import { sounds } from "@/lib/soundEffects";
import {
  BattleConnectionState,
  BattlePlayer,
  BattleReactionPopup,
  BattleRoomPreview,
  BattleRoomSnapshot,
} from "@/types";
import {
  ArrowLeft,
  Check,
  Copy,
  Flag,
  Flame,
  Gamepad2,
  Home,
  LogIn,
  RefreshCw,
  Share2,
  Smartphone,
  Users,
  Award,
  X,
} from "lucide-react";

const EMOJIS = ["👏", "🔥", "😭", "🤯", "😂"];

function PlayerAvatar({
  name,
  photoUrl,
  sizeClass = "w-10 h-10",
  borderClass = "border-cyan-400",
  textClass = "text-sm",
}: {
  name: string;
  photoUrl?: string | null;
  sizeClass?: string;
  borderClass?: string;
  textClass?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "?";

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border-2 ${borderClass} flex-shrink-0`}
      />
    );
  }

  return (
    <div
      data-card-surface="custom"
      className={`${sizeClass} rounded-full bg-gradient-to-tr from-cyan-600 to-purple-600 border-2 ${borderClass} flex items-center justify-center font-black text-white ${textClass} flex-shrink-0`}
    >
      {initial}
    </div>
  );
}

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
            // Reset pending refs if server moved past or reconnected cleanly
            if (!isRevealingRef.current) {
              pendingQRef.current = -1;
              lastTimedOutQRef.current = -1;
              setIsSubmitting(false);
            }
          }
          if (snap.mode === "SYNCED") {
            setIsAnswerLocked(snap.myAnswers[String(snap.syncedQIndex)] !== undefined);
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
        setSelectedOpt(locked.selectedIndex);
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
        // Clear cached session if a different authenticated user is now logged in
        if (user && existingSession.myUid !== user.uid) {
          clearBattleSession(roomId);
        } else {
          setPreviewLoaded(true);
          ensureSocketManager().connect(roomId, existingSession.wsUrl, existingSession.myUid);
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
      } else if (!snap.myHasFinished) {
        const qStart = snap.myQStartedAtMs > 0 ? snap.myQStartedAtMs : snap.startedAtMs;
        const endMs = qStart + snap.rules.timePerQuestion * 1000;
        const remMs = Math.max(0, endMs - now);
        setTimeLeftSec(Math.ceil(remMs / 1000));

        if (
          remMs === 0 &&
          !isRevealingRef.current &&
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
    if (!guestName.trim()) {
      setErrorMsg("অনুগ্রহ করে আপনার নাম লিখুন।");
      return;
    }
    setErrorMsg(null);
    setJoining(true);
    try {
      const joined = await joinBattleRoomApi(roomId, guestName.trim());
      saveBattleSession(roomId, joined.wsUrl, joined.uid);
      ensureSocketManager().connect(roomId, joined.wsUrl, joined.uid);
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

  const sortedPlayers = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
      return b.correctCount - a.correctCount;
    });
  }, [snapshot]);

  const trackRacers = useMemo(() => {
    if (!snapshot) return [];
    if (sortedPlayers.length <= 5) return sortedPlayers;
    const picked: BattlePlayer[] = [];
    const seen = new Set<string>();
    const add = (p?: BattlePlayer) => {
      if (p && !seen.has(p.uid)) {
        seen.add(p.uid);
        picked.push(p);
      }
    };
    sortedPlayers.slice(0, 3).forEach(add);
    const myIdx = sortedPlayers.findIndex((p) => p.uid === snapshot.myUid);
    if (myIdx >= 0) {
      if (myIdx > 0) add(sortedPlayers[myIdx - 1]);
      add(sortedPlayers[myIdx]);
    }
    return picked.slice(0, 5);
  }, [sortedPlayers, snapshot]);

  // =========================================================================
  // 1. LOADING / PRE-JOIN / GUEST ENTRY SCREEN
  // =========================================================================
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/battle"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
              ROOM: {roomId}
            </span>
          </div>

          {!previewLoaded || joining ? (
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

  const isHost = snapshot.hostUid === snapshot.myUid;

  // =========================================================================
  // 2. WAITING LOBBY SCREEN
  // =========================================================================
  if (snapshot.status === "waiting") {
    const canStart = snapshot.players.length >= 2;
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-20 selection:bg-cyan-500 selection:text-black relative overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-4 mb-5 border-b border-white/5">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <h1 className="font-extrabold text-sm md:text-base text-white">Group Battle Lobby</h1>
              <span
                className={`text-[10px] font-bold ${
                  connState === "CONNECTED"
                    ? "text-emerald-400"
                    : connState === "RECONNECTING"
                    ? "text-amber-400"
                    : "text-gray-400"
                }`}
              >
                {connState === "CONNECTED"
                  ? "● Live Connected"
                  : connState === "RECONNECTING"
                  ? "● Reconnecting..."
                  : "● Connecting..."}
              </span>
            </div>
            <div className="w-8" />
          </div>

          <p className="text-xs text-gray-400 font-semibold text-center mb-3">{snapshot.examTitle}</p>

          <div className="bg-[#121218] border border-cyan-500/60 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl shadow-cyan-500/10 mb-3">
            <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.2em] text-white">
              {snapshot.roomId}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
              title="কোড কপি করুন"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={handleShareRoom}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs px-4 py-2 rounded-xl transition"
            >
              <Share2 size={14} /> {copied ? "লিংক কপি হয়েছে!" : "বন্ধুদের ইনভাইট করুন"}
            </button>
            <span className="text-[11px] font-bold bg-white/5 border border-white/10 text-gray-300 px-3 py-2 rounded-xl">
              {snapshot.mode === "SYNCED" ? "⏱️ Synced" : "⚡ Speed Race"} •{" "}
              {snapshot.rules.questionCount} Qs • {snapshot.rules.timePerQuestion}s/Q
            </span>
          </div>

          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="w-full flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <Users size={16} className="text-amber-400" /> যুক্ত প্লেয়ারসমূহ
            </span>
            <span className="text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
              {snapshot.players.length} / {snapshot.rules.maxPlayers}
            </span>
          </div>

          <div className="w-full bg-[#121218] border border-white/10 rounded-3xl p-5 mb-5 shadow-xl">
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {snapshot.players.map((p) => {
                const pHost = p.uid === snapshot.hostUid;
                const pMe = p.uid === snapshot.myUid;
                return (
                  <div key={p.uid} className="w-20 flex flex-col items-center text-center">
                    <div className="relative">
                      <PlayerAvatar
                        name={p.name}
                        photoUrl={p.photoUrl}
                        sizeClass="w-14 h-14"
                        borderClass={pHost ? "border-amber-400" : pMe ? "border-cyan-400" : "border-emerald-400"}
                        textClass="text-lg"
                      />
                      <span
                        className={`w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 border-[#121218] ${
                          p.isOnline ? "bg-emerald-400" : "bg-gray-500"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-white mt-1.5 truncate w-full">
                      {p.name}
                    </span>
                    {pHost ? (
                      <span className="text-[9px] font-black text-amber-400">HOST</span>
                    ) : pMe ? (
                      <span className="text-[9px] font-black text-cyan-400">YOU</span>
                    ) : p.isGuest ? (
                      <span className="text-[9px] font-bold text-gray-500">GUEST</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-6">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => socketRef.current?.sendReaction(em)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-lg flex items-center justify-center transition active:scale-90"
              >
                {em}
              </button>
            ))}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={() => {
                setErrorMsg(null);
                socketRef.current?.startBattle();
              }}
              data-card-surface="custom"
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black py-4 rounded-2xl text-sm transition shadow-xl shadow-emerald-500/20"
            >
              {canStart
                ? `ব্যাটল শুরু করুন (${snapshot.players.length} জন) 🚀`
                : "কমপক্ষে ২ জন প্লেয়ার প্রয়োজন"}
            </button>
          ) : (
            <div className="w-full bg-cyan-500/10 border border-cyan-500/35 rounded-2xl p-4 text-center text-xs font-bold text-cyan-300">
              হোস্ট ম্যাচ শুরু করার জন্য অপেক্ষা করা হচ্ছে...
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-12 pointer-events-none flex justify-center z-40">
          {reactions.map((r, idx) => (
            <div
              key={r.id}
              style={{ marginLeft: `${((idx % 5) - 2) * 44}px` }}
              className="animate-float-up text-3xl"
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {showLeaveConfirm && (
          <LeaveModal
            isHost={isHost}
            onConfirm={handleLeaveConfirmed}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. LIVE BATTLE PLAY SCREEN (RACE / SYNCED)
  // =========================================================================
  const showResultScreen =
    snapshot.status === "finished" || (snapshot.myHasFinished && !isRevealing);

  if (!showResultScreen && snapshot.status === "playing") {
    const totalQ = snapshot.questions.length;
    const currentQIndex =
      snapshot.mode === "SYNCED" ? snapshot.syncedQIndex : snapshot.myQIndex;
    const question = snapshot.questions[currentQIndex];
    const myRank = sortedPlayers.findIndex((p) => p.uid === snapshot.myUid) + 1 || 1;
    const isStreakFire = snapshot.myStreak >= 3;
    const totalTimeForBar =
      snapshot.mode === "SYNCED" && isRevealing ? 4 : Math.max(1, snapshot.rules.timePerQuestion);
    const barPct = Math.min(100, Math.max(0, (timeLeftSec / totalTimeForBar) * 100));

    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-20 selection:bg-cyan-500 selection:text-black relative overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                title="ম্যাচ ছাড়ুন"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-xs px-3 py-1.5 rounded-full">
                Rank #{myRank} / {snapshot.players.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {snapshot.myStreak >= 2 && (
                <span className="bg-orange-500/20 border border-orange-500 text-orange-300 font-black text-xs px-3 py-1.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Flame size={14} className="fill-orange-400 text-orange-400" /> {snapshot.myStreak}x
                </span>
              )}
              <span className="bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-black text-xs px-3.5 py-1.5 rounded-full">
                {snapshot.myScore} Pts
              </span>
            </div>
          </div>

          {connState === "RECONNECTING" && (
            <div className="text-center text-[11px] font-bold text-amber-400 animate-pulse">
              লাইভ ম্যাচ রিকানেক্ট হচ্ছে...
            </div>
          )}

          <div className="bg-[#121218] border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
            <div className="relative h-11 flex items-center">
              <div className="w-full h-1.5 bg-white/10 rounded-full" />
              <Flag size={16} className="text-amber-400 absolute right-0 top-3" />

              {trackRacers.map((p) => {
                const pct = Math.min(92, Math.max(0, (p.qIndex / Math.max(1, totalQ)) * 90));
                const isMe = p.uid === snapshot.myUid;
                return (
                  <div
                    key={p.uid}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 flex flex-col items-center transition-all duration-300 ease-out"
                  >
                    <PlayerAvatar
                      name={p.name}
                      photoUrl={p.photoUrl}
                      sizeClass={isMe ? "w-7 h-7" : "w-6 h-6"}
                      borderClass={isMe ? "border-cyan-400" : "border-amber-400"}
                      textClass="text-[10px]"
                    />
                    <span
                      className={`text-[9px] font-bold leading-none mt-0.5 ${
                        isMe ? "text-cyan-400" : "text-gray-400"
                      }`}
                    >
                      {isMe ? "YOU" : p.name.slice(0, 4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {speedBanner && (
            <div className="bg-amber-500/15 border border-amber-500/45 text-amber-300 text-xs font-extrabold px-3.5 py-2 rounded-xl text-center animate-in fade-in duration-150">
              {speedBanner}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/15 border border-red-500/35 text-red-300 text-xs font-bold px-3.5 py-2 rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-cyan-400">
                প্রশ্ন {Math.min(currentQIndex + 1, totalQ)} / {totalQ}
              </span>
              <span className={timeLeftSec <= 5 ? "text-red-400 font-black" : "text-emerald-400 font-black"}>
                {snapshot.mode === "SYNCED" && isRevealing
                  ? `পরবর্তী প্রশ্ন ${timeLeftSec}s`
                  : `${timeLeftSec}s বাকি`}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                style={{ width: `${barPct}%` }}
                className={`h-full transition-all duration-200 ${
                  timeLeftSec <= 5 ? "bg-red-500" : "bg-emerald-400"
                }`}
              />
            </div>
          </div>

          {question && (
            <div
              className={`bg-[#121218] rounded-3xl p-5 md:p-7 border transition-all shadow-2xl ${
                isStreakFire
                  ? "border-orange-500 shadow-[0_0_24px_rgba(255,109,0,0.28)]"
                  : "border-white/10"
              }`}
            >
              <div className="text-base md:text-lg font-bold text-white leading-relaxed mb-5">
                <MathText text={question.text} />
              </div>

              <div className="flex flex-col gap-2.5">
                {question.options.map((opt, idx) => {
                  const isSelected = selectedOpt === idx;
                  const isCorrectOpt = correctIndices.includes(idx);

                  let boxCls = "bg-white/5 border-white/10 text-gray-200 hover:border-white/25";
                  if (isRevealing && isCorrectOpt) {
                    boxCls = "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold";
                  } else if (isRevealing && isSelected && !isCorrectOpt) {
                    boxCls = "bg-red-500/20 border-red-500 text-red-200";
                  } else if (isSelected) {
                    boxCls = "bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSubmitting || isRevealing || isAnswerLocked || countdownSec > 0}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-3.5 md:p-4 rounded-2xl border text-left text-sm flex items-center gap-3 transition ${boxCls}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black text-cyan-400 flex-shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 overflow-x-auto no-scrollbar">
                        <MathText text={opt} />
                      </span>
                      {isRevealing && isCorrectOpt && (
                        <Check size={16} className="text-emerald-400 flex-shrink-0" />
                      )}
                      {isRevealing && isSelected && !isCorrectOpt && (
                        <X size={16} className="text-red-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswerLocked && !isRevealing && (
                <p className="text-xs font-bold text-cyan-400 mt-4">
                  উত্তর লক করা হয়েছে! সবার উত্তর শেষ হওয়ার জন্য অপেক্ষা করুন...
                </p>
              )}

              {isRevealing && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  {snapshot.mode === "RACE" && (
                    <span
                      className={`text-sm font-black block mb-1 ${
                        lastWasCorrect ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {lastEarnedPoints > 0 ? `+${lastEarnedPoints} Pts` : `${lastEarnedPoints} Pts`}
                    </span>
                  )}
                  {feedbackExplanation && (
                    <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl mt-1">
                      <MathText text={feedbackExplanation} />
                    </div>
                  )}
                </div>
              )}

              {snapshot.mode === "SYNCED" && isHost && (
                <button
                  type="button"
                  onClick={() => socketRef.current?.nextSyncedQuestion()}
                  className="w-full mt-4 py-2.5 rounded-xl border border-cyan-500/50 text-cyan-300 font-bold text-xs hover:bg-cyan-500/10 transition"
                >
                  {isRevealing ? "এখনই পরের প্রশ্নে যান →" : "এখনই উত্তর দেখান"}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-evenly items-center pt-1">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  socketRef.current?.sendReaction(em);
                }}
                className="w-11 h-11 rounded-full bg-[#121218] hover:bg-white/10 border border-white/10 text-xl flex items-center justify-center transition active:scale-90"
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-16 pointer-events-none flex justify-center z-40">
          {reactions.map((r, idx) => (
            <div
              key={r.id}
              style={{ marginLeft: `${((idx % 5) - 2) * 48}px` }}
              className="animate-float-up flex flex-col items-center"
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                {r.name.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>

        {countdownSec > 0 && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <span className="text-cyan-400 font-black tracking-widest text-sm mb-3">GET READY!</span>
            <span className="text-amber-400 font-black text-8xl animate-bounce">{countdownSec}</span>
          </div>
        )}

        {showLeaveConfirm && (
          <LeaveModal
            isHost={isHost}
            onConfirm={handleLeaveConfirmed}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // 4. WAITING FOR OTHERS / RESULT PODIUM & SOLUTIONS SCREEN
  // =========================================================================
  const finalRankings =
    snapshot.rankings.length > 0
      ? snapshot.rankings
      : sortedPlayers.map((p, i) => ({ ...p, rank: i + 1 }));
  const podium = snapshot.podiumTop3.length > 0 ? snapshot.podiumTop3 : finalRankings.slice(0, 3);
  const myEntry = finalRankings.find((p) => p.uid === snapshot.myUid);
  const isTieAtTop =
    snapshot.winnerUid === null &&
    finalRankings.length >= 2 &&
    finalRankings[0].score === finalRankings[1].score &&
    finalRankings[0].correctCount + finalRankings[0].wrongCount > 0;
  const celebrate =
    snapshot.status === "finished" &&
    (finalRankings.length >= 4
      ? podium.some((p) => p.uid === snapshot.myUid)
      : snapshot.winnerUid === snapshot.myUid);

  if (snapshot.status !== "finished") {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-20">
        <div className="w-full max-w-xl flex flex-col items-center text-center mt-6">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-black text-white">
            অন্যান্য প্লেয়ারদের শেষ হওয়ার জন্য অপেক্ষা করা হচ্ছে...
          </h2>
          <p className="text-xs text-gray-400 mt-1 mb-6">
            সবার খেলা শেষ হলেই ফাইনাল পডিয়াম ও সমাধান দেখা যাবে।
          </p>

          <div className="w-full flex flex-col gap-2.5 mb-6 text-left">
            {finalRankings.map((p, idx) => (
              <StandingRow key={p.uid} rank={idx + 1} player={p} isMe={p.uid === snapshot.myUid} />
            ))}
          </div>

          <button
            type="button"
            onClick={handleExitToHome}
            className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Home size={16} /> হোমে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-24 selection:bg-cyan-500 selection:text-black">
      {celebrate && <CelebrationConfetti />}

      <div className="w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl font-black text-center mt-2 text-amber-400">
          {snapshot.winnerUid === snapshot.myUid
            ? "CHAMPION! 🏆"
            : isTieAtTop && myEntry?.score === finalRankings[0].score
            ? "IT'S A TIE! 🤝"
            : (myEntry?.rank || 99) <= 3
            ? "PODIUM FINISH! 🎉"
            : "MATCH COMPLETED!"}
        </h1>

        {myEntry && !myEntry.isGuest && (
          <div className="mt-3 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
            <Award size={15} />
            <span>
              Global XP Earned:{" "}
              {(myEntry.globalXP || 0) >= 0
                ? `+${(myEntry.globalXP || 0).toFixed(2)}`
                : (myEntry.globalXP || 0).toFixed(2)}
            </span>
          </div>
        )}

        {podium.length > 0 && (
          <div className="w-full grid grid-cols-3 gap-2.5 items-end mt-6 mb-6">
            {podium[1] ? (
              <PodiumCard
                player={podium[1]}
                label="🥈 #2"
                heightCls="h-24"
                accent="border-gray-300 text-gray-200 bg-gray-400/10"
                isMe={podium[1].uid === snapshot.myUid}
              />
            ) : (
              <div />
            )}
            {podium[0] ? (
              <PodiumCard
                player={podium[0]}
                label="👑 #1"
                heightCls="h-32"
                accent="border-amber-400 text-amber-300 bg-amber-500/15"
                isMe={podium[0].uid === snapshot.myUid}
              />
            ) : (
              <div />
            )}
            {podium[2] ? (
              <PodiumCard
                player={podium[2]}
                label="🥉 #3"
                heightCls="h-20"
                accent="border-amber-700 text-amber-500 bg-amber-700/15"
                isMe={podium[2].uid === snapshot.myUid}
              />
            ) : (
              <div />
            )}
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-2 bg-[#121218] p-1.5 rounded-2xl border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setResultTab("RANKINGS")}
            data-card-surface="custom"
            className={`py-2.5 rounded-xl text-xs font-black transition ${
              resultTab === "RANKINGS" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            র‍্যাঙ্কিং ({finalRankings.length})
          </button>
          <button
            type="button"
            onClick={() => setResultTab("SOLUTIONS")}
            data-card-surface="custom"
            className={`py-2.5 rounded-xl text-xs font-black transition ${
              resultTab === "SOLUTIONS" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            সমাধান ({snapshot.questions.length})
          </button>
        </div>

        {resultTab === "RANKINGS" ? (
          <div className="w-full flex flex-col gap-2.5 mb-6">
            {finalRankings.map((p, idx) => (
              <StandingRow
                key={p.uid}
                rank={p.rank || idx + 1}
                player={p}
                isMe={p.uid === snapshot.myUid}
              />
            ))}
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4 mb-6">
            {snapshot.questions.map((q, qIdx) => {
              const ans = snapshot.solutionsMap[q.id];
              const actualCorrect =
                ans?.c && ans.c.length > 0 ? ans.c : ans && ans.i !== -1 ? [ans.i] : [];
              const myAns = snapshot.myAnswers[String(qIdx)];

              return (
                <div
                  key={q.id || qIdx}
                  className="bg-[#121218] border border-white/10 rounded-3xl p-5 shadow-xl"
                >
                  <span className="text-xs font-extrabold text-cyan-400 block mb-2">
                    প্রশ্ন #{qIdx + 1}
                  </span>
                  <div className="text-sm md:text-base font-bold text-white mb-4">
                    <MathText text={q.text} />
                  </div>

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = actualCorrect.includes(oIdx);
                      const isMine = myAns === oIdx;
                      let cls = "bg-white/5 border-white/5 text-gray-300";
                      if (isCorrect) cls = "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold";
                      else if (isMine) cls = "bg-red-500/15 border-red-500 text-red-300";

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${cls}`}
                        >
                          <span className="font-black text-cyan-400">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <span className="flex-1">
                            <MathText text={opt} />
                          </span>
                          {isCorrect && <Check size={14} className="text-emerald-400" />}
                          {!isCorrect && isMine && <X size={14} className="text-red-400" />}
                        </div>
                      );
                    })}
                  </div>

                  {ans?.e && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      <span className="font-bold text-amber-400 block mb-0.5">💡 ব্যাখ্যা:</span>
                      <MathText text={ans.e} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExitToHome}
            className="py-3.5 rounded-2xl bg-[#161620] hover:bg-[#1E1E2C] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Home size={16} /> হোমে ফিরুন
          </button>
          <button
            type="button"
            onClick={() => {
              clearBattleSession(roomId);
              socketRef.current?.disconnect();
              router.push("/battle");
            }}
            data-card-surface="custom"
            className="py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw size={15} /> নতুন ম্যাচ
          </button>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  player,
  label,
  heightCls,
  accent,
  isMe,
}: {
  player: BattlePlayer;
  label: string;
  heightCls: string;
  accent: string;
  isMe: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <PlayerAvatar
        name={player.name}
        photoUrl={player.photoUrl}
        sizeClass={label.includes("#1") ? "w-14 h-14" : "w-11 h-11"}
        borderClass={label.includes("#1") ? "border-amber-400" : "border-gray-300"}
      />
      <span className="text-[11px] font-bold text-white truncate max-w-full mt-1.5 px-1">
        {isMe ? `${player.name} (You)` : player.name}
      </span>
      <div
        className={`w-full ${heightCls} mt-1.5 rounded-t-2xl border ${accent} flex flex-col items-center justify-center p-2`}
      >
        <span className="font-black text-xs">{label}</span>
        <span className="font-extrabold text-xs text-white mt-0.5">{player.score} Pts</span>
      </div>
    </div>
  );
}

function StandingRow({
  rank,
  player,
  isMe,
}: {
  rank: number;
  player: BattlePlayer;
  isMe: boolean;
}) {
  const rankBadge =
    rank === 1
      ? "bg-amber-400 text-black"
      : rank === 2
      ? "bg-gray-300 text-black"
      : rank === 3
      ? "bg-amber-700 text-white"
      : "bg-white/10 text-gray-300";

  return (
    <div
      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
        isMe ? "bg-cyan-500/15 border-cyan-500" : "bg-[#121218] border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          data-card-surface="custom"
          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${rankBadge}`}
        >
          #{rank}
        </span>
        <PlayerAvatar name={player.name} photoUrl={player.photoUrl} sizeClass="w-9 h-9" />
        <div className="min-w-0">
          <div className="font-bold text-xs sm:text-sm text-white truncate">
            {isMe ? `${player.name} (You)` : player.name}
          </div>
          <div className="text-[10px] text-gray-400">
            ✓{player.correctCount} ✗{player.wrongCount} • {(player.totalTimeMs / 1000).toFixed(1)}s
          </div>
        </div>
      </div>
      <span className={`font-black text-sm flex-shrink-0 ${player.score >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {player.score} Pts
      </span>
    </div>
  );
}

function LeaveModal({
  isHost,
  onConfirm,
  onCancel,
}: {
  isHost: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
        <h3 className="text-base font-black text-red-400 mb-2">ব্যাটল রুম ছেড়ে যাবেন?</h3>
        <p className="text-xs text-gray-400 mb-5">
          {isHost
            ? "আপনি বের হলে হোস্টের নিয়ন্ত্রণ স্বয়ংক্রিয়ভাবে পরবর্তী প্লেয়ারের কাছে চলে যাবে।"
            : "ম্যাচ ছেড়ে বের হলে আপনার বর্তমান প্রোগ্রেস ফরফিট হবে।"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 font-bold text-xs"
          >
            থাকুন
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-card-surface="custom"
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-xs"
          >
            বের হন
          </button>
        </div>
      </div>
    </div>
  );
}