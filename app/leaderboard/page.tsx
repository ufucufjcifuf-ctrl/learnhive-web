"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Trophy, Medal, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
  photoUrl?: string;
}

export default function LeaderboardPage() {
  const [topList, setTopList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const snap = await getDoc(doc(db, "public_leaderboards", "global"));
        if (snap.exists()) {
          setTopList(snap.data()?.topList || []);
        }
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: "bg-amber-400 text-black", border: "border-amber-400/50", label: "🥇" };
    if (rank === 2) return { bg: "bg-gray-300 text-black", border: "border-gray-300/50", label: "🥈" };
    if (rank === 3) return { bg: "bg-amber-700 text-white", border: "border-amber-700/50", label: "🥉" };
    return { bg: "bg-white/10 text-gray-300", border: "border-transparent", label: `#${rank}` };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-amber-400 flex items-center gap-2">
              <Trophy size={20} /> গ্লোবাল মেধা তালিকা (Top Rankers)
            </h1>
            <p className="text-[11px] text-gray-400">নিয়মিত পরীক্ষায় অংশগ্রহণকারীদের সম্মিলিত স্কোরবোর্ড</p>
          </div>
        </div>

        {/* টপ ৩ পডিয়াম (Podium Display) */}
        {!loading && topList.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8 items-end text-center">
            {/* ২য় স্থান */}
            <div className="bg-[#121218] border border-gray-400/20 p-4 rounded-3xl flex flex-col items-center h-44 justify-end">
              <span className="text-2xl mb-1">🥈</span>
              <span className="font-bold text-xs text-gray-200 line-clamp-1">{topList[1].name}</span>
              <span className="text-xs font-black text-gray-400 mt-1">{topList[1].score.toFixed(1)} Pts</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase mt-2">২য় স্থান</span>
            </div>

            {/* ১ম স্থান */}
            <div className="bg-gradient-to-t from-amber-500/15 to-[#121218] border border-amber-400/40 p-4 rounded-3xl flex flex-col items-center h-52 justify-end shadow-2xl shadow-amber-500/10">
              <span className="text-3xl mb-1 animate-bounce">👑</span>
              <span className="font-extrabold text-sm text-amber-300 line-clamp-1">{topList[0].name}</span>
              <span className="text-sm font-black text-amber-400 mt-1">{topList[0].score.toFixed(1)} Pts</span>
              <span className="text-[10px] font-black text-black bg-amber-400 px-2 py-0.5 rounded-full uppercase mt-2">
                চ্যাম্পিয়ন
              </span>
            </div>

            {/* ৩য় স্থান */}
            <div className="bg-[#121218] border border-amber-700/20 p-4 rounded-3xl flex flex-col items-center h-40 justify-end">
              <span className="text-2xl mb-1">🥉</span>
              <span className="font-bold text-xs text-gray-200 line-clamp-1">{topList[2].name}</span>
              <span className="text-xs font-black text-amber-600 mt-1">{topList[2].score.toFixed(1)} Pts</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase mt-2">৩য় স্থান</span>
            </div>
          </div>
        )}

        {/* তালিকা ভিউ */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-4 md:p-6 shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">মেধা তালিকা লোড হচ্ছে...</p>
            </div>
          ) : topList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {topList.map((user, idx) => {
                const badge = getRankBadge(idx + 1);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                      idx < 3 ? "bg-white/5 " + badge.border : "bg-white/[0.02] border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="font-bold text-sm text-white">{user.name}</span>
                    </div>
                    <span className="font-black text-sm text-cyan-400">{user.score.toFixed(1)} Pts</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-12 text-sm text-gray-500">এখনো কোনো মেধা তালিকা জেনারেট করা হয়নি।</p>
          )}
        </div>

      </div>
    </div>
  );
}