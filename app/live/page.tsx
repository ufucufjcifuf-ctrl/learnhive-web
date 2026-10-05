"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCachedHomeLayout } from "@/lib/layoutService";
import { DashboardItem } from "@/types";
import { Users, Flame, Play, Copy, Check, ArrowLeft } from "lucide-react";

export default function LiveBatchHubPage() {
  const [exams, setExams] = useState<DashboardItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<DashboardItem | null>(null);
  const [batchName, setBatchName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCachedHomeLayout().then((items) => {
      setExams(items.filter((it) => it.type === "EXAM_FIREBASE"));
    });
  }, []);

  const handleCreateBatch = () => {
    if (!selectedExam) return;
    const rawCmd = selectedExam.command || selectedExam.id;
    // ইউনিক ব্যাচ আইডি জেনারেট
    const batchId = `${rawCmd}_batch_${Date.now()}`;
    const link = `${window.location.origin}/live/${encodeURIComponent(batchId)}?title=${encodeURIComponent(
      batchName || selectedExam.title
    )}`;
    setGeneratedLink(link);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="font-extrabold text-base md:text-lg text-red-400 flex items-center gap-2">
              <Flame size={20} className="fill-red-500 text-red-500" /> লাইভ ব্যাচ এক্সাম হাব (Live Batch Engine)
            </h1>
            <p className="text-[11px] text-gray-400">পুরো ক্লাসের জন্য লাইভ পরীক্ষার লিংক তৈরি করুন</p>
          </div>
        </div>

        {/* ইনফো ব্যানার */}
        <div className="bg-gradient-to-br from-red-500/15 via-[#161620] to-[#121218] border border-red-500/30 rounded-3xl p-6 mb-6 shadow-2xl text-center">
          <Users size={32} className="text-red-400 mx-auto mb-2" />
          <h2 className="text-lg font-black text-white">গ্রুপ বা ব্যাচের সবার পরীক্ষা নিন একসাথে</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
            যেকোনো পরীক্ষা সিলেক্ট করে ইনস্ট্যান্ট লিংক তৈরি করুন। লিংকটি শিক্ষার্থীদের দিলে তারা সরাসরি নাম-রোল দিয়ে পরীক্ষা দিতে পারবে এবং সাথে সাথে সম্পূর্ণ মেধা তালিকা দেখতে পাবে।
          </p>
        </div>

        {/* জেনারেটর ফর্ম */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">ব্যাচ / ক্লাসের নাম</label>
            <input
              type="text"
              placeholder="যেমন: HSC 26 Physics Weekly Test"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs md:text-sm text-white focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-2">পরীক্ষা বা বিষয় নির্বাচন করুন</label>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {exams.map((item) => {
                const isSelected = selectedExam?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedExam(item)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between text-xs transition ${
                      isSelected
                        ? "bg-red-500/15 border-red-500 text-red-300 font-bold"
                        : "bg-white/5 border-white/5 text-gray-300 hover:border-white/15"
                    }`}
                  >
                    <span>{item.title}</span>
                    {item.examConfig?.durationMinutes && (
                      <span className="text-[10px] text-gray-500 font-mono">{item.examConfig.durationMinutes}m</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleCreateBatch}
            disabled={!selectedExam}
            className="w-full mt-2 bg-red-500 hover:bg-red-400 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-red-500/20 disabled:opacity-40"
          >
            লাইভ পরীক্ষার লিংক তৈরি করুন 🚀
          </button>
        </div>

        {/* জেনারেট হওয়া লিংক বক্স */}
        {generatedLink && (
          <div className="bg-[#121218] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl animate-in fade-in duration-200">
            <span className="text-xs font-bold text-cyan-400 block mb-2">
              আপনার লাইভ ব্যাচ এক্সাম লিংক রেডি! 🎉
            </span>
            <div className="bg-black/50 border border-white/10 p-3 rounded-2xl flex justify-between items-center text-xs mb-3">
              <span className="text-gray-300 font-mono line-clamp-1 flex-1 mr-2">{generatedLink}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-cyan-500 text-black px-3 py-1.5 rounded-xl font-bold transition flex-shrink-0"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "কপি হয়েছে!" : "কপি"}</span>
              </button>
            </div>

            <button
              onClick={() => window.open(generatedLink, "_blank")}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center justify-center gap-1.5"
            >
              <Play size={14} /> পরীক্ষা প্রিভিউ দেখুন
            </button>
          </div>
        )}

      </div>
    </div>
  );
}