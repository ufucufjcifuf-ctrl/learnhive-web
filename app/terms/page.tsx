"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-2xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-cyan-400 flex items-center gap-2">
              <FileText size={20} /> ব্যবহারের শর্তাবলী (Terms of Service)
            </h1>
            <p className="text-[11px] text-gray-400">Learn Hive প্ল্যাটফর্ম ব্যবহারের নিয়ম ও দায়বদ্ধতা</p>
          </div>
        </div>

        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl text-xs md:text-sm text-gray-300 leading-relaxed flex flex-col gap-4">
          <h2 className="text-base font-bold text-white">১. অ্যাকাউন্টের দায়িত্ব</h2>
          <p>
            শিক্ষার্থীকে তার নিজস্ব অ্যাকাউন্ট ও পাসওয়ার্ডের গোপনীয়তা বজায় রাখতে হবে। কোনো অ্যাকাউন্টে অনৈতিক বা সন্দেহজনক কার্যকলাপ লক্ষ্য করা গেলে কর্তৃপক্ষ অ্যাকাউন্ট স্থগিত করার অধিকার সংরক্ষণ করে।
          </p>

          <h2 className="text-base font-bold text-white">২. পরীক্ষায় সততা ও অ্যান্টি-চিট নীতি</h2>
          <p>
            লাইভ পরীক্ষা চলাকালীন অন্য কোনো ব্রাউজার ট্যাব ওপেন করা, নকলের আশ্রয় নেওয়া বা স্ক্রিন শেয়ার করার চেষ্টা করা সম্পূর্ণ নিষিদ্ধ। অ্যান্টি-চিট সিস্টেমে ধরা পড়লে পরীক্ষার খাতা স্বয়ংক্রিয়ভাবে বাতিল হতে পারে।
          </p>

          <h2 className="text-base font-bold text-white">৩. কনটেন্টের কপিরাইট ও মেধাস্বত্ব</h2>
          <p>
            Learn Hive-এর সমস্ত মডেল টেস্টের প্রশ্নপত্র, পিডিএফ নোট এবং সলিউশন প্ল্যাটফর্মের নিজস্ব মেধাস্বত্ব। কোনো কনটেন্ট বাণিজ্যিক উদ্দেশ্যে পুনঃউৎপাদন বা পাইরেসি করা আইনত দণ্ডনীয়।
          </p>

          <h2 className="text-base font-bold text-white">৪. রিফান্ড ও সাবস্ক্রিপশন নীতি</h2>
          <p>
            প্রিমিয়াম মেম্বারশিপ সক্রিয় করার পূর্বে এর মেয়াদ ও সুবিধাসমূহ ভালোভাবে পড়ে নেওয়া বাঞ্ছনীয়। সফলভাবে প্যাকেজ চালু হওয়ার পর কোনো রিফান্ড প্রযোজ্য নয়।
          </p>
        </div>

      </div>
    </div>
  );
}