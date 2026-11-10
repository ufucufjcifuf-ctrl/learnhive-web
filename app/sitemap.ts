import { MetadataRoute } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DashboardItem } from "@/types";
import { extractAllExamsRecursively } from "@/lib/serverExamService";
import { createFolderSlug } from "@/lib/slugUtils";

export const revalidate = 3600;

// সাইটের প্রতিটি ফোল্ডারের জন্য শর্ট স্লাগ তৈরি ও কালেকশন
async function extractAllFoldersRecursively(
  items: DashboardItem[]
): Promise<{ slug: string; lastModified: Date }[]> {
  const folders: { slug: string; lastModified: Date }[] = [];

  for (const item of items) {
    if (item.isHidden) continue;

    const isFolder = item.type === "FOLDER" || item.type.includes("SECTION");
    const rawCmd = (item.command || item.id || "").trim();

    if (isFolder && rawCmd) {
      const cleanSlug = createFolderSlug(item.title, rawCmd, item.slug);
      folders.push({
        slug: cleanSlug,
        lastModified: new Date(item.timestamp || Date.now()),
      });
    }

    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const nestedFolders = await extractAllFoldersRecursively(item.embeddedItems);
      folders.push(...nestedFolders);
    }

    if (item.type === "FOLDER" && item.loadType === "LINKED" && item.command) {
      try {
        const subSnap = await getDoc(doc(db, "configuration", item.command));
        if (subSnap.exists()) {
          const subItems = (subSnap.data()?.items as DashboardItem[]) || [];
          const linkedSubFolders = await extractAllFoldersRecursively(subItems);
          folders.push(...linkedSubFolders);
        }
      } catch (e) {
        console.error("Sitemap folder scan error:", e);
      }
    }
  }

  return folders;
}

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

      // ১. সকল এক্সামের ক্লিন লিংক
      const extractedExams = await extractAllExamsRecursively(items);
      const uniqueExams = new Set<string>();

      extractedExams.forEach((exam) => {
        if (!uniqueExams.has(exam.slug)) {
          uniqueExams.add(exam.slug);
          dynamicRoutes.push({
            url: `${baseUrl}/p/${encodeURIComponent(exam.slug)}`,
            lastModified: exam.lastModified,
            changeFrequency: "daily",
            priority: 0.9,
          });
        }
      });

      // ২. সকল ফোল্ডারের শর্ট ক্লিন লিংক (/f/...)
      const extractedFolders = await extractAllFoldersRecursively(items);
      const uniqueFolders = new Set<string>();

      extractedFolders.forEach((folder) => {
        if (!uniqueFolders.has(folder.slug)) {
          uniqueFolders.add(folder.slug);
          dynamicRoutes.push({
            url: `${baseUrl}/f/${encodeURIComponent(folder.slug)}`,
            lastModified: folder.lastModified,
            changeFrequency: "weekly",
            priority: 0.85,
          });
        }
      });
    }
  } catch (err) {
    console.error("Failed to generate dynamic sitemap routes:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}