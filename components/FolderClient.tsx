"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";
import { ArrowLeft, Folder, HelpCircle, Share2, Check } from "lucide-react";
import Link from "next/link";

interface FolderClientProps {
  initialItems: DashboardItem[];
  folderTitle: string;
  cleanSlug: string;
}

export const FolderClient: React.FC<FolderClientProps> = ({
  initialItems,
  folderTitle,
  cleanSlug,
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // 🔥 ১-ট্যাপে ছোট শর্ট লিংক হোয়াটসঅ্যাপ, মেসেঞ্জার বা ফেসবুকে শেয়ার করার হ্যান্ডলার
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/f/${encodeURIComponent(cleanSlug)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${folderTitle} | Learn Hive`,
          text: `Learn Hive-এ ${folderTitle}-এর সকল মডেল টেস্ট ও প্রস্তুতিমূলক কনটেন্ট দেখুন:`,
          url: shareUrl,
        });
      } catch (err) {
        // ইউজার ক্যানসেল করলে এরর ইগনোর করা
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex justify-center selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-[1400px] flex justify-center px-4 md:px-8 py-6">
        
        {/* সেন্ট্রাল কন্টেইনার (Max 750px Android Parity) */}
        <main className="w-full max-w-[750px] min-h-screen flex flex-col pb-20">
          
          {/* টপ ন্যাভিগেশন বার */}
          <div className="flex items-center justify-between py-3 mb-6 border-b border-white/5 bg-[#121218]/90 backdrop-blur sticky top-0 z-30 px-3 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition flex-shrink-0"
                title="ফিরে যান"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="font-extrabold text-base md:text-lg text-white truncate">
                  {folderTitle}
                </h1>
                <p className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Folder size={12} /> ফোল্ডার কনটেন্ট
                </p>
              </div>
            </div>

            {/* অ্যাকশন বাটনস: শেয়ার ও হোম */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 🔥 আপনার চাহিদামতো আকর্ষণীয় "শেয়ার" বাটন */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-extrabold text-xs transition active:scale-95 shadow-sm"
                title="ফোল্ডার শেয়ার করুন"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                <span>{copied ? "কপি হয়েছে!" : "শেয়ার"}</span>
              </button>

              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 transition"
              >
                হোম
              </Link>
            </div>
          </div>

          {/* সরাসরি সার্ভারের প্রাক-রেন্ডার করা কনটেন্ট (কার্ডের ইমেজ ডিজাইন ১০০% অক্ষত) */}
          {initialItems && initialItems.length > 0 ? (
            <SmartMatrixCanvas items={initialItems} />
          ) : (
            <div className="bg-[#121218] border border-white/10 rounded-3xl p-12 text-center my-12 shadow-xl">
              <HelpCircle size={40} className="text-gray-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-300 text-sm">
                এই ফোল্ডারে এখনো কোনো কনটেন্ট যুক্ত করা হয়নি
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                অ্যাডমিন অ্যাপ থেকে এই ফোল্ডারে এক্সাম বা কার্ড যুক্ত করে "PUBLISH DRAFTS" চাপুন।
              </p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
};