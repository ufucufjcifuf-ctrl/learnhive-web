"use client";

import React from "react";
import { Users } from "lucide-react";

interface LiveJoinCardProps {
  examTitle: string;
  name: string;
  setName: (val: string) => void;
  roll: string;
  setRoll: (val: string) => void;
  totalQuestions: number;
  totalDurationMin: number;
  loadingQuestions: boolean;
  onJoin: () => void;
}

export const LiveJoinCard: React.FC<LiveJoinCardProps> = ({
  examTitle,
  name,
  setName,
  roll,
  setRoll,
  totalQuestions,
  totalDurationMin,
  loadingQuestions,
  onJoin,
}) => {
  return (
    <div className="w-full max-w-md p-6 mt-16 text-center">
      <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 mb-4 shadow-cyan-500/20 shadow-lg">
          <Users size={32} />
        </div>
        <h2 className="text-xl font-black text-white">{examTitle}</h2>
        <p className="text-xs text-gray-400 mt-1">লাইভ পরীক্ষায় অংশ নিতে নাম ও রোল নম্বর লিখুন।</p>

        {loadingQuestions ? (
          <p className="text-xs text-cyan-400 font-bold py-6 animate-pulse">প্রশ্নপত্র যাচাই হচ্ছে...</p>
        ) : totalQuestions === 0 ? (
          <p className="text-xs text-red-400 font-bold py-6">পরীক্ষার প্রশ্নপত্র পাওয়া যায়নি!</p>
        ) : (
          <div className="flex flex-col gap-3 mt-6 text-left">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">শিক্ষার্থীর নাম</label>
              <input
                type="text"
                placeholder="যেমন: তানভীর আহমেদ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">রোল / মোবাইল নম্বর</label>
              <input
                type="text"
                placeholder="যেমন: ROLL-101"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 bg-white/5 p-3 rounded-2xl my-2">
              <span>মোট প্রশ্ন: <b>{totalQuestions} টি</b></span>
              <span>সময়: <b>{totalDurationMin} মিনিট</b></span>
            </div>

            <button
              disabled={!name.trim() || !roll.trim()}
              onClick={onJoin}
              className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20 disabled:opacity-40"
            >
              পরীক্ষায় প্রবেশ করুন 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};