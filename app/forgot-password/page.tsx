"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordEmail } from "@/lib/authService";
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus(null);
    setLoading(true);

    const { success, error } = await resetPasswordEmail(email);
    setLoading(false);

    if (success) {
      setStatus({
        msg: "পাসওয়ার্ড রিসেটের লিংক আপনার ইমেইলে পাঠানো হয়েছে! দয়া করে আপনার ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।",
        isError: false,
      });
      setEmail("");
    } else {
      setStatus({ msg: error || "একটি সমস্যা হয়েছে।", isError: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative">
        
        <Link
          href="/login"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1.5 text-xs font-bold transition"
        >
          <ArrowLeft size={16} /> লগইনে ফিরে যান
        </Link>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/20 mb-3">
            <Mail size={24} />
          </div>
          <h1 className="text-xl font-black tracking-wide">পাসওয়ার্ড ভুলে গেছেন?</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            আপনার অ্যাকাউন্টের ইমেইলটি লিখুন, আমরা পাসওয়ার্ড রিসেট করার লিংক পাঠিয়ে দেব।
          </p>
        </div>

        {status && (
          <div
            className={`mb-4 p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              status.isError
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {status.isError ? <AlertCircle size={16} className="flex-shrink-0" /> : <CheckCircle2 size={16} className="flex-shrink-0" />}
            <span>{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <Send size={14} /> {loading ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
          </button>
        </form>

      </div>
    </div>
  );
}