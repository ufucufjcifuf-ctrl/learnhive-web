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

    // ১. ডিভাইস সনাক্তকরণ (Smart Device Detection)
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

    // ২. ব্রাউজারের PWA ইভেন্ট ক্যাপচার
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // ৩. সেশনে পূর্বে কেটে না দিলে ১.৫ সেকেন্ড পর স্মুথলি ব্যানার দৃশ্যমান হবে
    const isDismissed = sessionStorage.getItem("learnhive_app_prompt_dismissed");
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // ব্যানার ক্লোজ হ্যান্ডলার
  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("learnhive_app_prompt_dismissed", "true");
  };

  // প্লে-স্টোরে অফিসিয়াল অ্যান্ড্রয়েড অ্যাপ ওপেন করা
  const handleAndroidPlayStoreClick = () => {
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.robinsheikh.mcqhub";
    window.open(playStoreUrl, "_blank");
    handleDismiss();
  };

  // যদি কোনো অ্যান্ড্রয়েড বা পিসি ইউজার একান্তই ব্রাউজার ওয়েব অ্যাপ (PWA) ইনস্টল করতে চায়
  const handleWebPWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        handleDismiss();
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
          {/* ব্র্যান্ড লোগো */}
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

        {/* ক্লোজ বাটন */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition flex-shrink-0"
          title="বন্ধ করুন"
        >
          <X size={16} />
        </button>
      </div>

      {/* অ্যাকশন বাটন সমূহ */}
      <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-col gap-2">
        {deviceType === "ANDROID" ? (
          <>
            {/* মূল অ্যাকশন: প্লে-স্টোর ইনস্টল */}
            <button
              type="button"
              onClick={handleAndroidPlayStoreClick}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Smartphone size={15} className="fill-black" />
              <span>Google Play Store থেকে ইনস্টল করুন</span>
              <ExternalLink size={13} />
            </button>

            {/* গৌণ অপশন: কেউ যদি প্লে-স্টোরের বদলে কেবল ব্রাউজারে ওয়েব অ্যাপ রাখতে চায় */}
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
            {/* আইফোনের জন্য ইন্সট্রাকশন বাটন */}
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
          /* কম্পিউটারের জন্য এক ক্লিকে ডেস্কটপ PWA অ্যাপ ইনস্টল */
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