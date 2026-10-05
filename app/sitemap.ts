import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://learnhive.vercel.app";

  // Note: Here you can fetch all exam IDs from your Firestore database 
  // and map them to `/p/[id]` URLs to automatically ping Google.
  // For now, we return the core structures. 

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/custom-exam`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mistakes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    // The dynamic landing pages will look like this:
    // { url: `${baseUrl}/p/exam_12345`, lastModified: new Date(), changeFrequency: "never", priority: 0.9 }
  ];
}