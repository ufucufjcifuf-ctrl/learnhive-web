"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserProfile, signInWithGoogle, signOutUser, UserProfile } from "@/lib/authService";
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
  Trash2,
  Award,
  Sparkles,
  Gamepad2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<"DARK" | "LIGHT" | "SYSTEM">("DARK");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const p = await fetchUserProfile(fbUser.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const p = await signInWithGoogle();
    if (p) setProfile(p);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    setProfile(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 pb-28 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl flex flex-col items-center">
        
        {/* টপ হেডার */}
        <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-extrabold text-base md:text-lg">আমার প্রোফাইল</h1>
          <div className="w-8" />
        </div>

        {/* অবতার: নিয়ন বর্ডার সহ (Android Parity) */}
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

        {/* নাম ও ইমেইল */}
        <h2 className="text-xl font-black text-white">{profile?.name || "Guest Student"}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{profile?.email || "সাইন-ইন করে পরীক্ষার ফলাফল ও স্কোর সেভ রাখুন"}</p>

        {/* অ্যাক্টিভিটি কার্ড ৩টি: Saved, Mistakes, History */}
        <div className="grid grid-cols-3 gap-3 w-full my-6">
          <Link href="/bookmarks" className="bg-[#121218] border border-cyan-500/30 hover:border-cyan-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg">
            <Bookmark size={24} className="text-cyan-400" />
            <span className="text-xs font-bold text-gray-200">Saved</span>
          </Link>

          <Link href="/mistakes" className="bg-[#121218] border border-red-500/30 hover:border-red-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg">
            <BookOpen size={24} className="text-red-400" />
            <span className="text-xs font-bold text-gray-200">Mistakes</span>
          </Link>

          <Link href="/history" className="bg-[#121218] border border-amber-500/30 hover:border-amber-500 p-4 rounded-3xl flex flex-col items-center gap-2 transition shadow-lg">
            <History size={24} className="text-amber-400" />
            <span className="text-xs font-bold text-gray-200">History</span>
          </Link>
        </div>

        {/* থিম সিলেক্টর (Appearance) */}
        <div className="w-full bg-[#121218] border border-white/5 rounded-3xl p-5 mb-4 shadow-xl">
          <span className="text-xs font-bold text-cyan-400 block mb-3">Appearance (থিম)</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setThemeMode("DARK")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "DARK" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Moon size={16} /> DARK
            </button>
            <button
              onClick={() => setThemeMode("LIGHT")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "LIGHT" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Sun size={16} /> LIGHT
            </button>
            <button
              onClick={() => setThemeMode("SYSTEM")}
              className={`py-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                themeMode === "SYSTEM" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400"
              }`}
            >
              <Monitor size={16} /> SYSTEM
            </button>
          </div>
        </div>

        {/* ১v১ ব্যাটল জয়েন বাটন */}
        <div className="w-full bg-gradient-to-r from-purple-900/30 via-[#121218] to-cyan-900/30 border border-purple-500/40 rounded-3xl p-4 mb-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <Gamepad2 size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">1v1 BATTLE হাব</h4>
              <p className="text-[11px] text-gray-400">বন্ধুদের সাথে লাইভ পরীক্ষা দিন</p>
            </div>
          </div>
          <Link href="/live" className="bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-2xl transition">
            খুলুন →
          </Link>
        </div>

        {/* Go Premium কার্ড */}
        <Link href="/premium" className="w-full bg-gradient-to-r from-amber-500/15 via-[#121218] to-orange-500/10 border border-amber-500/40 hover:border-amber-400 rounded-3xl p-5 mb-4 flex items-center justify-between shadow-xl transition">
          <div className="flex items-center gap-3.5">
            <Sparkles size={28} className="text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Go Premium 👑</h3>
              <p className="text-xs text-gray-400 mt-0.5">সব পরীক্ষার ব্যাখ্যা এবং সম্পূর্ণ বিজ্ঞাপনমুক্ত সুবিধা পান।</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-400" />
        </Link>

        {/* অপশন তালিকা */}
        <div className="w-full bg-[#121218] border border-white/5 rounded-3xl p-2 flex flex-col gap-1 mb-6 shadow-xl">
          <Link href="/referral" className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition">
            <div className="flex items-center gap-3">
              <Share2 size={16} className="text-emerald-400" />
              <span>Refer & Earn (রেফারেল প্রোগ্রাম)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>

          <Link href="/privacy" className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-cyan-400" />
              <span>Privacy Policy (প্রাইভেসি পলিসি)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>

          <Link href="/rules" className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-200 transition">
            <div className="flex items-center gap-3">
              <Award size={16} className="text-amber-400" />
              <span>Rules & Regulations (পরীক্ষার নিয়মাবলী)</span>
            </div>
            <ChevronRight size={16} className="text-gray-500" />
          </Link>
        </div>

        {/* লগইন / লগআউট বাটন */}
        {profile ? (
          <button
            onClick={handleLogout}
            className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg"
          >
            <LogOut size={16} /> LOGOUT (লগআউট করুন)
          </button>
        ) : (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-xl shadow-cyan-500/20"
          >
            Google দিয়ে লগইন করুন
          </button>
        )}

      </div>
    </div>
  );
}