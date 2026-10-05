"use client";

import React, { useState, useEffect } from "react";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { Lock, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { cacheEmbeddedTree } from "@/lib/layoutService";
import { ExamActionModal } from "@/components/ExamActionModal";
import { getSmartImageUrl, syncAssetImages } from "@/lib/imageService";

export const DynamicCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  const design = item.cardDesign;
  const bgConfig = design?.background || item.uiStyle?.background;
  const textConf = item.uiStyle?.textConfig;

  // ইমেজ লিংক রিজলভ করা (গিটহাব লিংক বা অ্যাসেট নাম)
  useEffect(() => {
    let url = getSmartImageUrl(item.iconUrl);
    if (url) {
      setResolvedImageUrl(url);
    } else if (item.iconUrl && !item.iconUrl.startsWith("http")) {
      // 🔥 map: Record<string, string> টাইপ দিয়ে টাইপস্ক্রিপ্ট এরর ফিক্স করা হলো
      syncAssetImages().then((map: Record<string, string>) => {
        const freshUrl = map[item.iconUrl!.trim().toLowerCase()];
        if (freshUrl) setResolvedImageUrl(freshUrl);
      });
    }
  }, [item.iconUrl]);

  // ব্যাকগ্রাউন্ড স্টাইল
  const getCardStyle = (): React.CSSProperties => {
    let background = "linear-gradient(135deg, #1E1E24 0%, #121216 100%)";

    if (bgConfig && bgConfig.colors && bgConfig.colors.length > 0 && bgConfig.colors[0] !== "#00000000") {
      const colors = bgConfig.colors;
      if (bgConfig.type === "SOLID") {
        background = colors[0];
      } else if (bgConfig.type === "LINEAR_GRADIENT") {
        const angle = bgConfig.gradientAngle ?? 45;
        background = `linear-gradient(${angle}deg, ${colors.join(", ")})`;
      } else if (bgConfig.type === "RADIAL_GRADIENT") {
        background = `radial-gradient(circle, ${colors.join(", ")})`;
      }
    } else if (item.styleColor && item.styleColor !== "#00F0FF") {
      const start = item.styleColor;
      const end = item.gradientEndColor || "#000000";
      background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    }

    const radius = design?.cornerRadius ?? 16;
    let borderRadius = `${radius}px`;

    if (design?.shapeType === "CIRCLE") borderRadius = "9999px";
    else if (design?.shapeType === "LEAF") borderRadius = `${radius}px 0px ${radius}px 0px`;
    else if (design?.shapeType === "CAPSULE") borderRadius = "50px";

    return {
      background,
      borderRadius,
      border: "1px solid rgba(255, 255, 255, 0.12)",
    };
  };

  const handleClick = () => {
    const actionUri = item.uiAction?.actionUri;
    if (actionUri) {
      if (actionUri.startsWith("http://") || actionUri.startsWith("https://")) {
        window.open(actionUri, "_blank");
        return;
      }
      if (actionUri.startsWith("app://exam/")) {
        const examCmd = actionUri.replace("app://exam/", "");
        router.push(`/exam/${encodeURIComponent(examCmd)}?title=${encodeURIComponent(item.title)}`);
        return;
      }
      if (actionUri.startsWith("app://folder/")) {
        const folderCmd = actionUri.replace("app://folder/", "").split("?")[0];
        router.push(`/folder/${encodeURIComponent(folderCmd)}?title=${encodeURIComponent(item.title)}`);
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
      setShowModal(true);
    } else if (item.type === "FOLDER" || item.type.includes("SECTION")) {
      if (item.embeddedItems && item.embeddedItems.length > 0) {
        cacheEmbeddedTree(item.embeddedItems);
      }
      router.push(`/folder/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type === "NOTE_PDF" || item.type === "NOTE_SHEET") {
      router.push(`/note/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}&type=${item.type}`);
    } else if (item.type === "HTML_PAGE") {
      router.push(`/page/${encodeURIComponent(item.id)}?title=${encodeURIComponent(item.title)}`);
    } else if (item.type === "VIDEO_YOUTUBE") {
      router.push(`/video/${encodeURIComponent(rawCmd)}?title=${encodeURIComponent(item.title)}`);
    }
  };

  const isLive =
    item.examConfig?.startTimeMs &&
    item.examConfig?.liveEndTimeMs &&
    Date.now() >= item.examConfig.startTimeMs &&
    Date.now() <= item.examConfig.liveEndTimeMs;

  const titleColor = textConf?.textColor && textConf.textColor !== "#FFFFFF" ? textConf.textColor : "#FFFFFF";
  const titleAlign = textConf?.textAlign === "START" ? "text-left" : textConf?.textAlign === "END" ? "text-right" : "text-center";

  return (
    <>
      <div
        onClick={handleClick}
        style={getCardStyle()}
        className="group relative w-full h-full overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] transition-all duration-200"
      >
        {/* ছবি থাকলে হুবহু অ্যান্ড্রয়েড অ্যাপের মতো কার্ড জুড়ে ছবি লোড হবে */}
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={item.title}
            className="w-full h-full object-cover rounded-[inherit] block pointer-events-none select-none"
          />
        ) : (
          /* ছবি না থাকলে মাঝখানে টাইটেল টেক্সট দেখাবে */
          <div className={`w-full h-full p-4 flex items-center justify-center ${titleAlign}`}>
            <h3 style={{ color: titleColor }} className="font-bold text-sm md:text-base leading-snug line-clamp-2 drop-shadow">
              <MathText text={item.title} />
            </h3>
          </div>
        )}

        {/* ব্যাজ */}
        {(design?.showBadge ?? true) && item.badgeText && (
          <span
            style={{ backgroundColor: item.badgeColor || "#FF2E2E" }}
            className="absolute top-0 right-0 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase shadow-md z-10"
          >
            {item.badgeText}
          </span>
        )}

        {/* লাইভ বা প্রিমিয়াম স্ট্যাটাস */}
        {isLive ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-md z-10">
            <Radio size={10} /> LIVE
          </span>
        ) : item.isPremium ? (
          <span className="absolute top-2 left-2 bg-black/60 border border-amber-400 text-amber-400 text-[9px] font-bold p-1 rounded-full shadow-md z-10">
            <Lock size={10} />
          </span>
        ) : null}
      </div>

      {showModal && <ExamActionModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
};