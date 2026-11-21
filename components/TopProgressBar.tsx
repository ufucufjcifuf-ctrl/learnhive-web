"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const loadingRef = useRef(false);
  const midTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loadingRef.current) {
      if (midTimerRef.current) clearTimeout(midTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      setProgress(100);
      endTimerRef.current = setTimeout(() => {
        loadingRef.current = false;
        setLoading(false);
        setProgress(0);
      }, 300);
    }
    return () => {
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        (href.startsWith("/") || href.startsWith("http")) &&
        !href.startsWith("#") &&
        target.getAttribute("target") !== "_blank"
      ) {
        loadingRef.current = true;
        setLoading(true);
        setProgress(35);
        if (midTimerRef.current) clearTimeout(midTimerRef.current);
        midTimerRef.current = setTimeout(() => setProgress(75), 150);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
      if (midTimerRef.current) clearTimeout(midTimerRef.current);
    };
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