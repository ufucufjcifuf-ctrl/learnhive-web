import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    // 🔥 সঠিক Vercel ডোমেইন ফিক্স করা হলো
    sitemap: "https://learnhive-web.vercel.app/sitemap.xml",
  };
}