"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  buildSvgSmoothPath,
  isPointNearWebStroke,
  SearchMatchRect,
  WebDrawingPoint,
  WebDrawingStroke,
  WebDrawTool,
  WebTheme,
} from "@/components/pdf/pdfDrawingUtils";

export interface PdfPageCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number; // 1-based
  currentVisiblePage: number;
  containerWidth: number;
  zoom: number;
  settledZoom: number;
  theme: WebTheme;
  dimmerAlpha: number;
  watermarkText: string;
  isDrawingMode: boolean;
  drawTool: WebDrawTool;
  drawColor: string;
  strokeWidthFraction: number;
  strokes: WebDrawingStroke[];
  noteCount: number;
  searchQuery: string;
  isActiveSearchPage: boolean;
  onOpenNotesForPage: (pageIndex: number) => void;
  onCommitStrokes: (pageIndex: number, prev: WebDrawingStroke[], next: WebDrawingStroke[]) => void;
}

const MAX_CANVAS_PIXELS = 5_500_000;

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = React.memo(function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  currentVisiblePage,
  containerWidth,
  zoom,
  settledZoom,
  theme,
  dimmerAlpha,
  watermarkText,
  isDrawingMode,
  drawTool,
  drawColor,
  strokeWidthFraction,
  strokes,
  noteCount,
  searchQuery,
  isActiveSearchPage,
  onOpenNotesForPage,
  onCommitStrokes,
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [inWindow, setInWindow] = useState(pageNumber <= 3);
  const [aspectRatio, setAspectRatio] = useState<number>(0.707);
  const [rendered, setRendered] = useState(false);

  const aspectRatioRef = useRef<number>(0.707);
  const renderedRef = useRef<boolean>(false);
  const lastRenderedKeyRef = useRef<string>("");
  const currentVisiblePageRef = useRef<number>(currentVisiblePage);
  currentVisiblePageRef.current = currentVisiblePage;

  const [activePoints, setActivePoints] = useState<WebDrawingPoint[]>([]);
  const [workingStrokes, setWorkingStrokes] = useState<WebDrawingStroke[]>(strokes);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointersRef = useRef<Set<number>>(new Set());
  const dragPointsRef = useRef<WebDrawingPoint[]>([]);
  const workingStrokesRef = useRef<WebDrawingStroke[]>(strokes);
  const initialStrokesRef = useRef<WebDrawingStroke[]>(strokes);
  const eraserChangedRef = useRef<boolean>(false);

  const [searchRects, setSearchRects] = useState<SearchMatchRect[]>([]);

  useEffect(() => {
    setWorkingStrokes(strokes);
    workingStrokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    if (!isDrawingMode) {
      activePointersRef.current.clear();
      activePointerIdRef.current = null;
      return;
    }

    const onGlobalPointerEnd = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
    };

    window.addEventListener("pointerup", onGlobalPointerEnd);
    window.addEventListener("pointercancel", onGlobalPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onGlobalPointerEnd);
      window.removeEventListener("pointercancel", onGlobalPointerEnd);
    };
  }, [isDrawingMode]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInWindow(entry.isIntersecting);
        }
      },
      { rootMargin: "550px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber]);

  const preloadRadius = settledZoom > 1.6 ? 1 : 2;
  const shouldHoldCanvas = inWindow || Math.abs(pageNumber - currentVisiblePage) <= preloadRadius;

  useEffect(() => {
    const visibleCanvas = canvasRef.current;
    if (!shouldHoldCanvas) {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
      lastRenderedKeyRef.current = "";
      renderedRef.current = false;
      if (visibleCanvas && (visibleCanvas.width > 0 || visibleCanvas.height > 0)) {
        visibleCanvas.width = 0;
        visibleCanvas.height = 0;
        setRendered(false);
      }
      return;
    }

    const renderKey = `${containerWidth}_${settledZoom}`;
    if (renderedRef.current && lastRenderedKeyRef.current === renderKey) {
      return;
    }

    let cancelled = false;
    let offscreenCanvas: HTMLCanvasElement | null = null;

    const distFromCurrent = Math.abs(pageNumber - currentVisiblePageRef.current);
    const priorityDelayMs = distFromCurrent === 0 ? 0 : distFromCurrent === 1 ? 60 : 130;

    async function renderPage() {
      let page: PDFPageProxy | null = null;
      try {
        if (priorityDelayMs > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, priorityDelayMs);
          });
          if (cancelled) return;
        }

        page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const vp1 = page.getViewport({ scale: 1 });
        const ratio = vp1.height > 0 ? vp1.width / vp1.height : 0.707;
        if (Math.abs(ratio - aspectRatioRef.current) > 0.002) {
          aspectRatioRef.current = ratio;
          setAspectRatio(ratio);
        }

        const horizontalPad = containerWidth >= 640 ? 32 : 16;
        const baseCssWidth = Math.max(260, containerWidth - horizontalPad);
        const rawDpr = window.devicePixelRatio || 1;
        const cappedDpr = Math.min(
          rawDpr,
          settledZoom > 2.0 ? 1.35 : settledZoom > 1.4 ? 1.6 : 2.0
        );

        const fitScale = Math.max(0.5, baseCssWidth / Math.max(1, vp1.width));
        let renderScale = Math.min(fitScale * settledZoom * cappedDpr, fitScale * 3.2);

        let pixelW = Math.floor(vp1.width * renderScale);
        let pixelH = Math.floor(vp1.height * renderScale);
        const totalPixels = pixelW * pixelH;
        if (totalPixels > MAX_CANVAS_PIXELS) {
          const factor = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
          renderScale *= factor;
          pixelW = Math.floor(vp1.width * renderScale);
          pixelH = Math.floor(vp1.height * renderScale);
        }

        offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = Math.max(1, pixelW);
        offscreenCanvas.height = Math.max(1, pixelH);

        const offCtx = offscreenCanvas.getContext("2d");
        if (!offCtx) return;

        const renderViewport = page.getViewport({ scale: renderScale });
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const task = page.render({
          canvas: offscreenCanvas,
          canvasContext: offCtx,
          viewport: renderViewport,
        } as Parameters<typeof page.render>[0]);
        renderTaskRef.current = task;

        await task.promise;
        if (cancelled) return;

        const targetCanvas = canvasRef.current;
        if (targetCanvas && offscreenCanvas) {
          targetCanvas.width = offscreenCanvas.width;
          targetCanvas.height = offscreenCanvas.height;
          const targetCtx = targetCanvas.getContext("2d");
          if (targetCtx) {
            targetCtx.drawImage(offscreenCanvas, 0, 0);
          }
          lastRenderedKeyRef.current = renderKey;
          renderedRef.current = true;
          setRendered(true);
        }
      } catch {
        // Ignore transient cancellation noise
      } finally {
        renderTaskRef.current = null;
        if (offscreenCanvas) {
          offscreenCanvas.width = 0;
          offscreenCanvas.height = 0;
          offscreenCanvas = null;
        }
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, shouldHoldCanvas, containerWidth, settledZoom]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !shouldHoldCanvas) {
      setSearchRects([]);
      return;
    }

    let cancelled = false;
    async function findRects() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const vp = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        if (cancelled) return;

        const items = textContent.items as Array<{
          str?: unknown;
          transform?: unknown;
          width?: unknown;
          height?: unknown;
        }>;

        const m = vp.transform;
        const m0 = m[0] ?? 1;
        const m1 = m[1] ?? 0;
        const m2 = m[2] ?? 0;
        const m3 = m[3] ?? 1;
        const m4 = m[4] ?? 0;
        const m5 = m[5] ?? 0;

        const hits: SearchMatchRect[] = [];
        for (const item of items) {
          if (typeof item?.str !== "string" || !Array.isArray(item.transform)) {
            continue;
          }
          if (!item.str.toLowerCase().includes(q)) continue;

          const tx = Number(item.transform[4] || 0);
          const ty = Number(item.transform[5] || 0);
          const w = Number(item.width || 0);
          const h =
            Number(item.height || 0) ||
            Math.hypot(Number(item.transform[2] || 0), Number(item.transform[3] || 0)) ||
            12;

          const px1 = tx;
          const py1 = ty;
          const px2 = tx + Math.max(w, 8);
          const py2 = ty + h;

          const vx1 = m0 * px1 + m2 * py1 + m4;
          const vy1 = m1 * px1 + m3 * py1 + m5;
          const vx2 = m0 * px2 + m2 * py2 + m4;
          const vy2 = m1 * px2 + m3 * py2 + m5;

          const x1 = Math.min(vx1, vx2);
          const x2 = Math.max(vx1, vx2);
          const y1 = Math.min(vy1, vy2);
          const y2 = Math.max(vy1, vy2);

          hits.push({
            left: Math.max(0, x1 / vp.width),
            top: Math.max(0, y1 / vp.height),
            width: Math.min(1, Math.max(0.015, (x2 - x1) / vp.width)),
            height: Math.min(1, Math.max(0.015, (y2 - y1) / vp.height)),
          });
        }
        if (!cancelled) setSearchRects(hits);
      } catch {
        if (!cancelled) setSearchRects([]);
      }
    }

    findRects();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, searchQuery, shouldHoldCanvas]);

  const getNormalizedPoint = (e: React.PointerEvent<SVGSVGElement>): WebDrawingPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
    const y = rect.height > 0 ? Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) : 0;
    return { x, y };
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingMode) return;
    activePointersRef.current.add(e.pointerId);

    if (activePointersRef.current.size >= 2) {
      if (activePointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(activePointerIdRef.current);
        } catch {}
      }
      activePointerIdRef.current = null;
      dragPointsRef.current = [];
      setActivePoints([]);
      setWorkingStrokes(initialStrokesRef.current);
      workingStrokesRef.current = initialStrokesRef.current;
      return;
    }

    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activePointerIdRef.current = e.pointerId;
    initialStrokesRef.current = workingStrokesRef.current;
    eraserChangedRef.current = false;

    const pt = getNormalizedPoint(e);
    if (drawTool === "ERASER") {
      const next = workingStrokesRef.current.filter(
        (s) => !isPointNearWebStroke(pt.x, pt.y, s, aspectRatio)
      );
      if (next.length !== workingStrokesRef.current.length) {
        eraserChangedRef.current = true;
        workingStrokesRef.current = next;
        setWorkingStrokes(next);
      }
    } else {
      dragPointsRef.current = [pt];
      setActivePoints([pt]);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingMode || activePointerIdRef.current !== e.pointerId) return;
    if (activePointersRef.current.size >= 2) return;

    const pt = getNormalizedPoint(e);
    if (drawTool === "ERASER") {
      const next = workingStrokesRef.current.filter(
        (s) => !isPointNearWebStroke(pt.x, pt.y, s, aspectRatio)
      );
      if (next.length !== workingStrokesRef.current.length) {
        eraserChangedRef.current = true;
        workingStrokesRef.current = next;
        setWorkingStrokes(next);
      }
    } else {
      const pts = dragPointsRef.current;
      const last = pts[pts.length - 1];
      if (!last || Math.abs(pt.x - last.x) > 0.002 || Math.abs(pt.y - last.y) > 0.002) {
        dragPointsRef.current = [...pts, pt];
        setActivePoints(dragPointsRef.current);
      }
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const prevSnapshot = initialStrokesRef.current;
    if (drawTool === "ERASER") {
      if (eraserChangedRef.current) {
        onCommitStrokes(pageNumber - 1, prevSnapshot, workingStrokesRef.current);
      }
    } else if (dragPointsRef.current.length >= 2) {
      const newStroke: WebDrawingStroke = {
        colorHex: drawColor,
        points: dragPointsRef.current,
        isEraser: false,
        strokeWidthFraction,
        isPen: drawTool === "PEN",
      };
      const updated = [...prevSnapshot, newStroke];
      workingStrokesRef.current = updated;
      setWorkingStrokes(updated);
      onCommitStrokes(pageNumber - 1, prevSnapshot, updated);
    }

    dragPointsRef.current = [];
    setActivePoints([]);
  };

  const horizontalPad = containerWidth >= 640 ? 32 : 16;
  const cssWidthPx = Math.max(260, (containerWidth - horizontalPad) * zoom);
  const cssHeightPx = cssWidthPx / Math.max(0.25, aspectRatio);

  const canvasFilter =
    theme === "NIGHT"
      ? "invert(0.92) hue-rotate(180deg)"
      : theme === "SEPIA"
      ? "sepia(0.35) brightness(0.95)"
      : "none";

  return (
    <div
      ref={wrapperRef}
      style={{ width: `${cssWidthPx}px`, height: `${cssHeightPx}px` }}
      className="relative mx-auto rounded-2xl overflow-hidden shadow-2xl bg-white border border-white/10 flex-shrink-0"
    >
      <div className="w-full h-full relative" style={{ filter: canvasFilter }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
        {!rendered && (
          <div className="absolute inset-0 bg-[#181C26] flex items-center justify-center">
            <span className="text-xs text-gray-400 font-bold animate-pulse">
              পেজ {pageNumber} লোড হচ্ছে...
            </span>
          </div>
        )}
      </div>

      {dimmerAlpha > 0.01 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0, 0, 0, ${dimmerAlpha})` }}
        />
      )}

      {searchRects.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {searchRects.map((r, i) => (
            <div
              key={i}
              style={{
                left: `${r.left * 100}%`,
                top: `${r.top * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
              }}
              className={`absolute ${isActiveSearchPage ? "pdf-search-hit-active" : "pdf-search-hit"}`}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden grid grid-cols-2 grid-rows-3 opacity-20">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center -rotate-[28deg]">
            <span
              className={`text-[11px] sm:text-xs font-black tracking-wider whitespace-nowrap ${
                theme === "NIGHT" ? "text-white/35" : "text-slate-700/45"
              }`}
            >
              {watermarkText}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerUp}
        style={{ touchAction: isDrawingMode ? "none" : "auto" }}
        className={`absolute inset-0 w-full h-full z-30 ${
          isDrawingMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        }`}
      >
        {workingStrokes.map((s, idx) => {
          if (s.isEraser || s.points.length < 2) return null;
          const widthFrac = s.strokeWidthFraction && s.strokeWidthFraction > 0 ? s.strokeWidthFraction : 0.032;
          return (
            <path
              key={idx}
              d={buildSvgSmoothPath(s.points)}
              fill="none"
              stroke={s.colorHex || "#FFD700"}
              strokeOpacity={s.isPen ? 0.92 : 0.36}
              strokeWidth={widthFrac}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {activePoints.length >= 2 && drawTool !== "ERASER" && (
          <path
            d={buildSvgSmoothPath(activePoints)}
            fill="none"
            stroke={drawColor}
            strokeOpacity={drawTool === "PEN" ? 0.92 : 0.36}
            strokeWidth={strokeWidthFraction}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5">
        {noteCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenNotesForPage(pageNumber - 1)}
            className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md hover:bg-amber-300 transition"
          >
            Notes ({noteCount})
          </button>
        )}
        <span className="bg-black/65 text-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {pageNumber}
        </span>
      </div>
    </div>
  );
});