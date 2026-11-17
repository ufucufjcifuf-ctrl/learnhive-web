"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardItem } from "@/types";
import { MathText } from "@/components/MathText";
import { Lock, Radio, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExamActionModal } from "@/components/ExamActionModal";
import { getSmartImageUrl, syncAssetImages } from "@/lib/imageService";
import { createFolderSlug, createExamSlug, createNoteSlug } from "@/lib/slugUtils";
import { useAuth } from "@/lib/useAuth";
import { getServerNow } from "@/lib/apiClient";

function resolveShapeStyles(shapeType: string | undefined, radius: number): React.CSSProperties {
  const safeR = Math.max(0, radius);
  switch (shapeType) {
    case "CIRCLE":
      return { borderRadius: "9999px" };
    case "CAPSULE":
      return { borderRadius: "9999px" };
    case "LEAF":
      return { borderRadius: `${safeR}px 0px ${safeR}px 0px` };
    case "SQUIRCLE":
      return { borderRadius: "32px" };
    case "CUT": {
      const c = Math.min(24, Math.max(10, safeR));
      return {
        clipPath: `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`,
      };
    }
    case "FOLDED":
      return {
        clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)",
      };
    case "DIAGONAL":
      return {
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), 0 100%)",
      };
    default:
      return { borderRadius: `${safeR}px` };
  }
}

function isTransparentColor(c?: string): boolean {
  if (!c) return true;
  const upper = c.trim().toUpperCase();
  return upper === "TRANSPARENT" || upper === "#TRANSPARENT" || upper === "#00000000";
}

