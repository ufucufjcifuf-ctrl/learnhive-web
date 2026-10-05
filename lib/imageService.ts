import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const IMAGE_CACHE_KEY = "mcqhub_asset_images_map";

// ফায়ারবেস admin_assets/global_data থেকে সব ছবির লিঙ্ক আনা
export async function syncAssetImages(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};

  try {
    const snap = await getDoc(doc(db, "admin_assets", "global_data"));
    if (snap.exists()) {
      const rawList: any[] = snap.data()?.images || [];
      const map: Record<string, string> = {};

      rawList.forEach((img) => {
        if (img.imageName && img.imageUrl) {
          map[img.imageName.trim().toLowerCase()] = img.imageUrl.trim();
        }
      });

      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(map));
      return map;
    }
  } catch (e) {
    console.error("Failed to sync asset images:", e);
  }

  const fallback = localStorage.getItem(IMAGE_CACHE_KEY);
  return fallback ? JSON.parse(fallback) : {};
}

// ছবির নাম বা লিংক থেকে ১০০% সঠিক ওয়েব লিংক বের করার ফাংশন
export function getSmartImageUrl(imageNameOrUrl?: string | null): string | null {
  if (!imageNameOrUrl) return null;
  const path = imageNameOrUrl.trim();

  // ১. যদি সরাসরি http বা https লিংক হয়
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // ২. যদি শুধু ছবির নাম হয় (যেমন: hsc_science), লোকাল ক্যাশ থেকে গিটহাব লিংক নেওয়া
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(IMAGE_CACHE_KEY);
    if (cached) {
      try {
        const map: Record<string, string> = JSON.parse(cached);
        const resolved = map[path.toLowerCase()];
        if (resolved) return resolved;
      } catch (e) {}
    }
  }

  return null;
}