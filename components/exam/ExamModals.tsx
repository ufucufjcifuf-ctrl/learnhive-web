"use client";

import React from "react";
import { Question } from "@/types";

interface OverviewModalProps {
  isOpen: boolean;
  questions: Question[];
  answers: Record<number, number>;
  flagged: Record<number, boolean>;
  currentIdx: number;
  isListView: boolean;
  onSelectQuestion: (index: number) => void;
  onClose: () => void;
}

export const ExamOverviewModal: React.FC<OverviewModalProps> = ({
  isOpen,
  questions,
  answers,
  flagged,
  currentIdx,
  isListView,
  onSelectQuestion,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <h3 className="font-extrabold text-sm text-white">প্রশ্নের ওভারভিউ প্যালেট (OMR)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs font-bold">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {questions.map((_, idx) => {
            const isAnswered = answers[idx] !== undefined;
            const isFlg = flagged[idx];
            const isCur = currentIdx === idx && !isListView;

            let btnBg = "bg-white/5 text-gray-400 hover:bg-white/10";
            if (isFlg) btnBg = "bg-amber-500/20 text-amber-300 border border-amber-500/50";
            else if (isAnswered) btnBg = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50";

            return (
              <button
                key={idx}
                onClick={() => {
                  onSelectQuestion(idx);
                  onClose();
                }}
                className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition ${btnBg} ${
                  isCur ? "ring-2 ring-cyan-400" : ""
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ExamConfirmSubmitModal: React.FC<{
  isOpen: boolean;
  answeredCount: number;
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, answeredCount, totalCount, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
        <h3 className="text-lg font-black text-white">খাতা জমা দিতে চান?</h3>
        <p className="text-xs text-gray-400 mt-1 mb-6">
          মোট উত্তর দিয়েছেন: <span className="text-cyan-400 font-bold">{answeredCount}</span> / {totalCount} টি
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-bold text-xs">
            বাতিল
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs">
            হ্যাঁ, জমা দিন
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExamExitModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
        <h3 className="text-lg font-black text-white">পরীক্ষা ছেড়ে যাবেন?</h3>
        <p className="text-xs text-gray-400 mt-1 mb-6">এখন বের হয়ে গেলে পরীক্ষার বর্তমান প্রোগ্রেস মুছে যাবে।</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-bold text-xs">
            না
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs">
            বের হন
          </button>
        </div>
      </div>
    </div>
  );
};