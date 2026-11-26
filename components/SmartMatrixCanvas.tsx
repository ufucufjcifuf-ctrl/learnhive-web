"use client";

import React, { useRef, useState, useEffect } from "react";
import { CardDesign, DashboardItem } from "@/types";
import { DynamicCard } from "@/components/DynamicCard";
import { useAuth } from "@/lib/useAuth";

function normalizeDesign(item: DashboardItem): {
  design: CardDesign;
  safeX: number;
  safeW: number;
  rawY: number;
} {
  const design: CardDesign = item.cardDesign || {
    gridX: 0,
    gridY: -1,
    gridW: 100,
    gridH: 35,
    gridSpan: 12,
    aspectRatio: 1.5,
    shapeType: "ROUNDED",
    cornerRadius: 16,
  };

  const rawW =
    design.gridW === 100 && design.gridSpan !== 12
      ? Math.round((design.gridSpan * 100) / 12)
      : design.gridW;

  const safeW = Math.min(100, Math.max(10, Number.isFinite(rawW) ? rawW : 100));
  const rawX = typeof design.gridX === "number" && Number.isFinite(design.gridX) ? design.gridX : 0;
  const safeX = Math.min(100 - safeW, Math.max(0, rawX));
  const rawY = typeof design.gridY === "number" && Number.isFinite(design.gridY) ? design.gridY : -1;

  return { design, safeX, safeW, rawY };
}

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

  const visibleItems = items.filter((it) => {
    if (it.isHidden || it.type === "NOTE_SHEET") return false;
    if (it.visibilityCondition === "PREMIUM_ONLY" && !isPro) return false;
    if (it.visibilityCondition === "FREE_ONLY" && isPro) return false;
    return true;
  });

  const placedItems: DashboardItem[] = [];
  const unplacedItems: DashboardItem[] = [];
  let maxPlacedBottom = 0;

  // Pass 1: Place all explicitly positioned items (gridY >= 0) and find maxPlacedBottom
  for (const item of visibleItems) {
    const { design, safeX, safeW, rawY } = normalizeDesign(item);
    if (rawY >= 0) {
      const safeH = Math.min(200, Math.max(8, Number.isFinite(design.gridH) ? design.gridH : 35));
      maxPlacedBottom = Math.max(maxPlacedBottom, rawY + safeH + 2);
      placedItems.push({
        ...item,
        cardDesign: { ...design, gridX: safeX, gridY: rawY, gridW: safeW, gridH: safeH },
      });
    }
  }

  // Pass 2: Stack auto-flow items (gridY < 0 or null) strictly below maxPlacedBottom
  let cursorY = maxPlacedBottom;
  for (const item of visibleItems) {
    const { design, safeX, safeW, rawY } = normalizeDesign(item);
    if (rawY < 0) {
      const ratio = design.aspectRatio && design.aspectRatio > 0.1 ? design.aspectRatio : 1.5;
      const h = Math.max(10, Math.round(safeW / ratio));
      unplacedItems.push({
        ...item,
        cardDesign: { ...design, gridX: safeX, gridY: cursorY, gridW: safeW, gridH: h },
      });
      cursorY += h + 2;
    }
  }

  const processedItems = [...placedItems, ...unplacedItems];
  const totalHeightPx = Math.max(maxPlacedBottom, cursorY) * unitPx + 24;

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