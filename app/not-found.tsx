"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Search, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-6 text-center selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* ৪0৪ আর্ট */}
        <div className="relative mb-6">
          <span className="text-7xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-blue-600">
            404
          </span>
          <div className="w-16 h-1 bg-cyan-500 mx-auto rounded-full mt-2 shadow-lg shadow-cyan-500/50"></div>
        </div>

        <h2 className="text-xl font-black text-white">পেজটি খুঁজে পাওয়া যায়নি!</h2>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          আপনি যে লিংকটিতে প্রবেশের চেষ্টা করছেন তা হয়তো সরিয়ে ফেলা হয়েছে অথবা লিঙ্কটিতে কোনো বানান ভুল রয়েছে।
        </p>

        {/* অ্যাকশন বাটন সমূহ */}
        <div className="flex flex-col gap-2.5 mt-8">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <Home size={16} /> হোমপেজে ফিরে যান
          </Link>

          <Link
            href="/search"
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold py-3 rounded-2xl text-xs transition"
          >
            <Search size={16} /> অন্যান্য পরীক্ষা খুঁজুন
          </Link>
        </div>

      </div>
    </div>
  );
}