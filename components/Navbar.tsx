"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { signInWithGoogle } from "@/lib/authService";
import { Search, Sparkles, User as UserIcon } from "lucide-react";

export const Navbar: React.FC = () => {
  const { profile, isPro, loading } = useAuth();

  return (
    <nav className="w-full flex justify-between items-center py-3.5 px-4 md:px-8 border-b border-white/5 bg-[#0A0A0E]/80 backdrop-blur-md sticky top-0 z-40">
      
      {/* ব্র্যান্ড লোগো */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-lg shadow-cyan-500/30 shadow-md text-white">
          H
        </div>
        <div>
          <span className="font-black text-sm md:text-base tracking-wider text-white">LEARN HIVE</span>
          <span className="text-[9px] text-cyan-400 font-bold block leading-none">WEB PORTAL</span>
        </div>
      </Link>

      {/* অ্যাকশন বাটন সমূহ */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* সার্চ বাটন */}
        <Link
          href="/search"
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl text-xs transition"
          title="সার্চ করুন"
        >
          <Search size={14} />
          <span className="hidden sm:inline">খুঁজুন...</span>
        </Link>

        {/* প্রো ব্যাজ / আপগ্রেড বাটন */}
        <Link
          href="/premium"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition border ${
            isPro
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-amber-400 hover:bg-amber-300 text-black border-transparent shadow-amber-400/20 shadow-sm"
          }`}
        >
          <Sparkles size={13} />
          {isPro ? "PRO USER" : "PRO নিন"}
        </Link>

        {/* ইউজার প্রোফাইল বাটন */}
        {loading ? (
          <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse"></div>
        ) : profile ? (
          <Link href="/profile" className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="Avatar" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                {profile.name[0]}
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition"
          >
            <UserIcon size={14} className="text-cyan-400" />
            <span>লগইন</span>
          </button>
        )}
      </div>

    </nav>
  );
};