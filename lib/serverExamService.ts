import { API_BASE_URL } from "@/lib/apiClient";
import { DashboardItem, PublicQuestion, Question } from "@/types";

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

export function extractAllExamsRecursively(
  items: DashboardItem[]
): { slug: string; lastModified: Date }[] {
  const result: { slug: string; lastModified: Date }[] = [];

  for (const item of items) {
    if (item.isHidden) continue;

    if (
      item.type === "EXAM_FIREBASE" ||
      item.command?.startsWith("exam_") ||
      item.command?.includes(":")
    ) {
      const slugOrId = item.slug?.trim() || item.command?.trim() || item.id;
      if (slugOrId) {
        result.push({
          slug: slugOrId,
          lastModified: new Date(item.timestamp || Date.now()),
        });
      }
    }

    if (item.embeddedItems && item.embeddedItems.length > 0) {
      result.push(...extractAllExamsRecursively(item.embeddedItems));
    }
  }

  return result;
}

export async function getExamSeoData(id: string): Promise<ExamSeoData> {
  let decodedId = decodeURIComponent(id).trim();
  if (decodedId.includes("|LIMIT|")) decodedId = decodedId.split("|LIMIT|")[0].trim();

  try {
    const res = await fetch(`${API_BASE_URL}/api/exam/seo/${encodeURIComponent(decodedId)}`, {
      next: { revalidate: 1800, tags: ["layout", "exams"] },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        seoTitle?: string;
        seoDescription?: string;
        slug?: string;
        command?: string;
        totalQuestions?: number;
        durationMinutes?: number;
        positiveMark?: number;
        negativeMark?: number;
        hasNegativeMark?: boolean;
        syllabusNote?: string;
        teaserQuestions?: PublicQuestion[];
      };

      const teaserAsQuestions: Question[] = (data.teaserQuestions || []).map((q) => ({
        ...q,
        correctOptionIndex: -1,
        correctOptionIndices: [],
        explanation: "",
      }));

      return {
        title: data.title || "Online Model Test",
        seoTitle: data.seoTitle || "Learn Hive - Online Model Test",
        seoDescription: data.seoDescription || "Learn Hive অনলাইন মডেল টেস্ট ও প্রশ্ন সমাধান।",
        slug: data.slug || decodedId,
        command: data.command || decodedId,
        questions: teaserAsQuestions,
        totalQuestions: data.totalQuestions || 0,
        durationMinutes: data.durationMinutes || 20,
        positiveMark: data.positiveMark ?? 1.0,
        negativeMark: data.negativeMark ?? 0.25,
        hasNegativeMark: data.hasNegativeMark ?? true,
        syllabusNote: data.syllabusNote || "",
      };
    }
  } catch (error) {
    console.error("Failed to fetch exam SEO data:", error);
  }

  return {
    title: "Online Model Test",
    seoTitle: "Online Model Test | Learn Hive",
    seoDescription: "Learn Hive অনলাইন মডেল টেস্ট ও প্রশ্ন সমাধান।",
    slug: decodedId,
    command: decodedId,
    questions: [],
    totalQuestions: 0,
    durationMinutes: 20,
    positiveMark: 1.0,
    negativeMark: 0.25,
    hasNegativeMark: true,
    syllabusNote: "",
  };
}