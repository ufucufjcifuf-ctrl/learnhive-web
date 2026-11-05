import { MetadataRoute } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DashboardItem } from "@/types";
import { extractAllExamsRecursively } from "@/lib/serverExamService";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://learnhive-web.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/custom-exam`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/mistakes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/bookmarks`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const items = (layoutDoc.data()?.items as DashboardItem[]) || [];
      // 🔥 ফিক্স: সমস্ত লিংকড ফোল্ডার সহ সব এক্সাম নিয়ে আসা হচ্ছে
      const extractedExams = await extractAllExamsRecursively(items);

      const uniqueSlugs = new Set<string>();

      extractedExams.forEach((exam) => {
        if (!uniqueSlugs.has(exam.slug)) {
          uniqueSlugs.add(exam.slug);
          dynamicRoutes.push({
            url: `${baseUrl}/p/${encodeURIComponent(exam.slug)}`,
            lastModified: exam.lastModified,
            changeFrequency: "daily",
            priority: 0.9,
          });
        }
      });
    }
  } catch (err) {
    console.error("Failed to generate dynamic sitemap routes:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}