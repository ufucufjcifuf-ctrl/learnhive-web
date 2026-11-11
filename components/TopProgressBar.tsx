"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // বাটন নয়, শুধুমাত্র <a> লিংকে ক্লিক হলে প্রোগ্রেস বার চালু হবে
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        (href.startsWith("/") || href.startsWith("http")) &&
        !href.startsWith("#") &&
        target.getAttribute("target") !== "_blank"
      ) {
        setLoading(true);
        setProgress(35);
        setTimeout(() => setProgress(75), 150);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => document.removeEventListener("click", handleGlobalClick, { capture: true });
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 transition-all duration-300 ease-out shadow-[0_0_12px_#00F0FF]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
};