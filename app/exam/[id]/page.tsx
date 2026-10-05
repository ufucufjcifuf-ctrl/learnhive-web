"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExamQuestionCard } from "@/components/exam/ExamQuestionCard";
import { ExamOverviewModal, ExamConfirmSubmitModal, ExamExitModal } from "@/components/exam/ExamModals";
import { ReportModal } from "@/components/ReportModal";
import { AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { sounds } from "@/lib/soundEffects";
import { useExamLogic } from "@/hooks/useExamLogic";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { ExamResultCard } from "@/components/exam/ExamResultCard";

export default function ExamScreen() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const {
    questions, loading, fetchError, answers, flagged, bookmarks, timeLeft, submitted,
    examTitle, liveEndTime, hideSolutionUntilLiveEnds, handleSelectOption, toggleFlag, 
    setBookmarks, handleSubmitExam, calculateFinalScore
  } = useExamLogic(id);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isListView, setIsListView] = useState(true);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<any | null>(null);

  const isSolutionLocked = Boolean(hideSolutionUntilLiveEnds && liveEndTime && Date.now() < liveEndTime + 300_000);

  // 🔥 খাতা জমা দেওয়ার কনফার্মেশন হ্যান্ডলার (পপ-আপ বন্ধ করে রেজাল্ট শো করাবে)
  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    handleSubmitExam();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-400 animate-pulse">প্রশ্নপত্র প্রস্তুত হচ্ছে...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-400 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">পরীক্ষা লোড করা যায়নি</h2>
        <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">{fetchError}</p>
        <button onClick={() => router.push("/")} className="bg-cyan-500 text-black font-extrabold px-6 py-2.5 rounded-xl text-xs">
          হোমে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      
      <ExamHeader 
        examTitle={examTitle} 
        questionsCount={questions.length} 
        timeLeft={timeLeft} 
        submitted={submitted}
        isListView={isListView} 
        setIsListView={setIsListView} 
        onExitClick={() => submitted ? router.push("/") : setShowExitModal(true)}
        onOverviewClick={() => setShowOverviewModal(true)} 
        onSubmitClick={() => setShowSubmitModal(true)}
      />

      {/* রেজাল্ট কার্ড (সাবমিট হলে স্ক্রিনের ওপরে ভেসে উঠবে) */}
      {submitted && (
        <ExamResultCard 
          result={calculateFinalScore()} 
          isSolutionLocked={isSolutionLocked} 
          examId={id} 
        />
      )}

      <main className="w-full max-w-4xl px-4 py-6">
        {isListView || (submitted && !isSolutionLocked) ? (
          <div className="flex flex-col gap-6">
            {questions.map((q, idx) => (
              <ExamQuestionCard 
                key={q.id || idx} 
                index={idx} 
                question={q} 
                selectedOption={answers[idx]} 
                isFlagged={Boolean(flagged[idx])} 
                isBookmarked={Boolean(bookmarks[q.id])} 
                submitted={submitted && !isSolutionLocked} 
                onSelect={(o) => handleSelectOption(idx, o)} 
                onToggleFlag={() => toggleFlag(idx)} 
                onToggleBookmark={() => {}} 
                onReport={() => setReportingQuestion(q)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <ExamQuestionCard 
              index={currentIdx} 
              question={questions[currentIdx]} 
              selectedOption={answers[currentIdx]} 
              isFlagged={Boolean(flagged[currentIdx])} 
              isBookmarked={Boolean(bookmarks[questions[currentIdx]?.id])} 
              submitted={false} 
              onSelect={(o) => handleSelectOption(currentIdx, o)} 
              onToggleFlag={() => toggleFlag(currentIdx)} 
              onToggleBookmark={() => {}} 
              onReport={() => setReportingQuestion(questions[currentIdx])} 
            />

            <div className="flex justify-between items-center bg-[#121218] border border-white/5 rounded-2xl p-4 shadow-xl">
              <button 
                disabled={currentIdx === 0} 
                onClick={() => { sounds.playClick(); setCurrentIdx((p) => p - 1); }} 
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 px-3 py-2 rounded-xl hover:bg-white/5"
              >
                <ArrowLeft size={16} /> আগের প্রশ্ন
              </button>
              {currentIdx === questions.length - 1 ? (
                <button 
                  onClick={() => { sounds.playClick(); setShowSubmitModal(true); }} 
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2 rounded-xl text-xs"
                >
                  খাতা জমা
                </button>
              ) : (
                <button 
                  onClick={() => { sounds.playClick(); setCurrentIdx((p) => p + 1); }} 
                  className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-xl hover:bg-white/5"
                >
                  পরের প্রশ্ন <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <ExamOverviewModal 
        isOpen={showOverviewModal} 
        questions={questions} 
        answers={answers} 
        flagged={flagged} 
        currentIdx={currentIdx} 
        isListView={isListView} 
        onSelectQuestion={setCurrentIdx} 
        onClose={() => setShowOverviewModal(false)} 
      />

      {/* 🔥 ফিক্সড সাবমিট মডাল */}
      <ExamConfirmSubmitModal 
        isOpen={showSubmitModal} 
        answeredCount={Object.keys(answers).length} 
        totalCount={questions.length} 
        onConfirm={handleConfirmSubmit} 
        onCancel={() => setShowSubmitModal(false)} 
      />

      <ExamExitModal 
        isOpen={showExitModal} 
        onConfirm={() => { 
          localStorage.removeItem(`mcq_active_end_${decodeURIComponent(id)}`); 
          localStorage.removeItem(`mcq_active_answers_${decodeURIComponent(id)}`); 
          router.push("/"); 
        }} 
        onCancel={() => setShowExitModal(false)} 
      />

      {reportingQuestion && (
        <ReportModal 
          question={reportingQuestion} 
          examId={id} 
          onClose={() => setReportingQuestion(null)} 
        />
      )}
    </div>
  );
}