"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Bookmark, Check } from "lucide-react";

export interface PersonalNote {
  id: string;
  noteId: string;
  content: string;
  colorHex: string;
  timestamp: number;
}

interface NoteAnnotationDrawerProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NoteAnnotationDrawer: React.FC<NoteAnnotationDrawerProps> = ({
  noteId,
  isOpen,
  onClose,
}) => {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [content, setContent] = useState("");
  const colors = ["#FFD700", "#00F0FF", "#00E676", "#FF2E2E"];
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`mcq_notes_${noteId}`);
      if (stored) setNotes(JSON.parse(stored));
    }
  }, [noteId]);

  const saveNotesToLocal = (updated: PersonalNote[]) => {
    setNotes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`mcq_notes_${noteId}`, JSON.stringify(updated));
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (editingId) {
      const updated = notes.map((n) =>
        n.id === editingId ? { ...n, content: content.trim(), colorHex: selectedColor } : n
      );
      saveNotesToLocal(updated);
      setEditingId(null);
    } else {
      const newNote: PersonalNote = {
        id: Date.now().toString(),
        noteId,
        content: content.trim(),
        colorHex: selectedColor,
        timestamp: Date.now(),
      };
      saveNotesToLocal([newNote, ...notes]);
    }
    setContent("");
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotesToLocal(updated);
  };

  const handleStartEdit = (note: PersonalNote) => {
    setContent(note.content);
    setSelectedColor(note.colorHex);
    setEditingId(note.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end selection:bg-cyan-500 selection:text-black animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#121218] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        
        <div>
          {/* হেডার */}
          <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-6">
            <h3 className="font-extrabold text-base text-cyan-400 flex items-center gap-2">
              <Bookmark size={18} /> পার্সোনাল স্টাডি নোট ({notes.length})
            </h3>
            <button onClick={onClose} className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* নতুন নোট লেখার ফর্ম */}
          <form onSubmit={handleSaveNote} className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 flex flex-col gap-3">
            <textarea
              rows={3}
              placeholder="পড়ার সময় গুরুত্বপূর্ণ লাইন বা পয়েন্ট লিখে রাখুন..."
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
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-extrabold px-4 py-1.5 rounded-xl text-xs transition"
                >
                  {editingId ? "আপডেট" : "সেভ করুন"}
                </button>
              </div>
            </div>
          </form>

          {/* জমানো নোটের তালিকা */}
          <div className="flex flex-col gap-3">
            {notes.length === 0 ? (
              <p className="text-center py-10 text-xs text-gray-500">এখনো কোনো স্টাডি নোট যোগ করা হয়নি।</p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  style={{ borderLeftColor: n.colorHex }}
                  className="bg-black/40 border border-white/5 border-l-4 rounded-2xl p-4 flex justify-between items-start gap-3 shadow-md"
                >
                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap flex-1">
                    {n.content}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleStartEdit(n)} className="text-gray-400 hover:text-cyan-400 p-1">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(n.id)} className="text-gray-400 hover:text-red-400 p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};