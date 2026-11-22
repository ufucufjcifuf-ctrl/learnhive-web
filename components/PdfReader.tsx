"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Sparkles } from "lucide-react";
import { NoteAnnotationDrawer, PersonalNote } from "@/components/NoteAnnotationDrawer";
import { PdfPageCanvas } from "@/components/pdf/PdfPageCanvas";
import { PdfOutlineSidebar, PdfReaderToolbar } from "@/components/pdf/PdfReaderToolbar";
import {
  OutlineEntry,
  SearchMatchItem,
  WebDrawingStroke,
  WebDrawTool,
  WebTheme,
} from "@/components/pdf/pdfDrawingUtils";
import { API_BASE_URL, apiFetch, getAuthToken } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";

interface CloudNoteProgressResp {
  success: boolean;
  progress: { noteId: string; currentPage: number; totalPages: number; updatedAt: number } | null;
}

interface CloudNoteAnnotationsResp {
  success: boolean;
  items: { pageIndex: number; type: string; contentJson: string; updatedAt: number }[];
}

interface SyncedTextNotePayload {
  id: string;
  content: string;
  colorHex: string;
  timestamp: number;
}

interface PdfReaderProps {
  noteId: string;
  title: string;
  pdfUrl: string;
  isPremium: boolean;
  watermarkText: string;
  authToken?: string | null;
  onRefreshToken?: () => Promise<string | null>;
  onBack: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  noteId,
  title,
  pdfUrl,
  isPremium,
  watermarkText,
  authToken,
  onRefreshToken,
  onBack,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // 1-based
  const [jumpInput, setJumpInput] = useState("1");

  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [containerWidth, setContainerWidth] = useState(740);
  const [zoom, setZoom] = useState(1);

