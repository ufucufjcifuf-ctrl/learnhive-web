"use client";

import React, { useEffect, useState } from "react";
import { X, Smartphone, Monitor, Share, Download, ExternalLink } from "lucide-react";

type DeviceType = "ANDROID" | "IOS" | "DESKTOP";

export const PWAInstallPrompt: React.FC = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>("DESKTOP");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ১. ওয়েব অ্যাপ (PWA) ফোনে ইনস্টল করা থাকলে ব্যানার কখনোই আসবে না
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // ২. সময় যাচাই: প্লে-স্টোর ক্লিক (৭ দিন) বা লাল ক্রস ক্লিক (৩ দিন) মেয়াদ পার হয়েছে কি না
    const muteUntil = localStorage.getItem("learnhive_prompt_mute_until");
    if (muteUntil && Date.now() < Number(muteUntil)) {
      return;
    }

    // ৩. ডিভাইস সনাক্তকরণ
    const ua = navigator.userAgent || "";
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

    if (isAndroid) {
      setDeviceType("ANDROID");
    } else if (isIOS) {
      setDeviceType("IOS");
    } else {
      setDeviceType("DESKTOP");
    }

    // ৪. ব্রাউজার PWA ইভেন্ট ক্যাপচার
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // ২ সেকেন্ড পর ব্যানারটি স্ক্রিনে আসবে
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // লাল ক্রস চাপলে ব্যাকগ্রাউন্ডে ৩ দিনের জন্য ব্যানার বন্ধ হবে (স্ক্রিনে কোনো টেক্সট থাকবে না)
  const handleDismiss = () => {
    setShowPrompt(false);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000; // ৩ দিন
    localStorage.setItem("learnhive_prompt_mute_until", String(Date.now() + threeDaysMs));
  };

  // প্লে-স্টোরে ক্লিক করলে ৭ দিনের জন্য ব্যানার বন্ধ থাকবে
  const handleAndroidPlayStoreClick = () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // ৭ দিন
    localStorage.setItem("learnhive_prompt_mute_until", String(Date.now() + sevenDaysMs));
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.robinsheikh.mcqhub";
    window.open(playStoreUrl, "_blank");
    setShowPrompt(false);
  };

  // ওয়েব অ্যাপ ইনস্টল হ্যান্ডলার
  const handleWebPWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem("learnhive_prompt_mute_until", String(Date.now() + sevenDaysMs));
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("ওয়েব অ্যাপ যোগ করতে ব্রাউজারের মেনু (তিনটি ডট ⋮) থেকে 'Add to Home screen' বা 'Install' বেছে নিন।");
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-[420px] bg-[#121218]/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl p-4 shadow-2xl shadow-cyan-500/20 z-50 animate-in slide-in-from-bottom duration-300 selection:bg-cyan-500 selection:text-black">
      
      {/* প্রধান ব্যানার কন্টেন্ট */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-500/30 flex-shrink-0">
            H
          </div>

          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
              {deviceType === "ANDROID" && (
                <>
                  <span>Learn Hive Android অ্যাপ</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-md font-bold">
                    Official
                  </span>
                </>
              )}
              {deviceType === "IOS" && "Learn Hive Web App"}
              {deviceType === "DESKTOP" && "Learn Hive Desktop App"}
            </h4>

            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
              {deviceType === "ANDROID" && "প্লে-স্টোর থেকে ইনস্টল করে ওএমআর ও লাইভ পরীক্ষা দিন"}
              {deviceType === "IOS" && "আইফোনের হোমস্ক্রিন থেকে এক ট্যাপে সরাসরি প্রবেশ করুন"}
              {deviceType === "DESKTOP" && "পিসি বা ল্যাপটপে ব্রাউজারের ঝামেলা ছাড়াই পরীক্ষা দিন"}
            </p>
          </div>
        </div>

        {/* 🔥 আপনার চাহিদামতো আকর্ষণীয় লাল রঙের ক্রস বাটন (কোনো টেক্সট ছাড়া) */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-300 p-1.5 rounded-xl hover:bg-red-500/10 transition flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* অ্যাকশন বাটন সমূহ */}
      <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-col gap-2">
        {deviceType === "ANDROID" ? (
          <>
            <button
              type="button"
              onClick={handleAndroidPlayStoreClick}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Smartphone size={15} className="fill-black" />
              <span>Google Play Store থেকে ইনস্টল করুন</span>
              <ExternalLink size={13} />
            </button>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleWebPWAInstall}
                className="text-[10px] text-gray-400 hover:text-cyan-400 underline font-semibold transition py-0.5"
              >
                অথবা ওয়েব সংস্করণ হোমস্ক্রিনে যোগ করুন
              </button>
            </div>
          </>
        ) : deviceType === "IOS" ? (
          <>
            <button
              type="button"
              onClick={() => setShowIOSInstructions((prev) => !prev)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
            >
              <Share size={14} />
              <span>হোম স্ক্রিনে যোগ করার নিয়ম দেখুন</span>
            </button>

            {showIOSInstructions && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300 leading-relaxed mt-1 animate-in fade-in duration-200">
                আইফোনে Safari ব্রাউজারের নিচের <b>Share</b> আইকন ( <Share size={11} className="inline" /> ) চাপুন, তারপর নিচে স্ক্রল করে <b>'Add to Home Screen'</b> নির্বাচন করুন।
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={handleWebPWAInstall}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Monitor size={15} />
            <span>ডেস্কটপ অ্যাপ হিসেবে ইনস্টল করুন</span>
            <Download size={13} />
          </button>
        )}
      </div>

    </div>
  );
};