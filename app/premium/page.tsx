"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";

// লার্নহাইভ কাস্টম ফেসবুক আইকন (Lucide ভার্সন কনফ্লিক্ট মুক্ত)
const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface PremiumPackage {
  id: string;
  title: string;
  durationDays: number;
  price: number;
  features: string;
  isPopular?: boolean;
}

interface PremiumConfig {
  instructions: string;
  whatsappNumber: string;
  facebookLink: string;
  packages: PremiumPackage[];
}

export default function PremiumPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PremiumConfig>({
    instructions: "প্যাকেজ নেওয়ার পর ট্রানজ্যাকশন আইডি ও আপনার UID আমাদের হোয়াটসঅ্যাপে পাঠান।",
    whatsappNumber: "",
    facebookLink: "",
    packages: [],
  });
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });

    async function loadConfig() {
      try {
        const snap = await getDoc(doc(db, "configuration", "premium"));
        if (snap.exists()) {
          setConfig(snap.data() as PremiumConfig);
        }
      } catch (err) {
        console.error("Premium config load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
    return () => unsub();
  }, []);

  const handleCopyUid = () => {
    if (uid) {
      navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppOrder = (pkg: PremiumPackage) => {
    const cleanNumber = config.whatsappNumber.replace(/[^0-9]/g, "");
    const msg = `Hello Learn Hive! I want to upgrade to ${pkg.title} (৳${pkg.price}).\nMy App UID: ${uid || "Not logged in"}`;
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-3xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-amber-400 flex items-center gap-2">
              <Sparkles size={20} /> প্রিমিয়াম এক্সেস (Upgrade to Pro)
            </h1>
            <p className="text-[11px] text-gray-400">সীমাহীন ব্যাখ্যা, স্পেশাল মডেল টেস্ট ও বিজ্ঞাপনমুক্ত সুবিধা</p>
          </div>
        </div>

        {/* ব্যানার */}
        <div className="bg-gradient-to-br from-amber-500/15 via-[#161620] to-[#121218] border border-amber-500/30 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl text-center relative overflow-hidden">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full inline-block mb-3">
            👑 মেম্বারশিপ প্ল্যান
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white">আপনার প্রস্তুতিকে নিন অনন্য উচ্চতায়</h2>
          <p className="text-xs text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
            যেকোনো একটি প্যাকেজ সিলেক্ট করে সহজেই প্রিমিয়াম সুবিধা আনলক করুন।
          </p>

          {/* UID বক্স */}
          <div className="mt-6 max-w-sm mx-auto bg-black/60 border border-white/10 rounded-2xl p-3 flex justify-between items-center text-xs">
            <div className="text-left font-mono">
              <span className="text-[10px] text-gray-400 block font-sans">আপনার অ্যাকাউন্ট UID (প্রয়োজনীয়):</span>
              <span className="text-cyan-400 font-bold">{uid || "লগইন করা নেই"}</span>
            </div>
            {uid && (
              <button
                onClick={handleCopyUid}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl font-bold text-gray-300 transition"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? "কপি" : "কপি"}
              </button>
            )}
          </div>
        </div>

        {/* প্যাকেজ তালিকা */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">প্যাকেজ সমূহ লোড হচ্ছে...</p>
          </div>
        ) : config.packages && config.packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {config.packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-[#121218] rounded-3xl p-6 border relative flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  pkg.isPopular
                    ? "border-amber-400/60 shadow-xl shadow-amber-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {pkg.isPopular && (
                  <span className="absolute top-4 right-4 bg-amber-400 text-black font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    জনপ্রিয়
                  </span>
                )}

                <div>
                  <h3 className="font-extrabold text-lg text-white">{pkg.title}</h3>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-black text-amber-400">৳{pkg.price}</span>
                    <span className="text-xs text-gray-400">/ {pkg.durationDays} দিন</span>
                  </div>

                  <ul className="flex flex-col gap-2 my-4 text-xs text-gray-300">
                    {pkg.features.split(",").map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>{feat.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleWhatsAppOrder(pkg)}
                  className="w-full mt-4 bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                >
                  <Zap size={14} className="fill-black" /> সাবস্ক্রাইব করুন
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121218] border border-white/5 rounded-3xl p-10 text-center text-gray-400 text-sm mb-8">
            বর্তমানে কোনো প্যাকেজ সক্রিয় নেই। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।
          </div>
        )}

        {/* নির্দেশনাবলী ও সাপোর্ট লিংক */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-xl">
          <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest mb-2">পেমেন্ট নির্দেশনা</h4>
          <p className="text-xs text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
            {config.instructions}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {config.whatsappNumber && (
              <a
                href={`https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-400 font-bold py-3 rounded-2xl text-xs transition"
              >
                <MessageCircle size={16} /> হোয়াটসঅ্যাপে কথা বলুন
              </a>
            )}
            {config.facebookLink && (
              <a
                href={config.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/40 text-blue-400 font-bold py-3 rounded-2xl text-xs transition"
              >
                <FacebookIcon size={16} /> ফেসবুক পেইজ
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}