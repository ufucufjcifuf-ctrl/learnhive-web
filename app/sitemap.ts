import { MetadataRoute } from "next";
import { getServerSitemapIndex } from "@/lib/serverLayoutService";
import { createExamSlug, createFolderSlug } from "@/lib/slugUtils";

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
    const items = await getServerSitemapIndex();
    const uniqueExams = new Set<string>();
    const uniqueFolders = new Set<string>();

    for (const item of items) {
      const rawCmd = (item.command || item.id || "").trim();
      if (!rawCmd) continue;
      const lastModified = new Date(item.timestamp || Date.now());

      if (item.type === "EXAM_FIREBASE") {
        const slug = createExamSlug(item.title, rawCmd, item.slug);
        if (!uniqueExams.has(slug)) {
          uniqueExams.add(slug);
          dynamicRoutes.push({
            url: `${baseUrl}/p/${encodeURIComponent(slug)}`,
            lastModified,
            changeFrequency: "daily",
            priority: 0.9,
          });
        }
      } else if (item.type === "FOLDER" || item.type.includes("SECTION")) {
        const slug = createFolderSlug(item.title, rawCmd, item.slug);
        if (!uniqueFolders.has(slug)) {
          uniqueFolders.add(slug);
          dynamicRoutes.push({
            url: `${baseUrl}/f/${encodeURIComponent(slug)}`,
            lastModified,
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