export const DynamicCard: React.FC<{ item: DashboardItem }> = ({ item }) => {
  const router = useRouter();
  const { isPro } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(() =>
    getSmartImageUrl(item.iconUrl)
  );
  const [carouselIdx, setCarouselIdx] = useState(0);

  const design = item.cardDesign;
  const uiStyle = item.uiStyle;
  const bgConfig = design?.background || uiStyle?.background;
  const textConf = uiStyle?.textConfig;

  useEffect(() => {
    const url = getSmartImageUrl(item.iconUrl);
    if (url) {
      setResolvedImageUrl(url);
    } else if (item.iconUrl && !item.iconUrl.startsWith("http") && !item.iconUrl.startsWith("/media/")) {
      syncAssetImages().then((map) => {
        const freshUrl = map[item.iconUrl!.trim().toLowerCase()];
        if (freshUrl) setResolvedImageUrl(getSmartImageUrl(freshUrl) || freshUrl);
      });
    } else {
      setResolvedImageUrl(null);
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

  // Auto-scroll for CAROUSEL items
  const embeddedCount = item.embeddedItems?.length || 0;
  useEffect(() => {
    if (item.type !== "CAROUSEL" || embeddedCount <= 1) return;
    const delay = uiStyle?.autoScrollDelay && uiStyle.autoScrollDelay > 0 ? uiStyle.autoScrollDelay : 3500;
    const timer = setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % embeddedCount);
    }, delay);
    return () => clearInterval(timer);
  }, [item.type, embeddedCount, uiStyle?.autoScrollDelay]);

  const now = getServerNow();
  const isUpcoming = Boolean(item.examConfig?.startTimeMs && now < item.examConfig.startTimeMs);
  const isLive = Boolean(
    item.examConfig?.startTimeMs &&
      item.examConfig?.liveEndTimeMs &&
      now >= item.examConfig.startTimeMs &&
      now <= item.examConfig.liveEndTimeMs
  );
  const isLockedPremium = Boolean((item.isPremium || item.examConfig?.isPremium) && !isPro);

  const handleClick = useCallback(() => {
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
    } else if (item.type === "FOLDER" || item.type.includes("SECTION") || item.type === "CAROUSEL" || item.type === "HORIZONTAL_SCROLL") {
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
  }, [item, isLockedPremium, isUpcoming, router]);

  // Special non-card standalone layout nodes
  if (item.type === "SPACER") {
    return <div className="w-full h-full pointer-events-none" />;
  }

  if (item.type === "DIVIDER") {
    const divColor =
      bgConfig?.colors?.find((c) => !isTransparentColor(c)) || "rgba(255,255,255,0.12)";
    return (
      <div className="w-full h-full flex items-center px-2">
        <div className="w-full h-[1px]" style={{ backgroundColor: divColor }} />
      </div>
    );
  }

  if (item.type === "TEXT") {
    const tColor = textConf?.textColor && !isTransparentColor(textConf.textColor) ? textConf.textColor : "#FFFFFF";
    const tAlign =
      textConf?.textAlign === "START" ? "text-left" : textConf?.textAlign === "END" ? "text-right" : "text-center";
    const tWeight = textConf?.fontWeight === "NORMAL" ? "font-normal" : "font-bold";
    return (
      <div
        onClick={item.uiAction?.actionUri ? handleClick : undefined}
        className={`w-full h-full flex items-center px-3 ${
          textConf?.textAlign === "START"
            ? "justify-start"
            : textConf?.textAlign === "END"
            ? "justify-end"
            : "justify-center"
        } ${item.uiAction?.actionUri ? "cursor-pointer" : ""}`}
      >
        <div
          style={{
            color: tColor,
            fontSize: textConf?.fontSize ? `${Math.min(Math.max(textConf.fontSize, 11), 36)}px` : undefined,
          }}
          className={`${tWeight} ${tAlign} leading-snug`}
        >
          <MathText text={item.title} />
        </div>
      </div>
    );
  }

  // Embedded HORIZONTAL_SCROLL strip
  if (item.type === "HORIZONTAL_SCROLL" && item.embeddedItems && item.embeddedItems.length > 0) {
    const visibleChildren = item.embeddedItems.filter((ch) => !ch.isHidden);
    return (
      <div className="w-full h-full flex flex-col justify-center">
        {item.title && (
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">{item.title}</h3>
            <button
              type="button"
              onClick={handleClick}
              className="text-[11px] font-bold text-cyan-400 hover:underline flex-shrink-0"
            >
              সব দেখুন →
            </button>
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 flex-1 items-stretch">
          {visibleChildren.map((child) => (
            <div key={child.id} className="w-44 sm:w-52 flex-shrink-0">
              <DynamicCard item={child} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Embedded CAROUSEL banner slider
  if (item.type === "CAROUSEL" && item.embeddedItems && item.embeddedItems.length > 0) {
    const visibleSlides = item.embeddedItems.filter((ch) => !ch.isHidden);
    if (visibleSlides.length > 0) {
      const safeIndex = carouselIdx % visibleSlides.length;
      return (
        <div className="relative w-full h-full flex flex-col">
          <div className="relative flex-1 w-full overflow-hidden rounded-2xl">
            <DynamicCard item={visibleSlides[safeIndex]} />
            {visibleSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIdx((prev) => (prev - 1 + visibleSlides.length) % visibleSlides.length);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 z-20"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIdx((prev) => (prev + 1) % visibleSlides.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 z-20"
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
          {(uiStyle?.showDotIndicator ?? true) && visibleSlides.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {visibleSlides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCarouselIdx(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === safeIndex ? "w-5 bg-cyan-400" : "w-1.5 bg-white/25"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  const getCardStyle = (): React.CSSProperties => {
    const radius = design?.cornerRadius ?? 16;
    const shapeStyles = resolveShapeStyles(design?.shapeType, radius);

    const bWidth = uiStyle?.borderWidth ?? 0;
    const bColor = uiStyle?.borderColor;
    const borderCss =
      bWidth > 0 && bColor && !isTransparentColor(bColor)
        ? `${bWidth}px solid ${bColor}`
        : "1px solid rgba(255, 255, 255, 0.12)";

    const isFullImageCard =
      (item.displayMode === "IMAGE_PURE" || item.displayMode === "IMAGE_COVER") &&
      Boolean(resolvedImageUrl);

    if (isFullImageCard) {
      return {
        ...shapeStyles,
        border: bWidth > 0 && bColor && !isTransparentColor(bColor) ? borderCss : undefined,
        background: "transparent",
      };
    }

    let background = "linear-gradient(135deg, #1E1E24 0%, #121216 100%)";

    if (bgConfig && bgConfig.colors && bgConfig.colors.length > 0 && !isTransparentColor(bgConfig.colors[0])) {
      const validColors = bgConfig.colors.filter((c) => !isTransparentColor(c));
      if (bgConfig.type === "SOLID" || validColors.length === 1) {
        background = validColors[0] || background;
      } else if (validColors.length >= 2) {
        if (bgConfig.type === "LINEAR_GRADIENT") {
          const angle = bgConfig.gradientAngle ?? 45;
          background = `linear-gradient(${angle}deg, ${validColors.join(", ")})`;
        } else if (bgConfig.type === "RADIAL_GRADIENT") {
          background = `radial-gradient(circle, ${validColors.join(", ")})`;
        } else if (bgConfig.type === "SWEEP_GRADIENT") {
          background = `conic-gradient(${validColors.join(", ")})`;
        }
      }
    } else if (item.styleColor && item.styleColor !== "#00F0FF") {
      const start = item.styleColor;
      const end = item.gradientEndColor || "#000000";
      background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    }

    return {
      ...shapeStyles,
      background,
      border: borderCss,
    };
  };

  const titleColor =
    textConf?.textColor && !isTransparentColor(textConf.textColor) ? textConf.textColor : "#FFFFFF";
  const titleAlign =
    textConf?.textAlign === "START"
      ? "text-left items-start"
      : textConf?.textAlign === "END"
      ? "text-right items-end"
      : "text-center items-center";
  const titleWeight = textConf?.fontWeight === "NORMAL" ? "font-medium" : "font-bold";

  const padStart = uiStyle?.padding?.start && uiStyle.padding.start > 0 ? uiStyle.padding.start : 12;
  const padTop = uiStyle?.padding?.top && uiStyle.padding.top > 0 ? uiStyle.padding.top : 10;
  const padEnd = uiStyle?.padding?.end && uiStyle.padding.end > 0 ? uiStyle.padding.end : 12;
  const padBottom = uiStyle?.padding?.bottom && uiStyle.padding.bottom > 0 ? uiStyle.padding.bottom : 10;

  const isImagePure = item.displayMode === "IMAGE_PURE" && Boolean(resolvedImageUrl);
  const isImageCover = item.displayMode === "IMAGE_COVER" && Boolean(resolvedImageUrl);
  const overlayAlpha = Math.min(0.85, Math.max(0, uiStyle?.overlayOpacity ?? 0.35));

  return (
    <>
      <div
        onClick={handleClick}
        style={getCardStyle()}
        data-card-surface="custom"
        className="group relative w-full h-full overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.96] transition-all duration-150 select-none"
      >
        {(isImagePure || isImageCover) && resolvedImageUrl ? (
          <>
            <img
              src={resolvedImageUrl}
              alt={item.title}
              className="w-full h-full object-cover rounded-[inherit] block pointer-events-none select-none"
            />
            {isImageCover && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: `rgba(0, 0, 0, ${overlayAlpha})` }}
              />
            )}
          </>
        ) : null}

        {!isImagePure && (!isImageCover || uiStyle?.showTitleOnImage !== false) && (
          <div
            style={{
              padding: `${padTop}px ${padEnd}px ${padBottom}px ${padStart}px`,
            }}
            className={`relative z-10 w-full h-full flex flex-col justify-center ${titleAlign}`}
          >
            <h3
              style={{
                color: titleColor,
                fontSize: textConf?.fontSize ? `${Math.min(Math.max(textConf.fontSize, 11), 36)}px` : undefined,
              }}
              className={`${titleWeight} text-sm md:text-base leading-snug line-clamp-2 drop-shadow`}
            >
              <MathText text={item.title} />
            </h3>
            {uiStyle?.showSubtitle && item.subtitle && (
              <p
                style={{ color: titleColor, opacity: 0.78 }}
                className="text-[11px] leading-tight mt-0.5 line-clamp-2"
              >
                {item.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Corner icon thumbnail in STANDARD mode */}
        {!isImagePure && !isImageCover && resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt={item.title}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-lg object-cover border border-white/40 shadow-md z-10 pointer-events-none"
          />
        )}

        {(design?.showBadge ?? true) && item.badgeText && (
          <span
            style={{ backgroundColor: item.badgeColor || "#FF2E2E" }}
            className="absolute top-0 right-0 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase shadow-md z-20"
          >
            {item.badgeText}
          </span>
        )}

        {isLive ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-md z-20">
            <Radio size={10} /> LIVE
          </span>
        ) : isUpcoming ? (
          <span className="absolute top-2 left-2 bg-gray-900/90 border border-amber-400/50 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-20">
            <Clock size={9} /> UPCOMING
          </span>
        ) : item.isPremium || item.examConfig?.isPremium ? (
          <span className="absolute top-2 left-2 bg-black/60 border border-amber-400 text-amber-400 text-[9px] font-bold p-1 rounded-full shadow-md z-20">
            <Lock size={10} />
          </span>
        ) : null}
      </div>

      {showModal && <ExamActionModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
};