  const [theme, setTheme] = useState<WebTheme>("ORIGINAL");
  const [dimmerAlpha, setDimmerAlpha] = useState(0);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [showOutline, setShowOutline] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<SearchMatchItem[]>([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [searching, setSearching] = useState(false);

  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [notesSyncTick, setNotesSyncTick] = useState(0);
  const [noteCountsByPage, setNoteCountsByPage] = useState<Record<number, number>>({});

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawTool, setDrawTool] = useState<WebDrawTool>("HIGHLIGHTER");
  const [drawColor, setDrawColor] = useState("#FFD700");
  const [drawingsByPage, setDrawingsByPage] = useState<Record<number, WebDrawingStroke[]>>({});
  const [undoStacks, setUndoStacks] = useState<Record<number, WebDrawingStroke[][]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<number, WebDrawingStroke[][]>>({});

  const tokenRetryCountRef = useRef(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const pageSlotRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const lastTokenRef = useRef<string | null>(authToken ?? null);
  const currentPageRef = useRef<number>(1);
  const numPagesRef = useRef<number>(0);
  const suppressObserverRef = useRef<boolean>(false);
  const userMovedPageRef = useRef<boolean>(false);
  const dirtyProgressRef = useRef<boolean>(false);
  const dirtyAnnotationsRef = useRef<Set<string>>(new Set());
  const drawingsRef = useRef<Record<number, WebDrawingStroke[]>>({});
  const drawingTsRef = useRef<Record<number, number>>({});
  const notesTsRef = useRef<Record<number, number>>({});
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authToken) lastTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  useEffect(() => {
    drawingsRef.current = drawingsByPage;
  }, [drawingsByPage]);

  const flushCloudSync = useCallback(
    async (useKeepalive = false) => {
      if (!auth.currentUser || !noteId) return;

      const token = useKeepalive
        ? lastTokenRef.current
        : (await getAuthToken()) || lastTokenRef.current;
      if (!token) return;
      lastTokenRef.current = token;

      const dirtyKeys = Array.from(dirtyAnnotationsRef.current);
      dirtyAnnotationsRef.current.clear();

      if (dirtyKeys.length > 0) {
        let allPersonalNotes: PersonalNote[] = [];
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(`mcq_notes_${noteId}`);
            if (raw) allPersonalNotes = JSON.parse(raw) as PersonalNote[];
          } catch {}
        }

        const updates = dirtyKeys.map((key) => {
          const [pStr, type] = key.split("|");
          const pageIndex = Number(pStr);
          if (type === "PAGE_DRAWING") {
            const strokes = drawingsRef.current[pageIndex] || [];
            return {
              pageIndex,
              type: "PAGE_DRAWING",
              contentJson: JSON.stringify(strokes),
              updatedAt: drawingTsRef.current[pageIndex] || Date.now(),
            };
          }
          const pageNotes = allPersonalNotes
            .filter((n) => n.pageIndex === pageIndex)
            .map((n) => ({
              id: n.id,
              content: n.content,
              colorHex: n.colorHex,
              timestamp: n.timestamp,
            }));
          return {
            pageIndex,
            type: "PAGE_NOTES",
            contentJson: JSON.stringify(pageNotes),
            updatedAt: notesTsRef.current[pageIndex] || Date.now(),
          };
        });

        try {
          await fetch(`${API_BASE_URL}/api/user/note-annotations`, {
            method: "POST",
            keepalive: useKeepalive,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ noteId, updates }),
          });
        } catch {}
      }

      if (dirtyProgressRef.current && numPagesRef.current > 0) {
        dirtyProgressRef.current = false;
        try {
          await fetch(`${API_BASE_URL}/api/user/note-progress`, {
            method: "POST",
            keepalive: useKeepalive,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              noteId,
              currentPage: Math.max(0, currentPageRef.current - 1),
              totalPages: numPagesRef.current,
              updatedAt: Date.now(),
            }),
          });
        } catch {}
      }
    },
    [noteId]
  );

  const scheduleCloudSync = useCallback(() => {
    if (!auth.currentUser || !noteId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      flushCloudSync(false);
    }, 3500);
  }, [noteId, flushCloudSync]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushCloudSync(true);
      }
    };
    const onPageHide = () => {
      flushCloudSync(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      flushCloudSync(true);
    };
  }, [flushCloudSync]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(Math.min(el.clientWidth, 920));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !noteId) return;
    try {
      const rawDrawings = localStorage.getItem(`learnhive_pdf_drawings_${noteId}`);
      if (rawDrawings) {
        const parsed = JSON.parse(rawDrawings) as Record<number, WebDrawingStroke[]>;
        setDrawingsByPage(parsed);
        drawingsRef.current = parsed;
      }
      const rawDrawingTs = localStorage.getItem(`learnhive_pdf_drawings_ts_${noteId}`);
      if (rawDrawingTs) drawingTsRef.current = JSON.parse(rawDrawingTs);

      const rawNotesTs = localStorage.getItem(`learnhive_pdf_notes_ts_${noteId}`);
      if (rawNotesTs) notesTsRef.current = JSON.parse(rawNotesTs);

      const savedTheme = localStorage.getItem("learnhive_web_pdf_theme") as WebTheme | null;
      if (savedTheme === "ORIGINAL" || savedTheme === "NIGHT" || savedTheme === "SEPIA") {
        setTheme(savedTheme);
      }
    } catch {}
  }, [noteId]);

  const jumpToPageNumber = useCallback(
    (targetPage: number, isUserAction = true) => {
      const maxP = numPagesRef.current;
      if (maxP <= 0) return;
      const clamped = Math.min(maxP, Math.max(1, targetPage));
      if (isUserAction) {
        userMovedPageRef.current = true;
        dirtyProgressRef.current = true;
        scheduleCloudSync();
      }
      suppressObserverRef.current = true;
      setCurrentPage(clamped);
      setJumpInput(String(clamped));
      pageSlotRefs.current[clamped]?.scrollIntoView({
        behavior: isUserAction ? "smooth" : "auto",
        block: "start",
      });
      setTimeout(() => {
        suppressObserverRef.current = false;
      }, 450);
    },
    [scheduleCloudSync]
  );

  useEffect(() => {
    let cancelled = false;
    let loadingTaskRef: { destroy: () => Promise<void> } | null = null;
    let loadedDocRef: PDFDocumentProxy | null = null;

    async function initPdf() {
      setLoadingError(null);
      setLoadingPct(0);
      setPdfDoc(null);

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          httpHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          rangeChunkSize: 65536,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
        });
        loadingTaskRef = loadingTask;

        loadingTask.onProgress = (p: { loaded: number; total: number }) => {
          if (cancelled) return;
          if (p.total > 0) {
            setLoadingPct(Math.min(99, Math.round((p.loaded * 100) / p.total)));
          }
        };

        const doc = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy().catch(() => {});
          return;
        }
        loadedDocRef = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        numPagesRef.current = doc.numPages;
        setLoadingPct(100);

        let localPage = 1;
        let localUpdatedAt = 0;
        if (typeof window !== "undefined" && noteId) {
          try {
            const rawProg = localStorage.getItem(`learnhive_pdf_progress_${noteId}`);
            if (rawProg) {
              const parsed = JSON.parse(rawProg) as { page?: number; updatedAt?: number };
              localPage = Math.min(doc.numPages, Math.max(1, (parsed.page ?? 0) + 1));
              localUpdatedAt = parsed.updatedAt || 0;
              setCurrentPage(localPage);
              setJumpInput(String(localPage));
              suppressObserverRef.current = true;
              setTimeout(() => {
                pageSlotRefs.current[localPage]?.scrollIntoView({ behavior: "auto", block: "start" });
                setTimeout(() => {
                  suppressObserverRef.current = false;
                }, 400);
              }, 120);
            }
          } catch {}
        }

        if (auth.currentUser && noteId) {
          getAuthToken().then((t) => {
            if (t) lastTokenRef.current = t;
          });

          apiFetch<CloudNoteProgressResp>(`/api/user/note-progress?noteId=${encodeURIComponent(noteId)}`, {
            requireAuth: true,
          })
            .then((res) => {
              if (cancelled || !res.progress || userMovedPageRef.current) return;
              if (res.progress.updatedAt > localUpdatedAt) {
                const cloudPage = Math.min(doc.numPages, Math.max(1, res.progress.currentPage + 1));
                if (typeof window !== "undefined") {
                  localStorage.setItem(
                    `learnhive_pdf_progress_${noteId}`,
                    JSON.stringify({ page: cloudPage - 1, updatedAt: res.progress.updatedAt })
                  );
                }
                if (cloudPage !== localPage) {
                  suppressObserverRef.current = true;
                  setCurrentPage(cloudPage);
                  setJumpInput(String(cloudPage));
                  setTimeout(() => {
                    pageSlotRefs.current[cloudPage]?.scrollIntoView({ behavior: "auto", block: "start" });
                    setTimeout(() => {
                      suppressObserverRef.current = false;
                    }, 400);
                  }, 120);
                }
              }
            })
            .catch(() => {});

          apiFetch<CloudNoteAnnotationsResp>(
            `/api/user/note-annotations?noteId=${encodeURIComponent(noteId)}`,
            { requireAuth: true }
          )
            .then((res) => {
              if (cancelled || !res.items || res.items.length === 0) return;
              let drawingsUpdated = false;
              let notesUpdated = false;
              const nextDrawings = { ...drawingsRef.current };
              let allNotes: PersonalNote[] = [];
              if (typeof window !== "undefined") {
                try {
                  const raw = localStorage.getItem(`mcq_notes_${noteId}`);
                  if (raw) allNotes = JSON.parse(raw) as PersonalNote[];
                } catch {}
              }

              for (const item of res.items) {
                if (item.type === "PAGE_DRAWING") {
                  const localTs = drawingTsRef.current[item.pageIndex] || 0;
                  if (item.updatedAt > localTs) {
                    try {
                      nextDrawings[item.pageIndex] = JSON.parse(item.contentJson) as WebDrawingStroke[];
                      drawingTsRef.current[item.pageIndex] = item.updatedAt;
                      drawingsUpdated = true;
                    } catch {}
                  }
                } else if (item.type === "PAGE_NOTES") {
                  const localTs = notesTsRef.current[item.pageIndex] || 0;
                  if (item.updatedAt > localTs) {
                    try {
                      const synced = JSON.parse(item.contentJson) as SyncedTextNotePayload[];
                      allNotes = allNotes.filter((n) => n.pageIndex !== item.pageIndex);
                      for (const sn of synced) {
                        if (!sn.content) continue;
                        allNotes.push({
                          id: sn.id || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                          noteId,
                          pageIndex: item.pageIndex,
                          content: sn.content,
                          colorHex: sn.colorHex || "#FFD700",
                          timestamp: sn.timestamp || item.updatedAt,
                        });
                      }
                      notesTsRef.current[item.pageIndex] = item.updatedAt;
                      notesUpdated = true;
                    } catch {}
                  }
                }
              }

              if (drawingsUpdated) {
                drawingsRef.current = nextDrawings;
                setDrawingsByPage(nextDrawings);
                if (typeof window !== "undefined") {
                  localStorage.setItem(`learnhive_pdf_drawings_${noteId}`, JSON.stringify(nextDrawings));
                  localStorage.setItem(
                    `learnhive_pdf_drawings_ts_${noteId}`,
                    JSON.stringify(drawingTsRef.current)
                  );
                }
              }

              if (notesUpdated && typeof window !== "undefined") {
                localStorage.setItem(`mcq_notes_${noteId}`, JSON.stringify(allNotes));
                localStorage.setItem(`learnhive_pdf_notes_ts_${noteId}`, JSON.stringify(notesTsRef.current));
                setNotesSyncTick((t) => t + 1);
              }
            })
            .catch(() => {});
        }

        try {
          const rawOutline = await doc.getOutline();
          if (!cancelled && Array.isArray(rawOutline)) {
            const flat: OutlineEntry[] = [];
            const walk = async (
              nodes: { title: string; dest: string | unknown[] | null; items?: unknown[] }[],
              level: number
            ) => {
              for (const node of nodes) {
                let pageNum = 1;
                try {
                  let dest = node.dest;
                  if (typeof dest === "string") dest = await doc.getDestination(dest);
                  if (Array.isArray(dest) && dest[0]) {
                    const idx = await doc.getPageIndex(dest[0] as Parameters<typeof doc.getPageIndex>[0]);
                    pageNum = idx + 1;
                  }
                } catch {}
                if (node.title) flat.push({ title: node.title, pageNumber: pageNum, level });
                if (Array.isArray(node.items) && node.items.length > 0) {
                  await walk(node.items as typeof nodes, Math.min(level + 1, 3));
                }
              }
            };
            await walk(rawOutline as { title: string; dest: string | unknown[] | null; items?: unknown[] }[], 0);
            if (!cancelled) setOutline(flat);
          }
        } catch {}
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if ((msg.includes("401") || msg.includes("403")) && onRefreshToken && tokenRetryCountRef.current < 1) {
          tokenRetryCountRef.current += 1;
          const fresh = await onRefreshToken();
          if (fresh && !cancelled) {
            setReloadNonce((n) => n + 1);
            return;
          }
        }
        setLoadingError(
          msg.includes("401") || msg.includes("403")
            ? "👑 এই প্রিমিয়াম PDF নোটটি পড়তে লগইন বা PRO মেম্বারশিপ প্রয়োজন।"
            : "PDF নোটটি লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
        );
      }
    }

    initPdf();
    return () => {
      cancelled = true;
      loadedDocRef?.cleanup().catch(() => {});
      loadingTaskRef?.destroy().catch(() => {});
    };
  }, [pdfUrl, authToken, noteId, onRefreshToken, reloadNonce]);

  useEffect(() => {
    if (typeof window === "undefined" || !noteId || numPages <= 0 || suppressObserverRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          `learnhive_pdf_progress_${noteId}`,
          JSON.stringify({ page: currentPage - 1, updatedAt: Date.now() })
        );
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [currentPage, noteId, numPages]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "p")) {
        e.preventDefault();
        return;
      }
      if (isCtrlOrCmd && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowOutline(false);
        setShowThemeMenu(false);
        setShowNoteDrawer(false);
        return;
      }

      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        jumpToPageNumber(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        jumpToPageNumber(currentPage - 1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, jumpToPageNumber]);

  useEffect(() => {
    const q = searchInput.trim();
    if (!pdfDoc || !q) {
      setActiveSearchQuery("");
      setSearchMatches([]);
      setActiveMatchIdx(0);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setActiveSearchQuery(q);
      const found: SearchMatchItem[] = [];
      const lowerQ = q.toLowerCase();

      for (let p = 1; p <= pdfDoc.numPages; p++) {
        if (cancelled) break;
        try {
          const page = await pdfDoc.getPage(p);
          const content = await page.getTextContent();
          const joined = (content.items as Array<{ str?: unknown }>)
            .map((it) => (typeof it?.str === "string" ? it.str : ""))
            .join(" ");
          const idx = joined.toLowerCase().indexOf(lowerQ);
          if (idx !== -1) {
            const start = Math.max(0, idx - 24);
            const end = Math.min(joined.length, idx + q.length + 36);
            found.push({ pageNumber: p, snippet: joined.slice(start, end) });
          }
        } catch {}
      }

      if (!cancelled) {
        setSearchMatches(found);
        setActiveMatchIdx(0);
        setSearching(false);
        if (found.length > 0) jumpToPageNumber(found[0].pageNumber);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pdfDoc, searchInput, jumpToPageNumber]);

  const persistDrawings = useCallback(
    (pageIndex: number, nextMap: Record<number, WebDrawingStroke[]>) => {
      drawingsRef.current = nextMap;
      setDrawingsByPage(nextMap);
      drawingTsRef.current[pageIndex] = Date.now();
      dirtyAnnotationsRef.current.add(`${pageIndex}|PAGE_DRAWING`);

      if (typeof window !== "undefined" && noteId) {
        try {
          localStorage.setItem(`learnhive_pdf_drawings_${noteId}`, JSON.stringify(nextMap));
          localStorage.setItem(
            `learnhive_pdf_drawings_ts_${noteId}`,
            JSON.stringify(drawingTsRef.current)
          );
        } catch {}
      }
      scheduleCloudSync();
    },
    [noteId, scheduleCloudSync]
  );

  const handleCommitStrokes = useCallback(
    (pageIndex: number, prevStrokes: WebDrawingStroke[], nextStrokes: WebDrawingStroke[]) => {
      setUndoStacks((u) => ({
        ...u,
        [pageIndex]: [...(u[pageIndex] || []), prevStrokes].slice(-25),
      }));
      setRedoStacks((r) => {
        const copy = { ...r };
        delete copy[pageIndex];
        return copy;
      });
      persistDrawings(pageIndex, { ...drawingsRef.current, [pageIndex]: nextStrokes });
    },
    [persistDrawings]
  );

  const handlePageNotesEdited = useCallback(
    (pageIndex: number) => {
      notesTsRef.current[pageIndex] = Date.now();
      dirtyAnnotationsRef.current.add(`${pageIndex}|PAGE_NOTES`);
      if (typeof window !== "undefined" && noteId) {
        try {
          localStorage.setItem(`learnhive_pdf_notes_ts_${noteId}`, JSON.stringify(notesTsRef.current));
        } catch {}
      }
      scheduleCloudSync();
    },
    [noteId, scheduleCloudSync]
  );

  const handleUndo = () => {
    const pageIndex = currentPage - 1;
    const stack = undoStacks[pageIndex];
    if (!stack || stack.length === 0) return;

    const current = drawingsRef.current[pageIndex] || [];
    const target = stack[stack.length - 1];
    setUndoStacks((u) => ({ ...u, [pageIndex]: stack.slice(0, -1) }));
    setRedoStacks((r) => ({ ...r, [pageIndex]: [...(r[pageIndex] || []), current].slice(-25) }));
    persistDrawings(pageIndex, { ...drawingsRef.current, [pageIndex]: target });
  };

  const handleRedo = () => {
    const pageIndex = currentPage - 1;
    const stack = redoStacks[pageIndex];
    if (!stack || stack.length === 0) return;

    const current = drawingsRef.current[pageIndex] || [];
    const target = stack[stack.length - 1];
    setRedoStacks((r) => ({ ...r, [pageIndex]: stack.slice(0, -1) }));
    setUndoStacks((u) => ({ ...u, [pageIndex]: [...(u[pageIndex] || []), current].slice(-25) }));
    persistDrawings(pageIndex, { ...drawingsRef.current, [pageIndex]: target });
  };

  const handleClearCurrentPage = () => {
    const pageIndex = currentPage - 1;
    const current = drawingsRef.current[pageIndex] || [];
    if (current.length === 0) return;
    handleCommitStrokes(pageIndex, current, []);
  };

  const handlePageVisible = useCallback(
    (p: number) => {
      if (suppressObserverRef.current) return;
      if (p !== currentPageRef.current) {
        userMovedPageRef.current = true;
        dirtyProgressRef.current = true;
        setCurrentPage(p);
        setJumpInput(String(p));
        scheduleCloudSync();
      }
    },
    [scheduleCloudSync]
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nextZoom = Math.min(3, Math.max(0.6, pinchStartZoomRef.current * (dist / pinchStartDistRef.current)));
      setZoom(Number(nextZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const curPageIndex = currentPage - 1;
  const canUndo = (undoStacks[curPageIndex]?.length || 0) > 0;
  const canRedo = (redoStacks[curPageIndex]?.length || 0) > 0;
  const strokeWidthFraction = drawTool === "PEN" ? 0.007 : 0.034;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="pdf-protected-root min-h-screen h-screen bg-[#0A0A0E] text-white flex flex-col overflow-hidden"
    >
      <PdfReaderToolbar
        title={title}
        currentPage={currentPage}
        numPages={numPages}
        jumpInput={jumpInput}
        onJumpInputChange={setJumpInput}
        onJumpSubmit={(target) => jumpToPageNumber(target)}
        onBack={onBack}
        outlineCount={outline.length}
        showOutline={showOutline}
        onToggleOutline={() => setShowOutline((v) => !v)}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch((v) => !v)}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        searching={searching}
        activeSearchQuery={activeSearchQuery}
        searchMatches={searchMatches}
        activeMatchIdx={activeMatchIdx}
        onPrevMatch={() => {
          const prev = (activeMatchIdx - 1 + searchMatches.length) % searchMatches.length;
          setActiveMatchIdx(prev);
          jumpToPageNumber(searchMatches[prev].pageNumber);
        }}
        onNextMatch={() => {
          const next = (activeMatchIdx + 1) % searchMatches.length;
          setActiveMatchIdx(next);
          jumpToPageNumber(searchMatches[next].pageNumber);
        }}
        onCloseSearch={() => {
          setShowSearch(false);
          setSearchInput("");
        }}
        zoom={zoom}
        onZoomChange={setZoom}
        theme={theme}
        dimmerAlpha={dimmerAlpha}
        showThemeMenu={showThemeMenu}
        onToggleThemeMenu={() => setShowThemeMenu((v) => !v)}
        onThemeChange={(t) => {
          setTheme(t);
          if (typeof window !== "undefined") {
            localStorage.setItem("learnhive_web_pdf_theme", t);
          }
        }}
        onDimmerChange={setDimmerAlpha}
        isDrawingMode={isDrawingMode}
        onToggleDrawingMode={() => setIsDrawingMode((v) => !v)}
        drawTool={drawTool}
        onSelectDrawTool={setDrawTool}
        drawColor={drawColor}
        onSelectDrawColor={(hex) => {
          setDrawColor(hex);
          if (drawTool === "ERASER") setDrawTool("HIGHLIGHTER");
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearCurrentPage}
        onOpenNotesDrawer={() => setShowNoteDrawer(true)}
      />

      <div className="flex-1 flex min-h-0 relative">
        {showOutline && outline.length > 0 && (
          <PdfOutlineSidebar
            outline={outline}
            onClose={() => setShowOutline(false)}
            onSelectPage={(pageNum) => {
              jumpToPageNumber(pageNum);
              if (window.innerWidth < 768) setShowOutline(false);
            }}
          />
        )}

        <div
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 overflow-auto p-2 sm:p-4 flex flex-col gap-4 ${
            theme === "NIGHT" ? "bg-[#050507]" : theme === "SEPIA" ? "bg-[#1E1913]" : "bg-[#0A0A0E]"
          }`}
        >
          {loadingError ? (
            <div className="m-auto max-w-md bg-[#121218] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
              <Sparkles size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-200 mb-4">{loadingError}</p>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                data-card-surface="custom"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          ) : !pdfDoc ? (
            <div className="m-auto flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-300">
                {loadingPct > 0 ? `PDF লোড হচ্ছে... ${loadingPct}%` : "PDF প্রস্তুত হচ্ছে..."}
              </p>
              {loadingPct > 0 && (
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${loadingPct}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            Array.from({ length: numPages }, (_, idx) => {
              const pageNumber = idx + 1;
              const isActiveMatchPage =
                searchMatches.length > 0 &&
                searchMatches[activeMatchIdx]?.pageNumber === pageNumber;
              return (
                <div
                  key={pageNumber}
                  ref={(el) => {
                    pageSlotRefs.current[pageNumber] = el;
                  }}
                >
                  <PdfPageCanvas
                    pdfDoc={pdfDoc}
                    pageNumber={pageNumber}
                    currentVisiblePage={currentPage}
                    containerWidth={containerWidth}
                    zoom={zoom}
                    theme={theme}
                    dimmerAlpha={dimmerAlpha}
                    watermarkText={watermarkText}
                    isDrawingMode={isDrawingMode}
                    drawTool={drawTool}
                    drawColor={drawColor}
                    strokeWidthFraction={strokeWidthFraction}
                    strokes={drawingsByPage[idx] || []}
                    noteCount={noteCountsByPage[idx] || 0}
                    searchQuery={activeSearchQuery}
                    isActiveSearchPage={isActiveMatchPage}
                    onBecomeVisible={handlePageVisible}
                    onOpenNotesForPage={(pIdx) => {
                      jumpToPageNumber(pIdx + 1);
                      setShowNoteDrawer(true);
                    }}
                    onCommitStrokes={handleCommitStrokes}
                  />
                </div>
              );
            })
          )}

          {isPremium && pdfDoc && (
            <p className="text-center text-[10px] text-gray-500 py-2">
              Protected Study Material • {watermarkText}
            </p>
          )}
        </div>
      </div>

      <NoteAnnotationDrawer
        noteId={noteId}
        currentPage={curPageIndex}
        totalPages={numPages}
        isOpen={showNoteDrawer}
        syncVersion={notesSyncTick}
        onClose={() => setShowNoteDrawer(false)}
        onJumpToPage={(pIdx) => jumpToPageNumber(pIdx + 1)}
        onNotesChanged={setNoteCountsByPage}
        onPageNotesEdited={handlePageNotesEdited}
      />
    </div>
  );
};