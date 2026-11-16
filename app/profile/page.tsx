"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signOutUser } from "@/lib/authService";
import { useAuth } from "@/lib/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { ALL_BADGES, evaluateUserBadges } from "@/lib/badgeService";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  History,
  Moon,
  Sun,
  Monitor,
  Share2,
  Lock,
  ChevronRight,
  LogOut,
  Award,
  Sparkles,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isPro, loading, refreshProfile } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [authBusy, setAuthBusy] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    const { user, error } = await signInWithGoogle();
    if (error) {
      alert(error);
    } else if (user) {
      await refreshProfile();
    }
    setAuthBusy(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    await refreshProfile();
    router.refresh();
  };

  const badges = profile ? evaluateUserBadges(profile) : [];

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-28 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-white/5">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-extrabold text-base md:text-lg">আমার প্রোফাইল</h1>
          <div className="w-8" />
        </div>

        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-cyan-400 via-yellow-400 to-red-500 shadow-xl shadow-cyan-500/20">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-[#161620] flex items-center justify-center text-3xl font-black text-cyan-400">
                {profile?.name ? profile.name[0].toUpperCase() : "G"}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-black text-white flex items-center gap-2">
          {profile?.name || "Guest Student"}
          {isPro && (
            <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {profile?.email && !profile.email.endsWith("@mcqhub.com")
            ? profile.email
            : profile?.username
            ? `@${profile.username}`
            : "সাইন-ইন করে পরীক্ষার ফলাফল ও স্কোর সেভ রাখুন"}
        </p>

        {profile && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded-full">
              গ্লোবাল স্কোর: {(profile.totalScore || 0).toFixed(1)} Pts
            </span>
            {badges.map((bId) => {
              const badge = ALL_BADGES[bId];
              if (!badge) return null;
              return (
                <span
                  key={bId}
                  title={badge.description}
                  className={`text-[11px] font-bold border px-3 py-1 rounded-full ${badge.color}`}
                >
                  {badge.icon} {badge.name}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 w-full my-6">
          <Link
            href="/bookmarks"
            className="bg-[#121218] border border-cyan-500/30 hover:border-cyan-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg"
          >
            <Bookmark size={24} className="text-cyan-400" />
            <span className="text-xs font-bold text-gray-200">Saved</span>
          </Link>

          <Link
            href="/mistakes"
            className="bg-[#121218] border border-red-500/30 hover:border-red-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg"
          >
            <BookOpen size={24} className="text-red-400" />
            <span className="text-xs font-bold text-gray-200">Mistakes</span>
          </Link>

          <Link
            href="/history"
            className="bg-[#121218] border border-amber-500/30 hover:border-amber-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg"
          >
            <History size={24} className="text-amber-400" />
            <span className="text-xs font-bold text-gray-200">History</span>
          </Link>
        </div>

        <div className="w-full bg-[#121218] border border-white/5 rounded-3xl p-5 mb-4 shadow-xl">
          <span className="text-xs font-bold text-cyan-400 block mb-3">Appearance (থিম)</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setThemeMode("DARK")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "DARK"
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Moon size={16} /> DARK
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("LIGHT")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "LIGHT"
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Sun size={16} /> LIGHT
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("SYSTEM")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "SYSTEM"
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Monitor size={16} /> SYSTEM
            </button>
          </div>
        </div>

        <div className="w-full bg-gradient-to-r from-purple-900/30 via-[#121218] to-cyan-900/30 border border-purple-500/40 rounded-3xl p-4 mb-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <Gamepad2 size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">লাইভ ব্যাচ হাব</h4>
              <p className="text-[11px] text-gray-400">বন্ধুদের সাথে একসাথে পরীক্ষা দিন</p>
            </div>
          </div>
          <Link
            href="/live"
            className="bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-2xl transition"
          >
            খুলুন →
          </Link>
        </div>

        <Link
          href="/premium"
          className="w-full bg-gradient-to-r from-amber-500/15 via-[#121218] to-orange-500/10 border border-amber-500/40 hover:border-amber-400 rounded-3xl p-5 mb-4 flex items-center justify-between shadow-xl transition"
        >
          <div className="flex items-center gap-3.5">
            <Sparkles size={28} className="text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Go Premium 👑</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                সব পরীক্ষার ব্যাখ্যা এবং সম্পূর্ণ বিজ্ঞাপনমুক্ত সুবিধা পান।
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-400" />
        </Link>

        <div className="w-full bg-[#121218] border border-white/5 rounded-3xl p-2 flex flex-col gap-1 mb-6 shadow-xl">
          <Link
            href="/referral"
            className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition"
          >
            <div className="flex items-center gap-3">
              <Share2 size={16} className="text-emerald-400" />
              <span>Refer & Earn (রেফারেল প্রোগ্রাম)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>

          <Link
            href="/privacy"
            className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition"
          >
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-cyan-400" />
              <span>Privacy Policy (প্রাইভেসি পলিসি)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>

          <Link
            href="/rules"
            className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition"
          >
            <div className="flex items-center gap-3">
              <Award size={16} className="text-amber-400" />
              <span>Rules & Regulations (পরীক্ষার নিয়মাবলী)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>
        </div>

        {profile ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg"
          >
            <LogOut size={16} /> LOGOUT (লগআউট করুন)
          </button>
        ) : (
          <div className="w-full flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-xl shadow-cyan-500/20"
            >
              ইউজারনেম / ইমেইল দিয়ে লগইন করুন
            </Link>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || authBusy}
              className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {authBusy ? "সাইন-ইন হচ্ছে..." : "Google দিয়ে দ্রুত লগইন করুন"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}