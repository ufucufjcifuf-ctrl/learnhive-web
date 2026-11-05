"use client";

import React, { memo } from "react";
import { Question } from "@/types";
import { MathText } from "@/components/MathText";
import { Flag, Bookmark, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ExamQuestionCardProps {
  index: number;
  question: Question;
  selectedOption?: number;
  isFlagged: boolean;
  isBookmarked: boolean;
  submitted: boolean;
  onSelect: (index: number, optIdx: number) => void;
  onToggleFlag: (index: number) => void;
  onToggleBookmark: (question: Question) => void;
  onReport: (question: Question) => void;
}

export const ExamQuestionCard = memo(function ExamQuestionCard({
  index,
  question,
  selectedOption,
  isFlagged,
  isBookmarked,
  submitted,
  onSelect,
  onToggleFlag,
  onToggleBookmark,
  onReport,
}: ExamQuestionCardProps) {
  if (!question) return null;

  const correctAnswers =
    question.correctOptionIndices && question.correctOptionIndices.length > 0
      ? question.correctOptionIndices
      : question.correctOptionIndex !== -1
      ? [question.correctOptionIndex]
      : [];

  const isBonus = (question.options || []).length > 0 && correctAnswers.length === 0;

  return (
    <div className="bg-[#121218] border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden transition-colors">
      {/* কার্ড হেডার */}
      <div className="flex justify-between items-center text-xs text-gray-400 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-cyan-400 uppercase tracking-widest text-[11px] md:text-xs">
            প্রশ্ন নম্বর {index + 1}
          </span>
          {isFlagged && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              <Flag size={10} className="fill-amber-400" /> ফ্ল্যাগড
            </span>
          )}
          {isBonus && submitted && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              বোনাস প্রশ্ন
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onReport(question)}
            title="রিপোর্ট করুন"
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition"
          >
            <AlertCircle size={15} />
          </button>
          <button
            type="button"
            onClick={() => onToggleFlag(index)}
            title="ফ্ল্যাগ করুন"
            className={`p-2 rounded-xl transition ${
              isFlagged ? "text-amber-400 bg-amber-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flag size={16} className={isFlagged ? "fill-amber-400" : ""} />
          </button>
          <button
            type="button"
            onClick={() => onToggleBookmark(question)}
            title="বুকমার্ক করুন"
            className={`p-2 rounded-xl transition ${
              isBookmarked ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bookmark size={16} className={isBookmarked ? "fill-cyan-400 text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* প্রশ্নের টেক্সট */}
      <div className="text-base md:text-lg font-bold text-gray-100 leading-relaxed">
        <MathText text={question.text} />
      </div>

      {/* অপশন সমূহ */}
      <div className="flex flex-col gap-2.5 mt-5">
        {(question.options || []).map((opt, optIdx) => {
          const isSelected = selectedOption === optIdx;
          const isActualCorrect = correctAnswers.includes(optIdx) || isBonus;

          let optionStyle = "bg-white/5 border-white/5 hover:border-white/20 text-gray-300";
          let badgeStyle = "bg-white/10 text-gray-300";

          if (!submitted && isSelected) {
            optionStyle = "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-cyan-500/10 shadow-lg";
            badgeStyle = "bg-cyan-500 text-black font-extrabold";
          }

          if (submitted) {
            if (isActualCorrect) {
              optionStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
              badgeStyle = "bg-emerald-500 text-black font-extrabold";
            } else if (isSelected && !isActualCorrect) {
              optionStyle = "bg-red-500/20 border-red-500 text-red-300";
              badgeStyle = "bg-red-500 text-white font-extrabold";
            }
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={submitted}
              onClick={() => onSelect(index, optIdx)}
              className={`flex items-center gap-3.5 w-full p-3.5 md:p-4 rounded-2xl text-left font-semibold text-sm transition border ${optionStyle}`}
            >
              <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${badgeStyle}`}>
                {String.fromCharCode(65 + optIdx)}
              </span>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <MathText text={opt} />
              </div>
              {submitted && isActualCorrect && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
              {submitted && isSelected && !isActualCorrect && <XCircle size={18} className="text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* ব্যাখ্যা */}
      {submitted && question.explanation && (
        <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
          <span className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
            <CheckCircle2 size={14} /> সঠিক উত্তর ও ব্যাখ্যা:
          </span>
          <MathText text={question.explanation} />
        </div>
      )}
    </div>
  );
});