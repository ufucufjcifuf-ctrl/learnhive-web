"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserProfile, UserProfile } from "@/lib/authService";
import { collection, query, where, getDocs, runTransaction, doc } from "firebase/firestore";
import { ArrowLeft, Gift, Copy, Check, Share2, Sparkles, AlertCircle } from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const p = await fetchUserProfile(fbUser.uid);
        setProfile(p);
      }
    });
    return () => unsub();
  }, []);

  const handleCopy = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareText = `Learn Hive-এ পরীক্ষা দিন এবং আমার রেফারেল কোড (${profile?.referralCode}) ব্যবহার করে ফ্রি প্রিমিয়াম এক্সেস পান! 🚀\nhttps://learnhive.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: "Learn Hive Referral", text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      alert("শেয়ার টেক্সট কপি হয়েছে!");
    }
  };

  // বন্ধুর কোড অ্যাপ্লাই করা (টাইপস্ক্রিপ্ট ও ফায়ারস্টোর ট্রানজ্যাকশন ফিক্সড)
  const handleApplyCode = async () => {
    if (!profile || !friendCode.trim()) return;
    setStatusMsg(null);
    setApplying(true);

    const inputCode = friendCode.trim().toUpperCase();

    if (inputCode === profile.referralCode) {
      setStatusMsg({ text: "আপনি নিজের কোড ব্যবহার করতে পারবেন না!", isError: true });
      setApplying(false);
      return;
    }

    if (profile.isReferralClaimed) {
      setStatusMsg({ text: "আপনি ইতিমধ্যে একবার বোনাস ক্লেইম করেছেন!", isError: true });
      setApplying(false);
      return;
    }

    try {
      const q = query(collection(db, "users"), where("referralCode", "==", inputCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        setStatusMsg({ text: "ভুল রেফারেল কোড! কোনো ইউজার পাওয়া যায়নি।", isError: true });
        setApplying(false);
        return;
      }

      const referrerDoc = snap.docs[0];
      const referrerUid = referrerDoc.id;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", profile.uid);
        const refRef = doc(db, "users", referrerUid);

        // 🔥 ট্রানজ্যাকশনের নিয়ম: সব Read আগে করতে হবে
        const refSnap = await transaction.get(refRef);
        const userSnap = await transaction.get(userRef);

        if (!refSnap.exists() || !userSnap.exists()) {
          throw new Error("ইউজার অ্যাকাউন্ট লোড করা যায়নি!");
        }

        const refData = refSnap.data();
        const userData = userSnap.data();

        const currentTime = Date.now();
        const addedDaysMs = 7 * 24 * 60 * 60 * 1000; // ৭ দিন প্রিমিয়াম

        const refExpiry = Number(refData?.premiumExpiry) || 0;
        const userExpiry = Number(userData?.premiumExpiry) || 0;

        const refBase = refExpiry > currentTime ? refExpiry : currentTime;
        const userBase = userExpiry > currentTime ? userExpiry : currentTime;

        // 🔥 সব Write পরে করতে হবে
        transaction.update(refRef, {
          premiumExpiry: refBase + addedDaysMs,
          isPremium: true,
        });

        transaction.update(userRef, {
          premiumExpiry: userBase + addedDaysMs,
          isPremium: true,
          isReferralClaimed: true,
          referredBy: referrerUid,
        });
      });

      setStatusMsg({ text: "অভিনন্দন! আপনি এবং আপনার বন্ধু উভয়েই ৭ দিন ফ্রি প্রিমিয়াম পেয়েছেন! 🎉", isError: false });
      setFriendCode("");
      const updated = await fetchUserProfile(profile.uid);
      setProfile(updated);
    } catch (e: any) {
      setStatusMsg({ text: e.message || "কোড অ্যাপ্লাই করতে সমস্যা হয়েছে।", isError: true });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-extrabold text-base md:text-lg text-amber-400 flex items-center gap-2">
            <Gift size={20} /> রেফার ও প্রিমিয়াম বোনাস (Refer & Earn)
          </h1>
        </div>

        {/* ইনফো ব্যানার */}
        <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/20 rounded-3xl p-6 mb-6 shadow-xl text-center">
          <Sparkles size={32} className="text-amber-400 mx-auto mb-2" />
          <h2 className="text-lg font-black text-white">বন্ধুদের আমন্ত্রণ জানান, প্রিমিয়াম পান</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            আপনার কোড ব্যবহার করে কোনো বন্ধু যোগ দিলে আপনারা উভয়েই ৭ দিনের সম্পূর্ণ ফ্রি প্রিমিয়াম এক্সেস পাবেন।
          </p>
        </div>

        {/* নিজের কোড বক্স */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 mb-6 shadow-xl text-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-2">
            আপনার পার্সোনাল রেফারেল কোড
          </span>
          <div className="bg-black/40 border border-cyan-500/30 rounded-2xl py-4 px-6 flex justify-between items-center mb-4">
            <span className="font-mono text-2xl font-black text-cyan-400 tracking-widest">
              {profile?.referralCode || "লগইন প্রয়োজন"}
            </span>
            <button
              onClick={handleCopy}
              disabled={!profile}
              className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "কপি হয়েছে" : "কপি"}
            </button>
          </div>

          <button
            onClick={handleShare}
            disabled={!profile}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> বন্ধুদের সাথে লিংক শেয়ার করুন
          </button>
        </div>

        {/* বন্ধুর কোড বসানোর বক্স */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">বন্ধুর রেফারেল কোড আছে?</h3>
          <p className="text-xs text-gray-400 mb-4">এখানে কোডটি বসিয়ে ক্লেইম করুন।</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="যেমন: USR5829"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              disabled={profile?.isReferralClaimed || applying}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono font-bold uppercase tracking-wider focus:border-cyan-500 outline-none disabled:opacity-40"
            />
            <button
              onClick={handleApplyCode}
              disabled={!friendCode || profile?.isReferralClaimed || applying}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-xs transition"
            >
              {applying ? "যাচাই হচ্ছে..." : "ক্লেইম"}
            </button>
          </div>

          {statusMsg && (
            <div
              className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                statusMsg.isError
                  ? "bg-red-500/10 border border-red-500/20 text-red-300"
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              }`}
            >
              <AlertCircle size={16} /> {statusMsg.text}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}