"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Flame, BrainCircuit, ArrowRight, Check } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "স্মার্ট পড়াশোনা,\nসহজ প্রস্তুতি",
      description: "যেকোনো বিষয়ের পূর্ণাঙ্গ মডেল টেস্ট, প্রফেশনাল পিডিএফ নোট এবং প্রতিটি প্রশ্নের নির্ভুল ব্যাখ্যা পান এক প্ল্যাটফর্মে।",
      icon: <BookOpen size={48} className="text-cyan-400" />,
      badges: ["📝 PDF নোট", "💡 স্মার্ট সলিউশন", "📊 ইনস্ট্যান্ট রেজাল্ট"],
      color: "from-cyan-500/20 to-blue-500/5",
    },
    {
      title: "একসাথে পরীক্ষা,\nলাইভ মেধা তালিকা",
      description: "বন্ধুদের বা ব্যাচের সবার সাথে একই সময়ে লাইভ পরীক্ষায় অংশ নিন এবং সেকেন্ডের মধ্যে পূর্ণাঙ্গ মেধা তালিকা দেখুন।",
      icon: <Flame size={48} className="text-red-400 fill-red-500/20" />,
      badges: ["🔥 লাইভ ব্যাচ এক্সাম", "🏆 মেধা তালিকা", "⚡ রিয়েলটাইম ওএমআর"],
      color: "from-red-500/20 to-amber-500/5",
    },
    {
      title: "ভুল শোধরান,\nসাফল্য অর্জন করুন",
      description: "পরীক্ষায় ভুল হওয়া প্রশ্নগুলো জমা থাকবে মিসটেক ব্যাংকে। বারবার রিভিশন দিয়ে নিজের দুর্বলতা দূর করুন অনায়াসে।",
      icon: <BrainCircuit size={48} className="text-purple-400" />,
      badges: ["🧠 মিসটেক ব্যাংক", "🎯 AI অ্যাডাপ্টিভ প্র্যাকটিস", "🔖 বুকমার্ক"],
      color: "from-purple-500/20 to-pink-500/5",
    },
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep((p) => p + 1);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("mcqhub_onboarding_done", "true");
      }
      router.push("/");
    }
  };

  const current = slides[step];

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-between p-6 selection:bg-cyan-500 selection:text-black">
      
      {/* টপ স্কিপ বাটন */}
      <div className="w-full max-w-md flex justify-end">
        {step < slides.length - 1 && (
          <button
            onClick={() => {
              if (typeof window !== "undefined") localStorage.setItem("mcqhub_onboarding_done", "true");
              router.push("/");
            }}
            className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5"
          >
            স্কিপ করুন
          </button>
        )}
      </div>

      {/* মাঝের স্লাইডার কার্ড */}
      <div className="w-full max-w-md flex flex-col items-center text-center my-auto py-8">
        <div className={`w-28 h-28 rounded-3xl bg-gradient-to-tr ${current.color} border border-white/10 flex items-center justify-center mb-8 shadow-2xl`}>
          {current.icon}
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white whitespace-pre-line leading-tight">
          {current.title}
        </h2>
        <p className="text-xs md:text-sm text-gray-400 mt-3 max-w-sm leading-relaxed">
          {current.description}
        </p>

        {/* ব্যাজ সমূহ */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {current.badges.map((b, i) => (
            <span key={i} className="text-[11px] font-bold text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* বটম ইন্ডিকেটর ও বাটন */}
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i ? "w-8 bg-cyan-400" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl text-xs md:text-sm transition shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          <span>{step === slides.length - 1 ? "শুরু করুন" : "পরবর্তী"}</span>
          <ArrowRight size={16} />
        </button>
      </div>

    </div>
  );
}