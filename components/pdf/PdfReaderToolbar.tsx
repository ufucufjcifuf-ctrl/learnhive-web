"use client";

import React from "react";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eraser,
  Highlighter,
  List,
  Maximize2,
  Moon,
  PenTool,
  Redo2,
  Search,
  Sun,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  OutlineEntry,
  SearchMatchItem,
  STROKE_COLORS,
  WebDrawTool,
  WebTheme,
} from "@/components/pdf/pdfDrawingUtils";

interface PdfReaderToolbarProps {
  title: string;
  currentPage: number;
  numPages: number;
  jumpInput: string;
  onJumpInputChange: (val: string) => void;
  onJumpSubmit: (targetPage: number) => void;
  onBack: () => void;

  outlineCount: number;
  showOutline: boolean;
  onToggleOutline: () => void;

  showSearch: boolean;
  onToggleSearch: () => void;
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  searching: boolean;
  activeSearchQuery: string;
  searchMatches: SearchMatchItem[];
  activeMatchIdx: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onCloseSearch: () => void;

  zoom: number;
  onZoomChange: (nextZoom: number) => void;

  theme: WebTheme;
  dimmerAlpha: number;
  showThemeMenu: boolean;
  onToggleThemeMenu: () => void;
  onThemeChange: (nextTheme: WebTheme) => void;
  onDimmerChange: (nextDimmer: number) => void;

  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  drawTool: WebDrawTool;
  onSelectDrawTool: (tool: WebDrawTool) => void;
  drawColor: string;
  onSelectDrawColor: (hex: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;

  onOpenNotesDrawer: () => void;
}

export const PdfReaderToolbar: React.FC<PdfReaderToolbarProps> = ({
  title,
  currentPage,
  numPages,
  jumpInput,
  onJumpInputChange,
  onJumpSubmit,
  onBack,
  outlineCount,
  showOutline,
  onToggleOutline,
  showSearch,
  onToggleSearch,
  searchInput,
  onSearchInputChange,
  searching,
  activeSearchQuery,
  searchMatches,
  activeMatchIdx,
  onPrevMatch,
  onNextMatch,
  onCloseSearch,
  zoom,
  onZoomChange,
  theme,
  dimmerAlpha,
  showThemeMenu,
  onToggleThemeMenu,
  onThemeChange,
  onDimmerChange,
  isDrawingMode,
  onToggleDrawingMode,
  drawTool,
  onSelectDrawTool,
  drawColor,
  onSelectDrawColor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  onOpenNotesDrawer,
}) => {
  return (
    <>
      <header className="w-full border-b border-white/10 bg-[#121218]/95 backdrop-blur z-40 px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-white truncate max-w-[160px] sm:max-w-xs">
              {title}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold">
              <BookOpen size={11} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onJumpSubmit(Number(jumpInput) || currentPage);
                }}
                className="flex items-center gap-1"
              >
                <span>পেজ</span>
                <input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={jumpInput}
                  onChange={(e) => onJumpInputChange(e.target.value)}
                  onBlur={() => onJumpSubmit(Number(jumpInput) || currentPage)}
                  className="w-11 bg-black/40 border border-white/15 rounded-md px-1 text-center text-white font-bold outline-none focus:border-cyan-400"
                />
                <span>/ {numPages || "-"}</span>
              </form>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {outlineCount > 0 && (
            <button
              type="button"
              onClick={onToggleOutline}
              title="সূচিপত্র (TOC)"
              className={`p-2 rounded-xl border text-xs transition ${
                showOutline
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-white/5 border-white/10 text-gray-300"
              }`}
            >
              <List size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSearch}
            title="PDF-এর ভেতরে খুঁজুন (Ctrl+F)"
            className={`p-2 rounded-xl border text-xs transition ${
              showSearch
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            <Search size={15} />
          </button>

          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.6, Number((zoom - 0.2).toFixed(2))))}
            title="Zoom Out"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-[11px] font-mono font-bold text-gray-300 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(3, Number((zoom + 0.2).toFixed(2))))}
            title="Zoom In"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(1)}
            title="Fit Width"
            className="hidden sm:inline-flex p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          >
            <Maximize2 size={15} />
          </button>

          <button
            type="button"
            onClick={onToggleThemeMenu}
            title="থিম ও ব্রাইটনেস"
            className={`p-2 rounded-xl border transition ${
              theme !== "ORIGINAL" || dimmerAlpha > 0
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            {theme === "NIGHT" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button
            type="button"
            onClick={onToggleDrawingMode}
            title="হাইলাইটার ও কলম"
            className={`p-2 rounded-xl border transition ${
              isDrawingMode
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            <Highlighter size={15} />
          </button>

          <button
            type="button"
            onClick={onOpenNotesDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs transition"
          >
            <Bookmark size={14} />
            <span className="hidden sm:inline">নোট</span>
          </button>
        </div>
      </header>

      {showThemeMenu && (
        <div className="bg-[#161923] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-center gap-4 text-xs z-30">
          <div className="flex items-center gap-1.5">
            {(["ORIGINAL", "NIGHT", "SEPIA"] as WebTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onThemeChange(t)}
                className={`px-3 py-1 rounded-lg font-bold border transition ${
                  theme === t
                    ? "bg-cyan-500 text-black border-cyan-500"
                    : "bg-white/5 border-white/10 text-gray-300"
                }`}
              >
                {t === "ORIGINAL" ? "Original" : t === "NIGHT" ? "Night" : "Sepia"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Dim: {Math.round(dimmerAlpha * 100)}%</span>
            <input
              type="range"
              min={0}
              max={0.65}
              step={0.05}
              value={dimmerAlpha}
              onChange={(e) => onDimmerChange(Number(e.target.value))}
              className="w-24 accent-amber-400"
            />
          </div>
        </div>
      )}

      {isDrawingMode && (
        <div className="bg-[#161923] border-b border-white/10 px-4 py-2 flex flex-wrap items-center justify-center gap-2.5 text-xs z-30">
          <button
            type="button"
            onClick={() => onSelectDrawTool("HIGHLIGHTER")}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold ${
              drawTool === "HIGHLIGHTER"
                ? "bg-amber-400 text-black border-amber-400"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            <Highlighter size={13} /> Highlight
          </button>
          <button
            type="button"
            onClick={() => onSelectDrawTool("PEN")}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold ${
              drawTool === "PEN"
                ? "bg-cyan-400 text-black border-cyan-400"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            <PenTool size={13} /> Pen
          </button>
          <button
            type="button"
            onClick={() => onSelectDrawTool("ERASER")}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold ${
              drawTool === "ERASER"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            <Eraser size={13} /> Eraser
          </button>

          <div className="flex items-center gap-1.5 px-2 border-l border-white/10">
            {STROKE_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onSelectDrawColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-5 h-5 rounded-full transition ${
                  drawColor === hex && drawTool !== "ERASER" ? "ring-2 ring-white scale-110" : "opacity-70"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-white/10">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 text-cyan-300"
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 text-cyan-300"
              title="Redo"
            >
              <Redo2 size={14} />
            </button>
            <button
              type="button"
              onClick={onClearPage}
              className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25"
              title="Clear Current Page"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="bg-[#161923] border-b border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-xs z-30">
          <Search size={14} className="text-cyan-400" />
          <input
            type="text"
            autoFocus
            placeholder="শব্দ বা বাক্য খুঁজুন..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className="w-56 sm:w-72 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none focus:border-cyan-400"
          />
          {searching ? (
            <span className="text-cyan-400 animate-pulse">খুঁজছে...</span>
          ) : activeSearchQuery ? (
            <span className="text-gray-300 font-bold">
              {searchMatches.length > 0 ? `${activeMatchIdx + 1} / ${searchMatches.length}` : "০ মিল"}
            </span>
          ) : null}
          {searchMatches.length > 0 && (
            <>
              <button
                type="button"
                onClick={onPrevMatch}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={onNextMatch}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <ChevronDown size={14} />
              </button>
            </>
          )}
          <button type="button" onClick={onCloseSearch} className="p-1.5 text-gray-400 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
};

export const PdfOutlineSidebar: React.FC<{
  outline: OutlineEntry[];
  onClose: () => void;
  onSelectPage: (pageNumber: number) => void;
}> = ({ outline, onClose, onSelectPage }) => (
  <aside className="w-64 bg-[#121218] border-r border-white/10 h-full overflow-y-auto p-3 z-30 flex-shrink-0">
    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
      <span className="text-xs font-extrabold text-cyan-400">সূচিপত্র (TOC)</span>
      <button type="button" onClick={onClose} className="text-gray-400">
        <X size={14} />
      </button>
    </div>
    <div className="flex flex-col gap-1">
      {outline.map((entry, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectPage(entry.pageNumber)}
          style={{ paddingLeft: `${8 + entry.level * 12}px` }}
          className="text-left text-xs py-1.5 px-2 rounded-lg hover:bg-white/10 text-gray-200 flex items-center justify-between gap-2"
        >
          <span className="truncate">{entry.title}</span>
          <span className="text-[10px] text-cyan-400 font-bold flex-shrink-0">
            p.{entry.pageNumber}
          </span>
        </button>
      ))}
    </div>
  </aside>
);