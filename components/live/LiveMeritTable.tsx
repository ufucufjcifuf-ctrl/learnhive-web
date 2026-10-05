"use client";

import React from "react";
import { Award, Download, Home } from "lucide-react";

export interface MeritItem {
  name: string;
  roll: string;
  score: number;
  timeTakenSec: number;
}

interface LiveMeritTableProps {
  examTitle: string;
  name: string;
  roll: string;
  finalScore: number | null;
  meritList: MeritItem[];
  loadingMerit: boolean;
  onExportCSV: () => void;
  onGoHome: () => void;
}

export const LiveMeritTable: React.FC<LiveMeritTableProps> = ({
  examTitle,
  name,
  roll,
  finalScore,
  meritList,
  loadingMerit,
  onExportCSV,
  onGoHome,
}) => {
  return (
    <div className="w-full max-w-3xl p-4 md:p-6 pb-24">
      <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 mb-6">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              পরীক্ষা সম্পন্ন হয়েছে
            </span>
            <h2 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2 mt-2">
              <Award size={24} /> ব্যাচ মেধা তালিকা (Live Merit List)
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              শিক্ষার্থী: <b className="text-white">{name}</b> | প্রাপ্ত নম্বর:{" "}
              <b className="text-cyan-400">{finalScore !== null ? finalScore.toFixed(2) : "-"}</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              disabled={meritList.length === 0}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shadow-lg shadow-emerald-500/20"
            >
              <Download size={14} /> রেজাল্ট শিট ডাউনলোড (Excel)
            </button>
            <button
              onClick={onGoHome}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300"
              title="হোমে ফিরুন"
            >
              <Home size={16} />
            </button>
          </div>
        </div>

        {loadingMerit ? (
          <p className="text-center py-12 text-sm text-gray-400 animate-pulse">মেধা তালিকা আপডেট হচ্ছে...</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {meritList.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                  item.roll === roll
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10"
                    : "bg-white/5 border-white/5 text-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? "bg-amber-400 text-black font-extrabold"
                        : idx === 1
                        ? "bg-gray-300 text-black font-extrabold"
                        : idx === 2
                        ? "bg-amber-700 text-white font-extrabold"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-white">{item.name}</h4>
                    <p className="text-[10px] text-gray-400">রোল: {item.roll}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-emerald-400 block">{item.score.toFixed(2)} Pts</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {Math.floor(item.timeTakenSec / 60)}m {item.timeTakenSec % 60}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};