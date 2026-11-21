"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { NoteAnnotationDrawer } from "@/components/NoteAnnotationDrawer";
import { findItemDeeply } from "@/lib/layoutService";
import { API_BASE_URL, getAuthToken } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Lock,
  ExternalLink,
  Download,
} from "lucide-react";
import Link from "next/link";

export default function NoteViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading: authLoading } = useAuth();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const initialTitle = searchParams.get("title") || "PDF Note Viewer";
  const queryLink = searchParams.get("link") || "";

  const [title, setTitle] = useState(initialTitle);
  const [noteKey, setNoteKey] = useState<string>(queryLink || id);
  const [pdfRenderUrl, setPdfRenderUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(false);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);

  useEffect(() => {
    if (authLoading || (!id && !queryLink)) return;

    let activeBlobUrl: string | null = null;
    let cancelled = false;

    async function loadPdfNote() {
      setLoading(true);
      setErrorMsg(null);
      setIsPremiumBlocked(false);

      try {
        let targetCommand = queryLink.trim() || id;

        if (
          !targetCommand.startsWith("http://") &&
          !targetCommand.startsWith("https://") &&
          !targetCommand.startsWith("/media/") &&
          !targetCommand.startsWith("pdfs/")
        ) {
          const matchedItem = await findItemDeeply(id).catch(() => null);
          if (matchedItem) {
            targetCommand = matchedItem.command || matchedItem.id;
            setTitle(matchedItem.title || initialTitle);
          }
        }

        if (!targetCommand) {
          if (!cancelled) setErrorMsg("PDF নোটের লিংক খুঁজে পাওয়া যায়নি।");
          return;
        }

        setNoteKey(targetCommand);
        const token = await getAuthToken();

        const serverPdfUrl =
          targetCommand.startsWith("http://") || targetCommand.startsWith("https://")
            ? targetCommand
            : targetCommand.startsWith("/media/")
            ? `${API_BASE_URL}${targetCommand}`
            : `${API_BASE_URL}/media/${targetCommand.replace(/^\/+/, "")}`;

        if (serverPdfUrl.startsWith(API_BASE_URL)) {
          const res = await fetch(serverPdfUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (res.status === 401 || res.status === 403) {
            if (!cancelled) {
              setIsPremiumBlocked(true);
              setErrorMsg(
                "👑 এটি একটি প্রিমিয়াম PDF নোট! এটি পড়তে অনুগ্রহ করে লগইন করুন অথবা PRO মেম্বারশিপ নিন।"
              );
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
      } catch (e) {
        console.error("Failed to load PDF note:", e);
        if (!cancelled) {
          setErrorMsg("নোট লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdfNote();

    return () => {
      cancelled = true;
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [id, queryLink, initialTitle, authLoading]);

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
              <BookOpen size={12} /> PDF ডকুমেন্ট
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNoteDrawer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs transition"
        >
          <Bookmark size={14} />
          <span>নোট নিন</span>
        </button>
      </header>

      <main className="w-full max-w-4xl flex-1 flex flex-col p-4 md:p-6 pb-20">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-gray-400 animate-pulse">PDF নোট প্রস্তুত হচ্ছে...</p>
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
                data-card-surface="custom"
                className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3 rounded-2xl text-xs transition"
              >
                PRO মেম্বারশিপ নিন 👑
              </Link>
            )}
          </div>
        ) : pdfRenderUrl ? (
          <div className="w-full flex-1 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121218] border border-white/10 rounded-2xl p-3 text-xs">
              <span className="text-gray-400">
                মোবাইলে PDF দেখতে অসুবিধা হলে নতুন ট্যাবে খুলুন বা ডাউনলোড করুন:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={pdfRenderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <ExternalLink size={13} /> নতুন ট্যাবে খুলুন
                </a>
                <a
                  href={pdfRenderUrl}
                  download={`${title.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, "_")}.pdf`}
                  className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <Download size={13} /> ডাউনলোড
                </a>
              </div>
            </div>

            <div className="w-full flex-1 min-h-[75vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe src={pdfRenderUrl} className="w-full h-full min-h-[75vh] border-0" title={title}></iframe>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">PDF পাওয়া যায়নি।</div>
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