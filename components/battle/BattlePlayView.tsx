"use client";

import React, { useMemo } from "react";
import { ArrowLeft, Check, Flag, Flame, X } from "lucide-react";
import {
  BattleConnectionState,
  BattlePlayer,
  BattleReactionPopup,
  BattleRoomSnapshot,
} from "@/types";
import { MathText } from "@/components/MathText";
import { sounds } from "@/lib/soundEffects";
import { EMOJIS, LeaveModal, PlayerAvatar } from "@/components/battle/BattleShared";

interface BattlePlayViewProps {
  snapshot: BattleRoomSnapshot;
  connState: BattleConnectionState;
  countdownSec: number;
  timeLeftSec: number;
  selectedOpt: number | null;
  isSubmitting: boolean;
  isAnswerLocked: boolean;
  isRevealing: boolean;
  revealingQIndex: number | null;
  correctIndices: number[];
  feedbackExplanation: string;
  lastEarnedPoints: number;
  lastWasCorrect: boolean;
  speedBanner: string | null;
  reactions: BattleReactionPopup[];
  errorMsg: string | null;
  showLeaveConfirm: boolean;
  onShowLeaveConfirm: (show: boolean) => void;
  onLeaveConfirmed: () => void;
  onSelectOption: (optIdx: number) => void;
  onSendReaction: (emoji: string) => void;
  onNextSyncedQuestion: () => void;
}

export const BattlePlayView: React.FC<BattlePlayViewProps> = ({
  snapshot,
  connState,
  countdownSec,
  timeLeftSec,
  selectedOpt,
  isSubmitting,
  isAnswerLocked,
  isRevealing,
  revealingQIndex,
  correctIndices,
  feedbackExplanation,
  lastEarnedPoints,
  lastWasCorrect,
  speedBanner,
  reactions,
  errorMsg,
  showLeaveConfirm,
  onShowLeaveConfirm,
  onLeaveConfirmed,
  onSelectOption,
  onSendReaction,
  onNextSyncedQuestion,
}) => {
  const sortedPlayers = useMemo(() => {
    return [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
      return b.correctCount - a.correctCount;
    });
  }, [snapshot.players]);

  const trackRacers = useMemo(() => {
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
  }, [sortedPlayers, snapshot.myUid]);

  const isHost = snapshot.hostUid === snapshot.myUid;
  const totalQ = snapshot.questions.length;
  const currentQIndex =
    snapshot.mode === "SYNCED"
      ? snapshot.syncedQIndex
      : revealingQIndex !== null
      ? revealingQIndex
      : snapshot.myQIndex;
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
              onClick={() => onShowLeaveConfirm(true)}
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
                    onClick={() => onSelectOption(idx)}
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
                onClick={onNextSyncedQuestion}
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
                onSendReaction(em);
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
          onConfirm={onLeaveConfirmed}
          onCancel={() => onShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
};