"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { getFolderItems } from "@/lib/layoutService";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";

export default function ContactPage() {
  const router = useRouter();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContactLayout() {
      try {
        // 🔥 অ্যান্ড্রয়েডের মতো ফায়ারবেসের "contact" ডকুমেন্ট থেকে বাটনগুলো আনা হচ্ছে
        const contactItems = await getFolderItems("contact");
        setItems(contactItems.filter((it) => !it.isHidden));
      } catch (e) {
        console.error("Failed to load contact items", e);
      } finally {
        setLoading(false);
      }
    }
    loadContactLayout();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-[750px] px-4 md:px-6 py-6 pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-white">Connect With Us</h1>
            <p className="text-[11px] text-gray-400">Join our community for updates</p>
          </div>
        </div>

        {/* কনটেন্ট এরিয়া: Smart Matrix Canvas */}
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-32 bg-white/5 rounded-3xl w-full" />
            <div className="h-28 bg-white/5 rounded-3xl w-full" />
          </div>
        ) : items.length > 0 ? (
          <SmartMatrixCanvas items={items} />
        ) : (
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-8 text-center mt-6">
            <HelpCircle size={36} className="text-gray-500 mx-auto mb-3" />
            <h3 className="font-bold text-white text-sm">কোনো কনটাক্ট চ্যানেল চালু নেই</h3>
            <p className="text-xs text-gray-400 mt-1">অ্যাডমিন অ্যাপের Tools &gt; Contact Page থেকে সোশ্যাল কার্ড যোগ করুন।</p>
          </div>
        )}

      </div>
    </div>
  );
}