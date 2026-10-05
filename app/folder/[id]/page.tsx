"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";
import { SmartMatrixCanvas } from "@/components/SmartMatrixCanvas";
import { ArrowLeft, Folder, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DynamicFolderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? String(params.id) : "";
  const folderTitle = searchParams.get("title") || "Folder Contents";

  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFolderItems() {
      try {
        // ফায়ারস্টোর থেকে সাব-ফোল্ডারের লেআউট আনা
        const folderDoc = await getDoc(doc(db, "configuration", id));
        if (folderDoc.exists()) {
          const rawItems: DashboardItem[] = folderDoc.data()?.items || [];
          setItems(rawItems.filter((item) => !item.isHidden));
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("Failed to load folder:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadFolderItems();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex justify-center selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-[1400px] flex justify-center px-4 md:px-8 py-6">
        
        {/* সেন্ট্রাল কন্টেইনার (Max 750px) */}
        <main className="w-full max-w-[750px] min-h-screen flex flex-col pb-20">
          
          {/* টপ ন্যাভিগেশন বার */}
          <div className="flex items-center justify-between py-3 mb-6 border-b border-white/5 bg-[#121218]/90 backdrop-blur sticky top-0 z-30 px-2 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="font-extrabold text-base md:text-lg text-white line-clamp-1">{folderTitle}</h1>
                <p className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Folder size={12} /> ফোল্ডার কনটেন্ট
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 transition"
            >
              হোমে ফিরুন
            </Link>
          </div>

          {/* কার্ড গ্রিড রেন্ডারার */}
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-40 bg-white/5 rounded-3xl w-full"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-white/5 rounded-2xl"></div>
                <div className="h-32 bg-white/5 rounded-2xl"></div>
              </div>
            </div>
          ) : items.length > 0 ? (
            <SmartMatrixCanvas items={items} />
          ) : (
            <div className="bg-[#121218] border border-white/5 rounded-3xl p-12 text-center my-12">
              <Folder size={40} className="text-gray-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-300 text-sm">এই ফোল্ডারে এখনো কোনো কনটেন্ট যুক্ত করা হয়নি</h3>
              <p className="text-xs text-gray-500 mt-1">অ্যাডমিন অ্যাপ থেকে এই ফোল্ডারে এক্সাম বা নোট যোগ করুন।</p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}