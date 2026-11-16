"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MathText } from "@/components/MathText";
import { NoteAnnotationDrawer } from "@/components/NoteAnnotationDrawer";
import { findItemDeeply } from "@/lib/layoutService";
import { API_BASE_URL, getAuthToken } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Bookmark, Lock } from "lucide-react";
import Link from "next/link";

export default function NoteViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading: authLoading } = useAuth();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const initialTitle = searchParams.get("title") || "Note Viewer";
  const initialType = searchParams.get("type") || "NOTE_PDF";

  const [title, setTitle] = useState(initialTitle);
  const [noteType, setNoteType] = useState(initialType);
  const [noteKey, setNoteKey] = useState<string>(id);
  const [pdfRenderUrl, setPdfRenderUrl] = useState<string>("");
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(false);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);

  useEffect(() => {
    if (authLoading || !id) return;

    let activeBlobUrl: string | null = null;
    let cancelled = false;

    async function loadNote() {
      setLoading(true);
      setErrorMsg(null);
      setIsPremiumBlocked(false);

      try {
        let targetCommand = id;
        let resolvedType = initialType;

        if (!id.startsWith("http://") && !id.startsWith("https://") && !id.startsWith("/media/")) {
          const matchedItem = await findItemDeeply(id).catch(() => null);
          if (matchedItem) {
            targetCommand = matchedItem.command || matchedItem.id;
            setTitle(matchedItem.title);
            resolvedType = matchedItem.type || initialType;
            setNoteType(resolvedType);
          }
        }

        setNoteKey(targetCommand);

        if (resolvedType === "NOTE_SHEET") {
          let sheetId = targetCommand;
          let tab = "Sheet1";
          if (targetCommand.includes(":")) {
            sheetId = targetCommand.split(":")[0];
            tab = targetCommand.split(":")[1] || "Sheet1";
          }
          const res = await fetch(
            `/api/sheet?sheetId=${encodeURIComponent(sheetId)}&tab=${encodeURIComponent(tab)}`
          );
          const json = (await res.json()) as { data?: { text: string }[] };
          if (!cancelled && json.data && json.data.length > 0) {
            setPages(json.data.map((q) => q.text));
          }
        } else {
          // Load PDF directly from Cloudflare Worker / Backblaze B2 (/media/...)
          const serverPdfUrl =
            targetCommand.startsWith("http://") || targetCommand.startsWith("https://")
              ? targetCommand
              : targetCommand.startsWith("/media/")
              ? `${API_BASE_URL}${targetCommand}`
              : `${API_BASE_URL}/media/${targetCommand.replace(/^\/+/, "")}`;

          if (serverPdfUrl.startsWith(API_BASE_URL)) {
            const token = await getAuthToken();
            const res = await fetch(serverPdfUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (res.status === 401 || res.status === 403) {
              if (!cancelled) {
                setIsPremiumBlocked(true);
                setErrorMsg("👑 এটি একটি প্রিমিয়াম PDF নোট! এটি পড়তে অনুগ্রহ করে লগইন করুন অথবা PRO মেম্বারশিপ নিন।");
              }
              return;
            }

            if (!res.ok) {
              if (!cancelled) {
                setErrorMsg("সার্ভার থেকে PDF নোটটি লোড করা যায়নি।");
              }
              return;
            }

            const rawBlob = await res.blob();
            const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
            activeBlobUrl = URL.createObjectURL(pdfBlob);
            if (!cancelled) {
              setPdfRenderUrl(activeBlobUrl);
            }
          } else {
            if (!cancelled) {
              setPdfRenderUrl(serverPdfUrl);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load note content:", e);
        if (!cancelled) {
          setErrorMsg("নোট লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNote();

    return () => {
      cancelled = true;
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [id, initialType, authLoading]);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      <header className="w-full max-w-4xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base text-white line-clamp-1">{title}</h1>
            <p className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
              <BookOpen size={12} /> {noteType === "NOTE_PDF" ? "PDF ডকুমেন্ট" : "শিট নোটবুক"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {noteType === "NOTE_SHEET" && pages.length > 0 && (
            <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 mr-2">
              পেজ {currentPage + 1} / {pages.length}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowNoteDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs transition"
          >
            <Bookmark size={14} />
            <span>নোট নিন</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-4xl flex-1 flex flex-col p-4 md:p-6 pb-20">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-gray-400 animate-pulse">নোট প্রস্তুত হচ্ছে...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-10 text-center my-10 shadow-xl">
            {isPremiumBlocked && (
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 mb-4">
                <Lock size={28} />
              </div>
            )}
            <p className="text-sm font-bold text-gray-200 mb-4">{errorMsg}</p>
            {isPremiumBlocked && (
              <Link
                href="/premium"
                className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3 rounded-2xl text-xs transition"
              >
                PRO মেম্বারশিপ নিন 👑
              </Link>
            )}
          </div>
        ) : noteType === "NOTE_PDF" ? (
          pdfRenderUrl ? (
            <div className="w-full flex-1 min-h-[80vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={pdfRenderUrl}
                className="w-full h-full min-h-[80vh] border-0"
                title={title}
              ></iframe>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">PDF পাওয়া যায়নি।</div>
          )
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {pages.length > 0 ? (
              <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl leading-relaxed text-sm md:text-base text-gray-200 min-h-[50vh]">
                <MathText text={pages[currentPage]} />
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">কোনো নোট পাওয়া যায়নি।</div>
            )}

            {pages.length > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> আগের পেজ
                </button>
                <button
                  type="button"
                  disabled={currentPage === pages.length - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-xs font-black hover:bg-cyan-400 disabled:opacity-30"
                >
                  পরের পেজ <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <NoteAnnotationDrawer
        noteId={noteKey || id}
        isOpen={showNoteDrawer}
        onClose={() => setShowNoteDrawer(false)}
      />
    </div>
  );
}