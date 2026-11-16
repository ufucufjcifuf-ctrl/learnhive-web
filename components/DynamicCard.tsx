"use client";

import React, { useState, useEffect } from "react";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { Lock, Radio, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExamActionModal } from "@/components/ExamActionModal";
import { getSmartImageUrl, syncAssetImages } from "@/lib/imageService";
import { createFolderSlug, createExamSlug, createNoteSlug } from "@/lib/slugUtils";
import { useAuth } from "@/lib/useAuth";
import { getServerNow } from "@/lib/apiClient";

export const DynamicCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
  const router = useRouter();
  const { isPro } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  const design = item.cardDesign;
  const bgConfig = design?.background || item.uiStyle?.background;
  const textConf = item.uiStyle?.textConfig;

  useEffect(() => {
    const url = getSmartImageUrl(item.iconUrl);
    if (url) {
      setResolvedImageUrl(url);
    } else if (item.iconUrl && !item.iconUrl.startsWith("http") && !item.iconUrl.startsWith("/media/")) {
      syncAssetImages().then((map) => {
        const freshUrl = map[item.iconUrl!.trim().toLowerCase()];
        if (freshUrl) setResolvedImageUrl(getSmartImageUrl(freshUrl));
      });
    }
  }, [item.iconUrl]);

  useEffect(() => {
    const rawCmd = item.command || item.id;
    const isFolder = item.type === "FOLDER" || item.type.includes("SECTION");

    if (isFolder && rawCmd) {
      const cleanSlug = createFolderSlug(item.title, rawCmd, item.slug);
      router.prefetch(`/f/${encodeURIComponent(cleanSlug)}`);
    } else if (item.type === "NOTE_PDF" || item.type === "NOTE_SHEET") {
      const noteSlug = createNoteSlug(item.title, rawCmd, null);
      router.prefetch(`/note/${encodeURIComponent(noteSlug)}?title=${encodeURIComponent(item.title)}&type=${item.type}`);
    } else if (item.type === "HTML_PAGE") {
      router.prefetch(`/page/${encodeURIComponent(item.id)}?title=${encodeURIComponent(item.title)}`);
    }
  }, [item, router]);

  const getCardStyle = (): React.CSSProperties => {
    const radius = design?.cornerRadius ?? 16;
    let borderRadius = `${radius}px`;

    if (design?.shapeType === "CIRCLE") borderRadius = "9999px";
    else if (design?.shapeType === "LEAF") borderRadius = `${radius}px 0px ${radius}px 0px`;
    else if (design?.shapeType === "CAPSULE") borderRadius = "50px";

    if (resolvedImageUrl) {
      return {
        borderRadius,
        background: "transparent",
      };
    }

    let background = "linear-gradient(135deg, #1E1E24 0%, #121216 100%)";

    if (bgConfig && bgConfig.colors && bgConfig.colors.length > 0 && bgConfig.colors[0] !== "#00000000") {
      const colors = bgConfig.colors;
      if (bgConfig.type === "SOLID" || colors.length === 1) {
        background = colors[0];
      } else if (bgConfig.type === "LINEAR_GRADIENT") {
        const angle = bgConfig.gradientAngle ?? 45;
        background = `linear-gradient(${angle}deg, ${colors.join(", ")})`;
      } else if (bgConfig.type === "RADIAL_GRADIENT") {
        background = `radial-gradient(circle, ${colors.join(", ")})`;
      } else if (bgConfig.type === "SWEEP_GRADIENT") {
        background = `conic-gradient(${colors.join(", ")})`;
      }
    } else if (item.styleColor && item.styleColor !== "#00F0FF") {
      const start = item.styleColor;
      const end = item.gradientEndColor || "#000000";
      background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    }

    return {
      background,
      borderRadius,
      border: "1px solid rgba(255, 255, 255, 0.12)",
    };
  };

  const now = getServerNow();
  const isUpcoming = Boolean(item.examConfig?.startTimeMs && now < item.examConfig.startTimeMs);
  const isLive = Boolean(
    item.examConfig?.startTimeMs &&
      item.examConfig?.liveEndTimeMs &&
      now >= item.examConfig.startTimeMs &&
      now <= item.examConfig.liveEndTimeMs
  );
  const isLockedPremium = Boolean((item.isPremium || item.examConfig?.isPremium) && !isPro);

  const handleClick = () => {
    const actionUri = item.uiAction?.actionUri;
    if (actionUri) {
      if (actionUri.startsWith("http://") || actionUri.startsWith("https://")) {
        window.open(actionUri, "_blank", "noopener,noreferrer");
        return;
      }
      if (actionUri.startsWith("app://exam/")) {
        if (isLockedPremium) {
          alert("👑 এটি একটি প্রিমিয়াম পরীক্ষা। আনলক করতে PRO মেম্বারশিপ নিন!");
          router.push("/premium");
          return;
        }
        const examCmd = actionUri.replace("app://exam/", "");
        const cleanSlug = createExamSlug(item.title, examCmd, item.slug);
        router.push(`/exam/${encodeURIComponent(cleanSlug)}?title=${encodeURIComponent(item.title)}`);
        return;
      }
      if (actionUri.startsWith("app://folder/")) {
        const folderCmd = actionUri.replace("app://folder/", "").split("?")[0];
        const cleanSlug = createFolderSlug(item.title, folderCmd, item.slug);
        router.push(`/f/${encodeURIComponent(cleanSlug)}`);
        return;
      }
      if (actionUri.startsWith("app://page/")) {
        const pageCmd = actionUri.replace("app://page/", "");
        router.push(`/page/${encodeURIComponent(pageCmd)}?title=${encodeURIComponent(item.title)}`);
        return;
      }
    }

    const rawCmd = item.command || item.id;

    if (item.type === "EXAM_FIREBASE") {
      if (isLockedPremium) {
        alert("👑 এটি একটি প্রিমিয়াম পরীক্ষা। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      if (isUpcoming && item.examConfig?.startTimeMs) {
        const dt = new Date(item.examConfig.startTimeMs).toLocaleString("bn-BD", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        alert(`⏳ এই পরীক্ষাটি এখনো শুরু হয়নি!\nশুরুর সময়: ${dt}`);
        return;
      }
      setShowModal(true);
    } else if (item.type === "FOLDER" || item.type.includes("SECTION")) {
      const cleanSlug = createFolderSlug(item.title, rawCmd, item.slug);
      router.push(`/f/${encodeURIComponent(cleanSlug)}`);
    } else if (item.type === "NOTE_PDF" || item.type === "NOTE_SHEET") {
      if (isLockedPremium) {
        alert("👑 এটি একটি প্রিমিয়াম নোট। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      const noteSlug = createNoteSlug(item.title, rawCmd, null);
      router.push(`/note/${encodeURIComponent(noteSlug)}?title=${encodeURIComponent(item.title)}&type=${item.type}`);
    } else if (item.type === "HTML_PAGE") {
      if (isLockedPremium) {
        alert("👑 এটি প্রিমিয়াম কনটেন্ট। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      router.push(`/page/${encodeURIComponent(item.id)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type === "VIDEO_YOUTUBE") {
      if (isLockedPremium) {
        alert("👑 এটি একটি প্রিমিয়াম ভিডিও ক্লাস। আনলক করতে PRO মেম্বারশিপ নিন!");
        router.push("/premium");
        return;
      }
      router.push(`/video/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    }
  };

  const titleColor = textConf?.textColor && textConf.textColor !== "#FFFFFF" ? textConf.textColor : "#FFFFFF";
  const titleAlign =
    textConf?.textAlign === "START" ? "text-left" : textConf?.textAlign === "END" ? "text-right" : "text-center";
  const titleWeight = textConf?.fontWeight === "NORMAL" ? "font-medium" : "font-bold";

  return (
    <>
      <div
        onClick={handleClick}
        style={getCardStyle()}
        data-card-surface="custom"
        className="group relative w-full h-full overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.96] transition-all duration-150 select-none"
      >
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={item.title}
            className="w-full h-full object-fill rounded-[inherit] block pointer-events-none select-none"
          />
        ) : (
          <div className={`w-full h-full p-4 flex items-center justify-center ${titleAlign}`}>
            <h3
              style={{
                color: titleColor,
                fontSize: textConf?.fontSize ? `${Math.min(Math.max(textConf.fontSize, 11), 28)}px` : undefined,
              }}
              className={`${titleWeight} text-sm md:text-base leading-snug line-clamp-2 drop-shadow`}
            >
              <MathText text={item.title} />
            </h3>
          </div>
        )}

        {(design?.showBadge ?? true) && item.badgeText && (
          <span
            style={{ backgroundColor: item.badgeColor || "#FF2E2E" }}
            className="absolute top-0 right-0 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase shadow-md z-10"
          >
            {item.badgeText}
          </span>
        )}

        {isLive ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-md z-10">
            <Radio size={10} /> LIVE
          </span>
        ) : isUpcoming ? (
          <span className="absolute top-2 left-2 bg-gray-900/90 border border-amber-400/50 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
            <Clock size={9} /> UPCOMING
          </span>
        ) : item.isPremium || item.examConfig?.isPremium ? (
          <span className="absolute top-2 left-2 bg-black/60 border border-amber-400 text-amber-400 text-[9px] font-bold p-1 rounded-full shadow-md z-10">
            <Lock size={10} />
          </span>
        ) : null}
      </div>

      {showModal && <ExamActionModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
};