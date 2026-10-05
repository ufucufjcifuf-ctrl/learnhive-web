"use client";

import React, { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { AlertTriangle, X, Send, CheckCircle2 } from "lucide-react";
import { Question } from "@/types";

interface ReportModalProps {
  question: Question | null;
  examId: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ question, examId, onClose }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      // ফায়ারস্টোরের question_reports কালেকশনে সেভ (Admin App Compatible)
      await addDoc(collection(db, "question_reports"), {
        reportType: "QUESTION",
        examId: examId,
        questionId: question.id,
        question: question.text,
        reason: reason.trim(),
        reportedBy: user ? user.displayName || user.email || user.uid : "Web Student",
        status: "PENDING",
        timestamp: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Report submit error:", err);
      alert("রিপোর্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* হেডার */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm">
            <AlertTriangle size={18} />
            <span>প্রশ্নে ভুল রিপোর্ট করুন</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center flex flex-col items-center gap-2">
            <CheckCircle2 size={40} className="text-emerald-400 animate-bounce" />
            <h4 className="font-bold text-white text-base">রিপোর্ট সফলভাবে পাঠানো হয়েছে!</h4>
            <p className="text-xs text-gray-400">অ্যাডমিন এটি যাচাই করে দ্রুত সমাধান করবেন।</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                প্রশ্ন আইডি: {question.id}
              </span>
              <p className="text-xs text-gray-300 font-semibold bg-white/5 p-3 rounded-xl line-clamp-2">
                {question.text}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-bold block mb-1">সমস্যাটি বিস্তারিত লিখুন</label>
              <textarea
                rows={3}
                required
                placeholder="যেমন: সঠিক উত্তর 'খ' হবে কিন্তু দেওয়া আছে 'ক' / বানান ভুল আছে..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white focus:border-red-500 outline-none resize-none transition"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-extrabold text-xs transition shadow-lg shadow-red-500/20"
              >
                <Send size={14} /> {submitting ? "পাঠানো হচ্ছে..." : "রিপোর্ট পাঠান"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};