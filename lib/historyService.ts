export interface HistoryRecord {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  timestamp: number;
}

const HISTORY_KEY = "mcqhub_exam_history";

// নতুন হিস্ট্রি সেভ করা
export function saveExamHistory(record: Omit<HistoryRecord, "id">): void {
  if (typeof window === "undefined") return;
  try {
    const list = getExamHistory();
    const newRecord: HistoryRecord = {
      ...record,
      id: `${record.examId}_${Date.now()}`,
    };
    // নতুনটি সবার শুরুতে রাখা
    const updated = [newRecord, ...list.slice(0, 49)]; // সর্বোচ্চ ৫০টি হিস্ট্রি সংরক্ষণ
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

// সব হিস্ট্রি লোড করা
export function getExamHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history:", e);
    return [];
  }
}

// সম্পূর্ণ হিস্ট্রি মুছে ফেলা
export function clearExamHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}