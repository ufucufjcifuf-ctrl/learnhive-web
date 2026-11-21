"use client";

import React, { useRef, useState, useEffect } from "react";
import { DashboardItem } from "@/types";
import { DynamicCard } from "@/components/DynamicCard";
import { useAuth } from "@/lib/useAuth";

export const SmartMatrixCanvas: React.FC<{ items: DashboardItem[] }> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(750);
  const { isPro } = useAuth();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const unitPx = containerWidth / 100;

  let cursorY = 0;
  const processedItems = items
    .filter((it) => {
      if (it.isHidden || it.type === "NOTE_SHEET") return false;
      if (it.visibilityCondition === "PREMIUM_ONLY" && !isPro) return false;
      if (it.visibilityCondition === "FREE_ONLY" && isPro) return false;
      return true;
    })
    .map((item) => {
      const design = item.cardDesign || {
        gridX: 0,
        gridY: -1,
        gridW: 100,
        gridH: 35,
        gridSpan: 12,
        aspectRatio: 1.5,
        shapeType: "ROUNDED",
        cornerRadius: 16,
      };

      const w =
        design.gridW === 100 && design.gridSpan !== 12
          ? Math.round((design.gridSpan * 100) / 12)
          : design.gridW;

      if (design.gridY !== -1) {
        cursorY = Math.max(cursorY, design.gridY + design.gridH + 2);
        return { ...item, cardDesign: { ...design, gridW: w } };
      } else {
        const h = Math.round(w / (design.aspectRatio || 1.5));
        const updated = {
          ...item,
          cardDesign: { ...design, gridX: 0, gridY: cursorY, gridW: w, gridH: h },
        };
        cursorY += h + 2;
        return updated;
      }
    });

  const totalHeightPx = cursorY * unitPx + 24;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ minHeight: `${totalHeightPx}px` }}
    >
      {processedItems.map((item) => {
        const d = item.cardDesign!;
        return (
          <div
            key={item.id}
            className="absolute transition-all duration-300"
            style={{
              left: `${d.gridX * unitPx}px`,
              top: `${d.gridY * unitPx}px`,
              width: `${d.gridW * unitPx}px`,
              height: `${d.gridH * unitPx}px`,
              padding: "4px",
            }}
          >
            <DynamicCard item={item} />
          </div>
        );
      })}
    </div>
  );
};