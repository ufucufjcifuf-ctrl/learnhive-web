"use client";

import React, { useMemo } from "react";
import { Award, Check, Home, RefreshCw, X } from "lucide-react";
import { BattleRoomSnapshot } from "@/types";
import { CelebrationConfetti } from "@/components/CelebrationConfetti";
import { MathText } from "@/components/MathText";
import { PodiumCard, StandingRow } from "@/components/battle/BattleShared";

interface BattleResultViewProps {
  snapshot: BattleRoomSnapshot;
  resultTab: "RANKINGS" | "SOLUTIONS";
  onSetResultTab: (tab: "RANKINGS" | "SOLUTIONS") => void;
  onExitToHome: () => void;
  onNewMatch: () => void;
}

export const BattleResultView: React.FC<BattleResultViewProps> = ({
  snapshot,
  resultTab,
  onSetResultTab,
  onExitToHome,
  onNewMatch,
}) => {
  const finalRankings = useMemo(() => {
    if (snapshot.rankings.length > 0) return snapshot.rankings;
    return [...snapshot.players]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
        return b.correctCount - a.correctCount;
      })
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [snapshot.rankings, snapshot.players]);

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
            onClick={onExitToHome}
            className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Home size={16} /> হোমে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const podium = snapshot.podiumTop3.length > 0 ? snapshot.podiumTop3 : finalRankings.slice(0, 3);
  const myEntry = finalRankings.find((p) => p.uid === snapshot.myUid);
  const isTieAtTop =
    snapshot.winnerUid === null &&
    finalRankings.length >= 2 &&
    finalRankings[0].score === finalRankings[1].score &&
    finalRankings[0].correctCount + finalRankings[0].wrongCount > 0;
  const celebrate =
    finalRankings.length >= 4
      ? podium.some((p) => p.uid === snapshot.myUid)
      : snapshot.winnerUid === snapshot.myUid;

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
            onClick={() => onSetResultTab("RANKINGS")}
            data-card-surface="custom"
            className={`py-2.5 rounded-xl text-xs font-black transition ${
              resultTab === "RANKINGS" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            র‍্যাঙ্কিং ({finalRankings.length})
          </button>
          <button
            type="button"
            onClick={() => onSetResultTab("SOLUTIONS")}
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
                      if (isCorrect)
                        cls = "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold";
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
            onClick={onExitToHome}
            className="py-3.5 rounded-2xl bg-[#161620] hover:bg-[#1E1E2C] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Home size={16} /> হোমে ফিরুন
          </button>
          <button
            type="button"
            onClick={onNewMatch}
            data-card-surface="custom"
            className="py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw size={15} /> নতুন ম্যাচ
          </button>
        </div>
      </div>
    </div>
  );
};