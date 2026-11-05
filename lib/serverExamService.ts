import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchGoogleSheetQuestions } from "./sheetFetcher";
import { Question, DashboardItem } from "@/types";

export interface ExamSeoData {
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  command: string;
  questions: Question[];
  totalQuestions: number;
  durationMinutes: number;
  positiveMark: number;
  negativeMark: number;
  hasNegativeMark: boolean;
  syllabusNote: string;
}

// ফোল্ডার ট্রি রিকার্সিভলি স্ক্যান করে এক্সাম খুঁজে বের করার ফাংশন
async function findSeoDataDeeply(items: DashboardItem[], identifier: string): Promise<DashboardItem | null> {
  for (const item of items) {
    if (item.command === identifier || item.id === identifier || item.slug === identifier) {
      return item;
    }
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const found = await findSeoDataDeeply(item.embeddedItems, identifier);
      if (found) return found;
    }
    if (item.type === "FOLDER" && item.loadType === "LINKED" && item.command) {
      try {
        const subSnap = await getDoc(doc(db, "configuration", item.command));
        if (subSnap.exists()) {
          const subItems = (subSnap.data()?.items as DashboardItem[]) || [];
          const found = await findSeoDataDeeply(subItems, identifier);
          if (found) return found;
        }
      } catch (e) {}
    }
  }
  return null;
}

// সাইটম্যাপের জন্য সমস্ত এক্সাম বের করার রিকার্সিভ ফাংশন
export async function extractAllExamsRecursively(items: DashboardItem[]): Promise<{ slug: string; lastModified: Date }[]> {
  const result: { slug: string; lastModified: Date }[] = [];

  for (const item of items) {
    if (item.isHidden) continue;

    if (item.type === "EXAM_FIREBASE" || item.command?.startsWith("exam_") || item.command?.includes(":")) {
      const slugOrId = item.slug?.trim() || item.command?.trim() || item.id;
      if (slugOrId) {
        result.push({
          slug: slugOrId,
          lastModified: new Date(item.timestamp || Date.now()),
        });
      }
    }

    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const childExams = await extractAllExamsRecursively(item.embeddedItems);
      result.push(...childExams);
    }

    if (item.type === "FOLDER" && item.loadType === "LINKED" && item.command) {
      try {
        const subSnap = await getDoc(doc(db, "configuration", item.command));
        if (subSnap.exists()) {
          const subItems = (subSnap.data()?.items as DashboardItem[]) || [];
          const subExams = await extractAllExamsRecursively(subItems);
          result.push(...subExams);
        }
      } catch (e) {}
    }
  }

  return result;
}

export async function getExamSeoData(id: string): Promise<ExamSeoData> {
  let decodedId = decodeURIComponent(id).trim();
  if (decodedId.includes("|LIMIT|")) decodedId = decodedId.split("|LIMIT|")[0];

  let title = "Online Model Test";
  let questions: Question[] = [];
  let duration = 20;
  let posMark = 1.0;
  let negMark = 0.25;
  let customSyllabus = "";
  let itemNode: DashboardItem | null = null;

  try {
    const layoutSnap = await getDoc(doc(db, "configuration", "layout"));
    if (layoutSnap.exists()) {
      const layoutItems = (layoutSnap.data()?.items as DashboardItem[]) || [];
      itemNode = await findSeoDataDeeply(layoutItems, decodedId);

      if (itemNode) {
        title = itemNode.title;
        duration = itemNode.examConfig?.durationMinutes || 20;
        posMark = itemNode.examConfig?.positiveMark ?? 1.0;
        negMark = itemNode.examConfig?.negativeMark ?? 0.25;
        customSyllabus = itemNode.routineHtml || itemNode.subtitle || "";
      }
    }
  } catch (error) {
    console.error("Failed to fetch layout config for SEO", error);
  }

  const actualCommand = itemNode?.command || decodedId;

  try {
    if (actualCommand.startsWith("exam_")) {
      const snap = await getDoc(doc(db, "exams", actualCommand));
      if (snap.exists()) {
        title = snap.data()?.title || title;
        questions = snap.data()?.questions || [];
      }
    } else {
      let sheetId = actualCommand;
      let tabName = "Sheet1";
      if (actualCommand.includes(":")) {
        const parts = actualCommand.split(":");
        sheetId = parts[0];
        tabName = parts[1] || "Sheet1";
      }
      questions = await fetchGoogleSheetQuestions(sheetId, tabName);
    }
  } catch (error) {
    console.error("Failed to fetch questions for SEO", error);
  }

  const totalQuestions = questions.length;

  const seoTitle = itemNode?.seoTitle?.trim() || `${title} - প্রশ্ন সমাধান ও ফ্রি মডেল টেস্ট | Learn Hive`;
  const seoDescription =
    itemNode?.seoDescription?.trim() ||
    `${title}-এর পূর্ণাঙ্গ প্রশ্ন সমাধান ও ফ্রি অনলাইন মডেল টেস্ট। মোট ${totalQuestions > 0 ? totalQuestions : 25}টি প্রশ্ন, সময় ${duration} মিনিট। নেগেটিভ মার্কিং সহ অনলাইনে পরীক্ষা দিন এবং তাৎক্ষণিক ব্যাখ্যা ও মেধা তালিকা দেখুন।`;
  const slug = itemNode?.slug?.trim() || decodedId;

  return {
    title,
    seoTitle,
    seoDescription,
    slug,
    command: actualCommand,
    questions,
    totalQuestions,
    durationMinutes: duration,
    positiveMark: posMark,
    negativeMark: negMark,
    hasNegativeMark: negMark > 0,
    syllabusNote: customSyllabus,
  };
}