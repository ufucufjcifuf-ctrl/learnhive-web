import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchGoogleSheetQuestions } from "./sheetFetcher";
import { Question, DashboardItem } from "@/types";

export interface ExamSeoData {
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  questions: Question[];
  totalQuestions: number;
  durationMinutes: number;
}

// 🔥 Recursive function to find exact SEO data from Global Layout
async function findSeoDataFromLayout(layoutItems: DashboardItem[], command: string): Promise<DashboardItem | null> {
  for (const item of layoutItems) {
    if (item.command === command) return item;
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const found = await findSeoDataFromLayout(item.embeddedItems, command);
      if (found) return found;
    }
  }
  return null;
}

export async function getExamSeoData(id: string): Promise<ExamSeoData> {
  let decodedId = decodeURIComponent(id);
  if (decodedId.includes("|LIMIT|")) decodedId = decodedId.split("|LIMIT|")[0];

  let title = "Online Model Test";
  let questions: Question[] = [];
  let duration = 20;
  
  // 1. Fetch Questions Data
  try {
    if (decodedId.startsWith("exam_")) {
      const snap = await getDoc(doc(db, "exams", decodedId));
      if (snap.exists()) {
        title = snap.data()?.title || title;
        questions = snap.data()?.questions || [];
      }
    } else {
      let sheetId = decodedId;
      let tabName = "Sheet1";
      if (decodedId.includes(":")) {
        const parts = decodedId.split(":");
        sheetId = parts[0];
        tabName = parts[1] || "Sheet1";
      }
      questions = await fetchGoogleSheetQuestions(sheetId, tabName);
    }
  } catch (error) {
    console.error("Failed to fetch questions for SEO", error);
  }

  // 2. Fetch SEO Metadata from Layout Config
  let seoTitle = "";
  let seoDescription = "";
  let slug = decodedId;

  try {
    const layoutSnap = await getDoc(doc(db, "configuration", "layout"));
    if (layoutSnap.exists()) {
      const layoutItems = layoutSnap.data()?.items as DashboardItem[] || [];
      const itemNode = await findSeoDataFromLayout(layoutItems, decodedId);

      if (itemNode) {
        title = itemNode.title;
        seoTitle = itemNode.seoTitle || `${itemNode.title} | MCQ Hub Free Online Exam`;
        seoDescription = itemNode.seoDescription || `Attend the ${itemNode.title} model test. Features include negative marking, instant solution, and a global leaderboard.`;
        slug = itemNode.slug || decodedId;
        duration = itemNode.examConfig?.durationMinutes || 20;
      }
    }
  } catch (error) {
    console.error("Failed to fetch SEO Layout config", error);
  }

  // Fallbacks if not configured in admin
  if (!seoTitle) seoTitle = `${title} | Live Model Test & PDF`;
  if (!seoDescription) seoDescription = `Free online exam for ${title}. Test your preparation with our smart MCQ system. Find the right answers and detailed explanations.`;

  return {
    title,
    seoTitle,
    seoDescription,
    slug,
    questions,
    totalQuestions: questions.length,
    durationMinutes: duration
  };
}