"use client";

import React from "react";
import { ArrowLeft, Check, Copy, Share2, Users } from "lucide-react";
import { BattleConnectionState, BattleReactionPopup, BattleRoomSnapshot } from "@/types";
import { EMOJIS, LeaveModal, PlayerAvatar } from "@/components/battle/BattleShared";

interface BattleLobbyViewProps {
  snapshot: BattleRoomSnapshot;
  connState: BattleConnectionState;
  copied: boolean;
  errorMsg: string | null;
  reactions: BattleReactionPopup[];
  showLeaveConfirm: boolean;
  onShowLeaveConfirm: (show: boolean) => void;
  onLeaveConfirmed: () => void;
  onCopyCode: () => void;
  onShareRoom: () => void;
  onSendReaction: (emoji: string) => void;
  onStartBattle: () => void;
}

export const BattleLobbyView: React.FC<BattleLobbyViewProps> = ({
  snapshot,
  connState,
  copied,
  errorMsg,
  reactions,
  showLeaveConfirm,
  onShowLeaveConfirm,
  onLeaveConfirmed,
  onCopyCode,
  onShareRoom,
  onSendReaction,
  onStartBattle,
}) => {
  const isHost = snapshot.hostUid === snapshot.myUid;
  const canStart = snapshot.players.length >= 2;

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-20 selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-4 mb-5 border-b border-white/5">
          <button
            type="button"
            onClick={() => onShowLeaveConfirm(true)}
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
            onClick={onCopyCode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
            title="কোড কপি করুন"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={onShareRoom}
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
                      borderClass={
                        pHost ? "border-amber-400" : pMe ? "border-cyan-400" : "border-emerald-400"
                      }
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
              onClick={() => onSendReaction(em)}
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
            onClick={onStartBattle}
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
          onConfirm={onLeaveConfirmed}
          onCancel={() => onShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
};