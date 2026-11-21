"use client";

import React, { useState } from "react";
import { BattlePlayer } from "@/types";

export const EMOJIS = ["👏", "🔥", "😭", "🤯", "😂"];

export function PlayerAvatar({
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

export function PodiumCard({
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

export function StandingRow({
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
      <span
        className={`font-black text-sm flex-shrink-0 ${
          player.score >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {player.score} Pts
      </span>
    </div>
  );
}

export function LeaveModal({
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