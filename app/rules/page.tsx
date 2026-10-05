"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react";
import { MathText } from "@/components/MathText";

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRules() {
      try {
        const snap = await getDoc(doc(db, "configuration", "main"));
        if (snap.exists()) {
          setRules(snap.data()?.rulesHtml || "বর্তমানে কোনো বিশেষ নিয়মাবলী দেওয়া হয়নি।");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-amber-400 flex items-center gap-2">
              <ShieldCheck size={20} /> নিয়মাবলী ও নির্দেশিকা (Rules & Regulations)
            </h1>
            <p className="text-[11px] text-gray-400">পরীক্ষার নেগেটিভ মার্কিং, সময় ও রেজাল্ট সংক্রান্ত তথ্য</p>
          </div>
        </div>

        {/* কনটেন্ট কার্ড */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl leading-relaxed text-sm md:text-base text-gray-200">
          {loading ? (
            <p className="text-gray-500 text-center py-12 animate-pulse">নির্দেশিকা লোড হচ্ছে...</p>
          ) : (
            <MathText text={rules} />
          )}
        </div>

      </div>
    </div>
  );
}