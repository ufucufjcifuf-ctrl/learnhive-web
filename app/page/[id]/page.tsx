"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, BookOpen, Calendar } from "lucide-react";
import { MathText } from "@/components/MathText";

export default function RoutineOrHtmlPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const title = searchParams.get("title") || "Routine & Notice";
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      try {
        const d = await getDoc(doc(db, "configuration", id));
        if (d.exists()) {
          setContent(d.data()?.routineHtml || "কোনো কনটেন্ট পাওয়া যায়নি।");
        } else {
          setContent("পেজটি পাওয়া যায়নি বা কনটেন্ট খালি রয়েছে।");
        }
      } catch (err) {
        console.error(err);
        setContent("কনটেন্ট লোড করতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadPage();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex justify-center p-4 md:p-6 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-3xl pb-24">
        
        {/* হেডার */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-base md:text-lg text-white">{title}</h1>
            <p className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
              <Calendar size={12} /> রুটিন ও নোটিশ বোর্ড
            </p>
          </div>
        </div>

        {/* কনটেন্ট কার্ড */}
        <div className="bg-[#121218] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl leading-relaxed text-sm md:text-base text-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">কনটেন্ট লোড হচ্ছে...</p>
            </div>
          ) : (
            <MathText text={content} />
          )}
        </div>

      </div>
    </div>
  );
}