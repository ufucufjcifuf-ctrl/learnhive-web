"use client";

import React, { useEffect, useState } from "react";
import { getPublicConfigs } from "@/lib/layoutService";
import { AppMainConfig } from "@/types";
import { AlertTriangle, Sparkles, X } from "lucide-react";

export const GlobalBanner: React.FC = () => {
  const [notice, setNotice] = useState<AppMainConfig | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    getPublicConfigs()
      .then(({ main }) => setNotice(main))
      .catch(() => {});
  }, []);

  if (!notice || closed) return null;

  if (notice.maintenanceMode) {
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
          <Sparkles size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="italic line-clamp-1">&quot;{notice.dailyQuote}&quot;</span>
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="text-cyan-400 hover:text-white p-1"
          aria-label="Close banner"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
};