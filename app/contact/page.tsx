"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Send, Mail, HelpCircle, PhoneCall } from "lucide-react";

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-cyan-400">যোগাযোগ ও হেল্পডেস্ক (Contact Support)</h1>
            <p className="text-[11px] text-gray-400">যেকোনো প্রশ্ন, অভিযোগ বা ফিডব্যাকের জন্য যোগাযোগ করুন</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          
          <a
            href="https://t.me/your_telegram_channel"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#121218] border border-white/10 hover:border-cyan-500/30 rounded-3xl p-5 flex items-center gap-4 transition group shadow-xl"
          >
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
              <Send size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white">অফিসিয়াল টেলিগ্রাম চ্যানেল</h3>
              <p className="text-xs text-gray-400 mt-0.5">সব পরীক্ষার আপডেট ও ফ্রি পিডিএফ নোট পেতে যুক্ত হোন।</p>
            </div>
          </a>

          <a
            href="mailto:support@learnhive.com"
            className="bg-[#121218] border border-white/10 hover:border-amber-500/30 rounded-3xl p-5 flex items-center gap-4 transition group shadow-xl"
          >
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Mail size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white">ইমেইল সাপোর্ট</h3>
              <p className="text-xs text-gray-400 mt-0.5">support@learnhive.com (২৪ ঘণ্টার মধ্যে রিপ্লাই)</p>
            </div>
          </a>

          <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 text-center mt-4">
            <HelpCircle size={28} className="text-gray-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-300">সাধারণ জিজ্ঞাসা</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              আপনার প্রিমিয়াম পেমেন্ট বা অ্যাকাউন্টে কোনো সমস্যা হলে আপনার UID উল্লেখ করে আমাদের যেকোনো সোশ্যাল চ্যানেলে মেসেজ দিন।
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}