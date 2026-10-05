"use client";

import React, { useState } from "react";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { Lock, Play, FileText, Folder, Video, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { cacheEmbeddedTree } from "@/lib/layoutService";
import { ExamActionModal } from "@/components/ExamActionModal";

export const DynamicCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const design = item.cardDesign;
  const bgConfig = design?.background || item.uiStyle?.background;
  const textConf = item.uiStyle?.textConfig;

  // অ্যান্ড্রয়েড অ্যাপের নিখুঁত কালার ও ইমেজ ইঞ্জিন
  const getCardStyle = (): React.CSSProperties => {
    let background = "linear-gradient(135deg, #1E1E24 0%, #121216 100%)";

    // ১. গিটহাব বা বাহ্যিক ইমেজ সাপোর্ট
    if (item.iconUrl && item.iconUrl.startsWith("http")) {
      background = `linear-gradient(rgba(0,0,0,0.50), rgba(0,0,0,0.80)), url(${item.iconUrl})`;
    } 
    // ২. ভিজ্যুয়াল বিল্ডারের অ্যাডভান্সড গ্রেডিয়েন্ট
    else if (bgConfig && bgConfig.colors && bgConfig.colors.length > 0 && bgConfig.colors[0] !== "#00000000") {
      const colors = bgConfig.colors;
      if (bgConfig.type === "SOLID") {
        background = colors[0];
      } else if (bgConfig.type === "LINEAR_GRADIENT") {
        const angle = bgConfig.gradientAngle ?? 45;
        background = `linear-gradient(${angle}deg, ${colors.join(", ")})`;
      } else if (bgConfig.type === "RADIAL_GRADIENT") {
        background = `radial-gradient(circle, ${colors.join(", ")})`;
      }
    } 
    // ৩. অ্যান্ড্রয়েডের styleColor এবং gradientEndColor ফলব্যাক
    else if (item.styleColor && item.styleColor !== "#00F0FF") {
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
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      borderRadius,
      border: "1px solid rgba(255, 255, 255, 0.12)",
    };
  };

  // ক্লিক হ্যান্ডলার ও ইউনিভার্সাল লিঙ্ক প্রসেসিং
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
        cacheEmbeddedTree([item]);
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

  // টেক্সট স্টাইল ও কালার
  const titleColor = textConf?.textColor && textConf.textColor !== "#FFFFFF" ? textConf.textColor : "#FFFFFF";
  const titleAlign = textConf?.textAlign === "START" ? "text-left" : textConf?.textAlign === "END" ? "text-right" : "text-center";

  return (
    <>
      <div
        onClick={handleClick}
        style={getCardStyle()}
        className="group relative w-full h-full p-4 flex flex-col justify-between overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex items-center gap-1.5">
            {isLive ? (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <Radio size={10} /> LIVE
              </span>
            ) : item.isPremium ? (
              <span className="bg-amber-500/20 border border-amber-500 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} /> PRO
              </span>
            ) : (
              <span className="text-gray-300">
                {item.type === "EXAM_FIREBASE" && <Play size={16} className="text-cyan-400" />}
                {item.type === "FOLDER" && <Folder size={16} className="text-amber-400" />}
                {item.type.startsWith("NOTE") && <FileText size={16} className="text-emerald-400" />}
                {item.type === "VIDEO_YOUTUBE" && <Video size={16} className="text-red-400" />}
                {item.type === "HTML_PAGE" && <FileText size={16} className="text-purple-400" />}
              </span>
            )}

            {/* ব্যাজ শো করা */}
            {(design?.showBadge ?? true) && item.badgeText && (
              <span
                style={{ backgroundColor: item.badgeColor || "#FF2E2E" }}
                className="text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase"
              >
                {item.badgeText}
              </span>
            )}
          </div>

          {item.examConfig?.durationMinutes ? (
            <span className="text-[11px] font-semibold text-gray-300 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
              {item.examConfig.durationMinutes}m
            </span>
          ) : null}
        </div>

        <div className={`my-auto w-full ${titleAlign}`}>
          <h3
            style={{ color: titleColor }}
            className="font-bold text-sm md:text-base leading-snug line-clamp-2 drop-shadow"
          >
            <MathText text={item.title} />
          </h3>
          {item.subtitle && (
            <p className="text-gray-300 text-xs mt-1 line-clamp-1 drop-shadow-sm">{item.subtitle}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200">
          <span>
            {item.type === "EXAM_FIREBASE"
              ? isLive
                ? "লাইভ এক্সাম দিন"
                : "পরীক্ষা দিন"
              : item.type.startsWith("NOTE")
              ? "নোট পড়ুন"
              : item.type === "VIDEO_YOUTUBE"
              ? "ভিডিও দেখুন"
              : "খুলুন"}
          </span>
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>

      {showModal && <ExamActionModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
};