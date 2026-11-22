"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Trash2, Edit2, Bookmark } from "lucide-react";

export interface PersonalNote {
  id: string;
  noteId: string;
  pageIndex: number; // 0-based
  content: string;
  colorHex: string;
  timestamp: number;
}

interface NoteAnnotationDrawerProps {
  noteId: string;
  currentPage: number; // 0-based
  totalPages: number;
  isOpen: boolean;
  syncVersion?: number;
  onClose: () => void;
  onJumpToPage?: (pageIndex: number) => void;
  onNotesChanged?: (countsByPage: Record<number, number>) => void;
  onPageNotesEdited?: (pageIndex: number, pageNotes: PersonalNote[]) => void;
}

function buildCountsByPage(list: PersonalNote[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const n of list) {
    const p = typeof n.pageIndex === "number" ? n.pageIndex : 0;
    counts[p] = (counts[p] || 0) + 1;
  }
  return counts;
}

export const NoteAnnotationDrawer: React.FC<NoteAnnotationDrawerProps> = ({
  noteId,
  currentPage,
  totalPages,
  isOpen,
  syncVersion = 0,
  onClose,
  onJumpToPage,
  onNotesChanged,
  onPageNotesEdited,
}) => {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [content, setContent] = useState("");
  const colors = ["#FFD700", "#00F0FF", "#00E676", "#FF2E2E"];
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"PAGE" | "ALL">("PAGE");

  useEffect(() => {
    if (typeof window === "undefined" || !noteId) return;
    try {
      const stored = localStorage.getItem(`mcq_notes_${noteId}`);
      if (stored) {
        const parsed = (JSON.parse(stored) as Partial<PersonalNote>[]).map((n) => ({
          id: n.id || String(Date.now()),
          noteId: n.noteId || noteId,
          pageIndex: typeof n.pageIndex === "number" ? n.pageIndex : 0,
          content: n.content || "",
          colorHex: n.colorHex || "#FFD700",
          timestamp: n.timestamp || Date.now(),
        }));
        setNotes(parsed);
        onNotesChanged?.(buildCountsByPage(parsed));
      } else {
        setNotes([]);
        onNotesChanged?.({});
      }
    } catch {
      setNotes([]);
    }
  }, [noteId, syncVersion, onNotesChanged]);

  const saveNotesToLocal = useCallback(
    (updated: PersonalNote[], editedPageIndex: number) => {
      setNotes(updated);
      onNotesChanged?.(buildCountsByPage(updated));
      if (typeof window !== "undefined" && noteId) {
        localStorage.setItem(`mcq_notes_${noteId}`, JSON.stringify(updated));
      }
      onPageNotesEdited?.(
        editedPageIndex,
        updated.filter((n) => n.pageIndex === editedPageIndex)
      );
    },
    [noteId, onNotesChanged, onPageNotesEdited]
  );

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (editingId) {
      let editedPage = currentPage;
      const updated = notes.map((n) => {
        if (n.id === editingId) {
          editedPage = n.pageIndex;
          return { ...n, content: content.trim(), colorHex: selectedColor, timestamp: Date.now() };
        }
        return n;
      });
      saveNotesToLocal(updated, editedPage);
      setEditingId(null);
    } else {
      const newNote: PersonalNote = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        noteId,
        pageIndex: currentPage,
        content: content.trim(),
        colorHex: selectedColor,
        timestamp: Date.now(),
      };
      saveNotesToLocal([newNote, ...notes], currentPage);
    }
    setContent("");
  };

  const handleDelete = (note: PersonalNote) => {
    if (editingId === note.id) {
      setEditingId(null);
      setContent("");
    }
    saveNotesToLocal(
      notes.filter((n) => n.id !== note.id),
      note.pageIndex
    );
  };

  const handleStartEdit = (note: PersonalNote) => {
    setContent(note.content);
    setSelectedColor(note.colorHex);
    setEditingId(note.id);
  };

  if (!isOpen) return null;

  const currentPageNotes = notes.filter((n) => n.pageIndex === currentPage);
  const displayedNotes = filterMode === "PAGE" ? currentPageNotes : notes;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end selection:bg-cyan-500 selection:text-black animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#121218] border-l border-white/10 h-full p-6 flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-5">
          <div>
            <h3 className="font-extrabold text-base text-cyan-400 flex items-center gap-2">
              <Bookmark size={18} /> পার্সোনাল স্টাডি নোট ({notes.length})
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              বর্তমান পেজ: {currentPage + 1} / {totalPages || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSaveNote}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 flex flex-col gap-3"
        >
          <textarea
            rows={3}
            placeholder={`পেজ ${currentPage + 1}-এর গুরুত্বপূর্ণ পয়েন্ট লিখে রাখুন...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-cyan-500 outline-none resize-none"
          />

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition ${
                    selectedColor === c ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setContent("");
                  }}
                  className="text-xs text-gray-400 px-3 py-1.5 rounded-xl bg-white/5"
                >
                  বাতিল
                </button>
              )}
              <button
                type="submit"
                disabled={!content.trim()}
                data-card-surface="custom"
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold px-4 py-1.5 rounded-xl text-xs transition"
              >
                {editingId ? "আপডেট" : `পেজ ${currentPage + 1}-এ সেভ`}
              </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterMode("PAGE")}
            className={`py-2 rounded-xl text-xs font-bold border transition ${
              filterMode === "PAGE"
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            এই পেজ ({currentPageNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("ALL")}
            className={`py-2 rounded-xl text-xs font-bold border transition ${
              filterMode === "ALL"
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            সব পেজ ({notes.length})
          </button>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {displayedNotes.length === 0 ? (
            <p className="text-center py-10 text-xs text-gray-500">
              {filterMode === "PAGE"
                ? `পেজ ${currentPage + 1}-এ কোনো নোট নেই।`
                : "এখনো কোনো স্টাডি নোট যোগ করা হয়নি।"}
            </p>
          ) : (
            displayedNotes.map((n) => (
              <div
                key={n.id}
                style={{ borderLeftColor: n.colorHex }}
                className="bg-black/40 border border-white/5 border-l-4 rounded-2xl p-4 flex flex-col gap-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToPage?.(n.pageIndex);
                      onClose();
                    }}
                    className="text-[10px] font-black bg-white/10 hover:bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full transition"
                  >
                    পেজ {n.pageIndex + 1} →
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(n)}
                      className="text-gray-400 hover:text-cyan-400 p-1"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};