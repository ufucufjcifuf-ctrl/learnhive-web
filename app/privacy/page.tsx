"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { ArrowLeft, Shield, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("অ্যাকাউন্ট ডিলিট করতে প্রথমে লগইন অবস্থায় থাকতে হবে।");
      return;
    }

    setDeleting(true);
    try {
      // ১. ফায়ারস্টোর থেকে ইউজারের ডেটা মুছে ফেলা
      await deleteDoc(doc(db, "users", user.uid));
      // ২. ফায়ারবেস অথেনটিকেশন থেকে অ্যাকাউন্ট মুছে ফেলা
      await deleteUser(user);
      alert("আপনার অ্যাকাউন্ট ও ডেটা সম্পূর্ণ মুছে ফেলা হয়েছে।");
      router.push("/");
    } catch (e: any) {
      alert("নিরাপত্তার স্বার্থে অ্যাকাউন্ট মুছে ফেলার আগে পুনরায় একবার লগইন করে নিতে হবে।");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

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
              <Shield size={20} /> প্রাইভেসি পলিসি ও ডেটা প্রটেকশন
            </h1>
            <p className="text-[11px] text-gray-400">আপনার তথ্যের নিরাপত্তা ও অধিকার</p>
          </div>
        </div>

        {/* পলিসি টেক্সট */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl text-xs md:text-sm text-gray-300 leading-relaxed flex flex-col gap-4 mb-6">
          <h2 className="text-base font-bold text-white">তথ্য সংগ্রহ ও ব্যবহার</h2>
          <p>
            Learn Hive শিক্ষার্থীদের শুধুমাত্র পরীক্ষার ফলাফল সংরক্ষণ, মেধা তালিকা প্রকাশ এবং প্রিমিয়াম এক্সেস প্রদানের স্বার্থে নাম, ইমেইল ও রোল সংরক্ষণ করে। আমরা কখনোই ব্যবহারকারীদের তথ্য তৃতীয় কোনো পক্ষের কাছে বিক্রয় করি না।
          </p>

          <h2 className="text-base font-bold text-white">বিজ্ঞাপন ও অ্যানালিটিক্স</h2>
          <p>
            আমাদের প্ল্যাটফর্মটি ফ্রি রাখতে আমরা প্রাসঙ্গিক বিজ্ঞাপন ব্যবহার করে থাকি। প্রিমিয়াম সাবস্ক্রিপশন গ্রহণকারীদের ক্ষেত্রে বিজ্ঞাপন সম্পূর্ণ নিষ্ক্রিয় থাকে।
          </p>
        </div>

        {/* অ্যাকাউন্ট ডিলিট বক্স */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 shadow-xl text-left">
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-1">
            <Trash2 size={16} /> অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন (Delete Account)
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            আপনি চাইলে যেকোনো সময় আপনার সমস্ত পরীক্ষার ইতিহাস, ফলাফল ও প্রোফাইল স্থায়ীভাবে মুছে ফেলতে পারেন।
          </p>

          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-red-500/20"
          >
            অ্যাকাউন্ট ডিলিট করুন
          </button>
        </div>

      </div>

      {/* ডিলিট কনফার্মেশন ডায়ালগ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-red-500/30 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
            <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">সত্যিই কি মুছে ফেলতে চান?</h3>
            <p className="text-xs text-gray-400 mt-1 mb-6">এই কাজটি ফিরিয়ে আনা সম্ভব নয়। আপনার সব স্কোর মুছে যাবে।</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black"
              >
                {deleting ? "মুছে ফেলা হচ্ছে..." : "হ্যাঁ, ডিলিট করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}