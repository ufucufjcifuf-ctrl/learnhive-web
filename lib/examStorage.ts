import { Question } from "@/types";

const MISTAKE_BANK_KEY = "mcqhub_mistake_bank";

export function saveWrongMistakesToLocal(wrongQuestions: Question[]): void {
  if (typeof window === "undefined" || wrongQuestions.length === 0) return;
  try {
    const raw = localStorage.getItem(MISTAKE_BANK_KEY);
    const existing: Question[] = raw ? (JSON.parse(raw) as Question[]) : [];
    const map = new Map<string, Question>();
    for (const q of existing) map.set(q.id, q);
    for (const wq of wrongQuestions) map.set(wq.id, wq);
    localStorage.setItem(MISTAKE_BANK_KEY, JSON.stringify(Array.from(map.values()).slice(-300)));
  } catch {
    // Ignore storage quota error
  }
}

export function removeMistakesFromLocal(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const raw = localStorage.getItem(MISTAKE_BANK_KEY);
    if (!raw) return;
    const existing: Question[] = JSON.parse(raw) as Question[];
    const idSet = new Set(ids);
    const updated = existing.filter((q) => !idSet.has(q.id));
    localStorage.setItem(MISTAKE_BANK_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function clearExamSessionStorage(decodedRawId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`mcq_active_start_${decodedRawId}`);
  localStorage.removeItem(`mcq_active_end_${decodedRawId}`);
  localStorage.removeItem(`mcq_active_answers_${decodedRawId}`);
}