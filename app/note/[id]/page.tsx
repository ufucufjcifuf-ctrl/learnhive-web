"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MathText } from "@/components/MathText";
import { NoteAnnotationDrawer } from "@/components/NoteAnnotationDrawer";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";

export default function NoteViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const title = searchParams.get("title") || "Note Viewer";
  const noteType = searchParams.get("type") || "NOTE_PDF";

  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);

  const getEmbedPdfUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  useEffect(() => {
    async function loadNote() {
      if (!id) return;
      if (noteType === "NOTE_SHEET") {
        try {
          let sheetId = id;
          let tab = "Sheet1";
          if (id.includes(":")) {
            sheetId = id.split(":")[0];
            tab = id.split(":")[1] || "Sheet1";
          }
          const res = await fetch(`/api/sheet?sheetId=${encodeURIComponent(sheetId)}&tab=${encodeURIComponent(tab)}`);
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setPages(json.data.map((q: any) => q.text));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadNote();
  }, [id, noteType]);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      {/* টপ ন্যাভবার */}
      <header className="w-full max-w-4xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
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
            onClick={() => setShowNoteDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs transition"
          >
            <Bookmark size={14} />
            <span>নোট নিন</span>
          </button>
        </div>
      </header>

      {/* কনটেন্ট এরিয়া */}
      <main className="w-full max-w-4xl flex-1 flex flex-col p-4 md:p-6 pb-20">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-gray-400 animate-pulse">নোট প্রস্তুত হচ্ছে...</p>
          </div>
        ) : noteType === "NOTE_PDF" ? (
          <div className="w-full flex-1 min-h-[80vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <iframe
              src={getEmbedPdfUrl(id)}
              className="w-full h-full min-h-[80vh] border-0"
              allow="autoplay"
              title={title}
            ></iframe>
          </div>
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
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> আগের পেজ
                </button>
                <button
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

      {/* পার্সোনাল স্টাডি নোট ড্রয়ার */}
      <NoteAnnotationDrawer
        noteId={id}
        isOpen={showNoteDrawer}
        onClose={() => setShowNoteDrawer(false)}
      />
    </div>
  );
}