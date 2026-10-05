"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // ইউজার আগে ক্লোজ না করে থাকলে প্রম্পট দেখানো হবে
      const isDismissed = sessionStorage.getItem("pwa_prompt_dismissed");
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 bg-[#121218]/95 backdrop-blur-md border border-cyan-500/40 rounded-3xl p-4 shadow-2xl shadow-cyan-500/20 z-50 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-md">
          H
        </div>
        <div>
          <h4 className="font-extrabold text-xs text-white">Learn Hive অ্যাপ ইনস্টল করুন</h4>
          <p className="text-[10px] text-gray-400">সহজে এক ট্যাপে পরীক্ষা দিন</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow-sm"
        >
          <Download size={13} /> ইনস্টল
        </button>
        <button onClick={handleDismiss} className="text-gray-500 hover:text-white p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};