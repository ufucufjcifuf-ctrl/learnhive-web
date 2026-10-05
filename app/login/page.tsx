"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/authService";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    const { user, error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
    } else if (user) {
      router.push("/profile");
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const user = await signInWithGoogle();
    setLoading(false);
    if (user) {
      router.push("/profile");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative">
        
        {/* টপ ব্যাক বাটন */}
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1.5 text-xs font-bold transition"
        >
          <ArrowLeft size={16} /> হোমপেজে ফিরুন
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-white mx-auto shadow-lg shadow-cyan-500/30 mb-3">
            H
          </div>
          <h1 className="text-2xl font-black tracking-wide">লগইন করুন</h1>
          <p className="text-xs text-gray-400 mt-1">আপনার Learn Hive অ্যাকাউন্টে প্রবেশ করুন</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs text-gray-300 font-bold block mb-1">ইমেইল অ্যাড্রেস</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-white focus:border-cyan-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-300 font-bold block mb-1">পাসওয়ার্ড</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-3 text-xs md:text-sm text-white focus:border-cyan-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <LogIn size={16} /> {loading ? "লগইন হচ্ছে..." : "সাইন-ইন করুন"}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-3 text-[11px] text-gray-500 font-bold uppercase">অথবা</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* গুগল লগইন বাটন */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-xs font-bold text-gray-200 transition flex items-center justify-center gap-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google দিয়ে সাইন-ইন
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          অ্যাকাউন্ট নেই?{" "}
          <Link href="/signup" className="text-cyan-400 font-extrabold hover:underline">
            নতুন অ্যাকাউন্ট খুলুন
          </Link>
        </p>

      </div>
    </div>
  );
}