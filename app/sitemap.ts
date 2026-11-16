import { MetadataRoute } from "next";
import { getServerAppBundle } from "@/lib/serverLayoutService";
import { createExamSlug, createFolderSlug } from "@/lib/slugUtils";
import { DashboardItem } from "@/types";

export const revalidate = 3600;

function collectRoutes(items: DashboardItem[]) {
  const examSlugs: { slug: string; lastModified: Date }[] = [];
  const folderSlugs: { slug: string; lastModified: Date }[] = [];

  const walk = (list: DashboardItem[]) => {
    for (const item of list) {
      if (item.isHidden) continue;

      const rawCmd = (item.command || item.id || "").trim();
      const lastModified = new Date(item.timestamp || Date.now());

      if (item.type === "EXAM_FIREBASE" && rawCmd) {
        examSlugs.push({
          slug: createExamSlug(item.title, rawCmd, item.slug),
          lastModified,
        });
      } else if ((item.type === "FOLDER" || item.type.includes("SECTION")) && rawCmd) {
        folderSlugs.push({
          slug: createFolderSlug(item.title, rawCmd, item.slug),
          lastModified,
        });
      }

      if (item.embeddedItems && item.embeddedItems.length > 0) {
        walk(item.embeddedItems);
      }
    }
  };

  walk(items);
  return { examSlugs, folderSlugs };
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
    const bundle = await getServerAppBundle();
    if (bundle) {
      const allTrees: DashboardItem[] = [
        ...(bundle.homeItems || []),
        ...Object.entries(bundle.linkedFolders || {})
          .filter(([scope]) => scope !== "contact")
          .flatMap(([, items]) => items),
      ];

      const { examSlugs, folderSlugs } = collectRoutes(allTrees);
      const uniqueExams = new Set<string>();
      const uniqueFolders = new Set<string>();

      for (const exam of examSlugs) {
        if (!uniqueExams.has(exam.slug)) {
          uniqueExams.add(exam.slug);
          dynamicRoutes.push({
            url: `${baseUrl}/p/${encodeURIComponent(exam.slug)}`,
            lastModified: exam.lastModified,
            changeFrequency: "daily",
            priority: 0.9,
          });
        }
      }

      for (const folder of folderSlugs) {
        if (!uniqueFolders.has(folder.slug)) {
          uniqueFolders.add(folder.slug);
          dynamicRoutes.push({
            url: `${baseUrl}/f/${encodeURIComponent(folder.slug)}`,
            lastModified: folder.lastModified,
            changeFrequency: "weekly",
            priority: 0.85,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to generate dynamic sitemap routes:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}