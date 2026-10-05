"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export const NetworkBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000); // ৩ সেকেন্ড পর হাইড হবে
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="w-full bg-red-600 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-200">
        <WifiOff size={14} />
        <span>ইন্টারনেট সংযোগ বিচ্ছিন্ন! চেক করুন।</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="w-full bg-emerald-600 text-black text-xs font-black py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-200">
        <Wifi size={14} />
        <span>ইন্টারনেট পুনরায় সংযুক্ত হয়েছে!</span>
      </div>
    );
  }

  return null;
};