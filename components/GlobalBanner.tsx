"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, Sparkles, X } from "lucide-react";

export const GlobalBanner: React.FC = () => {
  const [notice, setNotice] = useState<{ isMaintenance?: boolean; dailyQuote?: string } | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    async function fetchNotice() {
      try {
        const snap = await getDoc(doc(db, "configuration", "main"));
        if (snap.exists()) {
          setNotice(snap.data() as any);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchNotice();
  }, []);

  if (!notice || closed) return null;

  if (notice.isMaintenance) {
    return (
      <div className="w-full bg-red-600/90 text-white text-xs font-bold py-2.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
        <AlertTriangle size={16} />
        <span>সতর্কতা: সার্ভার মেইনটেন্যান্স চলছে। কিছুক্ষণের মধ্যে সেবা স্বাভাবিক হবে।</span>
      </div>
    );
  }

  if (notice.dailyQuote) {
    return (
      <div className="w-full bg-cyan-950/60 border-b border-cyan-500/20 text-cyan-300 text-xs py-2 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2 mx-auto">
          <Sparkles size={14} className="text-cyan-400" />
          <span className="italic line-clamp-1">"{notice.dailyQuote}"</span>
        </div>
        <button onClick={() => setClosed(true)} className="text-cyan-400 hover:text-white p-1">
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
};