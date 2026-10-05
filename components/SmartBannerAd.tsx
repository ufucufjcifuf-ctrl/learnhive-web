"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SmartBannerAdProps {
  className?: string;
}

export const SmartBannerAd: React.FC<SmartBannerAdProps> = ({ className = "" }) => {
  const { isPro, loading } = useAuth();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    async function checkAdConfig() {
      try {
        const snap = await getDoc(doc(db, "configuration", "main"));
        if (snap.exists()) {
          const data = snap.data();
          // ফায়ারবেসের গ্লোবাল অ্যাড সুইচ চেক
          if (data?.adsEnabled === false || data?.bannerAdEnabled === false) {
            setAdsEnabled(false);
          }
        }
      } catch (e) {
        console.error("Ad config check failed", e);
      }
    }
    checkAdConfig();
  }, []);

  // যদি ইউজার PRO হয় অথবা অ্যাড বন্ধ থাকে, তবে কিছুই দেখাবে না
  if (loading || isPro || !adsEnabled) {
    return null;
  }

  return (
    <div className={`w-full max-w-4xl mx-auto my-4 p-4 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[#121218] to-purple-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl ${className}`}>
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
          <Sparkles size={18} />
        </div>
        <div>
          <h4 className="font-extrabold text-xs text-white">বিজ্ঞাপনমুক্ত পড়াশোনা চান?</h4>
          <p className="text-[11px] text-gray-400">প্রিমিয়াম মেম্বারশিপ নিয়ে সব পরীক্ষার পূর্ণাঙ্গ ব্যাখ্যা আনলক করুন।</p>
        </div>
      </div>

      <Link
        href="/premium"
        className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex-shrink-0"
      >
        <span>আপগ্রেড করুন</span>
        <ExternalLink size={12} />
      </Link>
    </div>
  );
};