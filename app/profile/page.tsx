"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserProfile, signInWithGoogle, signOutUser, UserProfile } from "@/lib/authService";
import { evaluateAndAwardBadges, ALL_BADGES } from "@/lib/badgeService";
import { sounds } from "@/lib/soundEffects";
import {
  ArrowLeft,
  User as UserIcon,
  Award,
  Bookmark,
  BookOpen,
  Share2,
  LogOut,
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [badges, setBadges] = useState<string[]>(["newbie"]);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(sounds.enabled);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const p = await fetchUserProfile(fbUser.uid);
        setProfile(p);
        const awarded = await evaluateAndAwardBadges(p);
        setBadges(awarded);
      } else {
        setProfile(null);
        const awarded = await evaluateAndAwardBadges(null);
        setBadges(awarded);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleSound = () => {
    const state = sounds.toggleSound();
    setSoundOn(state);
    if (state) sounds.playClick();
  };

  const handleLogin = async () => {
    setLoading(true);
    const p = await signInWithGoogle();
    setProfile(p);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    setProfile(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl pb-24">
        
        {/* টপ ন্যাভবার */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-extrabold text-base md:text-lg">আমার প্রোফাইল</h1>
          </div>

          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white transition"
            title="সাউন্ড অন/অফ"
          >
            {soundOn ? <Volume2 size={15} className="text-cyan-400" /> : <VolumeX size={15} />}
            <span>{soundOn ? "সাউন্ড অন" : "মিউট"}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">প্রোফাইল লোড হচ্ছে...</p>
          </div>
        ) : !profile ? (
          /* লগইন না থাকলে */
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 text-center mt-6 shadow-2xl">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 mb-4 shadow-cyan-500/20 shadow-lg">
              <UserIcon size={32} />
            </div>
            <h2 className="text-xl font-black">লগইন করুন</h2>
            <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
              আপনার পরীক্ষার ফলাফল সংরক্ষণ, মেধা তালিকায় নাম দেখা এবং অর্জিত ব্যাজ দেখতে গুগল দিয়ে এক ক্লিকে লগইন করুন।
            </p>
            <button
              onClick={handleLogin}
              className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
            >
              Google দিয়ে লগইন করুন
            </button>
          </div>
        ) : (
          /* লগইন করা থাকলে */
          <div className="flex flex-col gap-6">
            
            {/* প্রোফাইল কার্ড */}
            <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xl">
                  {profile.name[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{profile.name}</h2>
                  {profile.isPremium && (
                    <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
                <span className="text-[11px] font-bold text-cyan-400 mt-2 inline-block">
                  গ্লোবাল স্কোর: {profile.totalScore.toFixed(1)} Pts
                </span>
              </div>
            </div>

            {/* অর্জিত ব্যাজ সমূহ (Android App-এর মতো) */}
            <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> অর্জিত ব্যাজ ও অ্যাচিভমেন্ট
              </h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((bId) => {
                  const badge = ALL_BADGES[bId];
                  if (!badge) return null;
                  return (
                    <div
                      key={bId}
                      title={badge.description}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-extrabold shadow-sm ${badge.color}`}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* কুইক অ্যাকশন বাটন সমূহ */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Link
                href="/bookmarks"
                className="bg-[#121218] border border-white/5 hover:border-cyan-500/30 p-4 rounded-2xl transition flex flex-col items-center gap-2"
              >
                <Bookmark size={20} className="text-cyan-400" />
                <span className="text-xs font-bold text-gray-200">বুকমার্ক</span>
              </Link>
              <Link
                href="/mistakes"
                className="bg-[#121218] border border-white/5 hover:border-purple-500/30 p-4 rounded-2xl transition flex flex-col items-center gap-2"
              >
                <BookOpen size={20} className="text-purple-400" />
                <span className="text-xs font-bold text-gray-200">মিসটেক</span>
              </Link>
              <Link
                href="/history"
                className="bg-[#121218] border border-white/5 hover:border-amber-500/30 p-4 rounded-2xl transition flex flex-col items-center gap-2"
              >
                <Award size={20} className="text-amber-400" />
                <span className="text-xs font-bold text-gray-200">হিস্ট্রি</span>
              </Link>
            </div>

            {/* রেফারেল কোড কার্ড */}
            <div className="bg-gradient-to-br from-[#121218] to-[#181822] border border-white/10 rounded-3xl p-6 shadow-xl flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">
                  আপনার রেফারেল কোড
                </span>
                <span className="text-xl font-mono font-black text-amber-400 tracking-wider">
                  {profile.referralCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-gray-300 transition"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? "কপি হয়েছে!" : "কপি"}
                </button>
                <Link
                  href="/referral"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-3 py-2 rounded-xl text-xs transition"
                >
                  বিস্তারিত
                </Link>
              </div>
            </div>

            {/* লগআউট বাটন */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs transition"
            >
              <LogOut size={16} /> লগআউট করুন
            </button>

          </div>
        )}
      </div>
    </div>
  );
}