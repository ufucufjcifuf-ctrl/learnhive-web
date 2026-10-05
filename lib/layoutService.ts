import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";

const CACHE_KEY = "mcqhub_cached_layout";
const VERSION_KEY = "mcqhub_content_version";

// 🔥 রিকার্সিভ ফাংশন: যত গভীরেই Embedded ফোল্ডার থাকুক, সব ব্রাউজারে ক্যাশ করবে
export function cacheEmbeddedTree(items: DashboardItem[]) {
  if (typeof window === "undefined" || !items) return;
  items.forEach((item) => {
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      sessionStorage.setItem(`mcqhub_embed_${item.id}`, JSON.stringify(item.embeddedItems));
      if (item.command) {
        sessionStorage.setItem(`mcqhub_embed_${item.command}`, JSON.stringify(item.embeddedItems));
      }
      cacheEmbeddedTree(item.embeddedItems); // নেস্টেড ফোল্ডারের ভেতরে আবার সার্চ
    }
  });
}

// হোম লেআউট ফেচ করা
export async function getCachedHomeLayout(): Promise<DashboardItem[]> {
  try {
    const syncDoc = await getDoc(doc(db, "configuration", "sync_info"));
    const serverVersion = syncDoc.exists() ? syncDoc.data()?.contentVersion || 1 : 1;
    const localVersion = typeof window !== "undefined" ? localStorage.getItem(VERSION_KEY) : null;
    const cachedData = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;

    if (localVersion === String(serverVersion) && cachedData) {
      const parsed = JSON.parse(cachedData);
      cacheEmbeddedTree(parsed);
      return parsed;
    }

    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const items: DashboardItem[] = layoutDoc.data()?.items || [];
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
        localStorage.setItem(VERSION_KEY, String(serverVersion));
      }
      cacheEmbeddedTree(items);
      return items;
    }
    return [];
  } catch (error) {
    console.error("Error loading layout:", error);
    if (typeof window !== "undefined") {
      const fallback = localStorage.getItem(CACHE_KEY);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        cacheEmbeddedTree(parsed);
        return parsed;
      }
    }
    return [];
  }
}

// ফোল্ডার লোডার (Linked ও Embedded উভয়ের জন্য সাপোর্ট)
export async function getFolderItems(folderId: string): Promise<DashboardItem[]> {
  if (typeof window === "undefined") return [];

  // ১. প্রথমে চেক করো এটি কোনো Embedded ফোল্ডার কি না (0 Firestore Read)
  const sessionCached = sessionStorage.getItem(`mcqhub_embed_${folderId}`);
  if (sessionCached) {
    const parsed: DashboardItem[] = JSON.parse(sessionCached);
    cacheEmbeddedTree(parsed);
    return parsed;
  }

  // ২. যদি সেশনে না থাকে, তাহলে এটি Linked Folder, ফায়ারস্টোর থেকে লোড করো
  try {
    const folderDoc = await getDoc(doc(db, "configuration", folderId));
    if (folderDoc.exists()) {
      const items: DashboardItem[] = folderDoc.data()?.items || [];
      cacheEmbeddedTree(items);
      return items;
    }
  } catch (e) {
    console.error("Failed to load linked folder from Firestore:", e);
  }

  return [];
}