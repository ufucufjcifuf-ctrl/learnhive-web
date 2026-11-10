import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";

const CACHE_KEY = "mcqhub_cached_layout";
const VERSION_KEY = "mcqhub_content_version";

// হোম লেআউট ফেচ ও লোকাল সিঙ্ক
export async function getCachedHomeLayout(): Promise<DashboardItem[]> {
  try {
    const syncDoc = await getDoc(doc(db, "configuration", "sync_info"));
    const serverVersion = syncDoc.exists() ? syncDoc.data()?.contentVersion || 1 : 1;
    const localVersion = typeof window !== "undefined" ? localStorage.getItem(VERSION_KEY) : null;
    const cachedData = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;

    if (localVersion === String(serverVersion) && cachedData) {
      return JSON.parse(cachedData);
    }

    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const items: DashboardItem[] = layoutDoc.data()?.items || [];
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
        localStorage.setItem(VERSION_KEY, String(serverVersion));
      }
      return items;
    }
    return [];
  } catch (error) {
    console.error("Error loading layout:", error);
    if (typeof window !== "undefined") {
      const fallback = localStorage.getItem(CACHE_KEY);
      if (fallback) {
        return JSON.parse(fallback);
      }
    }
    return [];
  }
}

// ফোল্ডারের আইটেম খোঁজার রিকার্সিভ হেল্পার (মেইন লেআউট স্ক্যানার)
function findFolderInList(items: DashboardItem[], folderId: string): DashboardItem[] | null {
  for (const item of items) {
    const target = (item.command || item.id || "").trim();
    if (target === folderId || item.id === folderId || item.command === folderId) {
      if (item.embeddedItems && item.embeddedItems.length > 0) {
        return item.embeddedItems.filter((it) => !it.isHidden);
      }
    }
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const found = findFolderInList(item.embeddedItems, folderId);
      if (found) return found;
    }
  }
  return null;
}

// কন্টাক্ট পেজ বা ক্লায়েন্ট ফোল্ডার লোডার (সেশন মেমোরি ছাড়া সরাসরি ফায়ারস্টোর ও ক্যাশ ফলব্যাক)
export async function getFolderItems(folderId: string): Promise<DashboardItem[]> {
  if (!folderId) return [];
  const cleanId = folderId.trim();

  try {
    // ১. প্রথমে সরাসরি লিংকড ফোল্ডার ডকুমেন্ট খোঁজা
    const folderDoc = await getDoc(doc(db, "configuration", cleanId));
    if (folderDoc.exists()) {
      const items: DashboardItem[] = folderDoc.data()?.items || [];
      return items.filter((it) => !it.isHidden);
    }

    // ২. না পাওয়া গেলে লোকাল ক্যাশে থাকা মেইন লেআউট ট্রির ভেতর খোঁজা
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: DashboardItem[] = JSON.parse(cached);
        const match = findFolderInList(parsed, cleanId);
        if (match) return match;
      }
    }

    // ৩. শেষ চেষ্টা: সরাসরি ফায়ারবেস মেইন লেআউট রিড করা
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rootItems: DashboardItem[] = layoutDoc.data()?.items || [];
      const match = findFolderInList(rootItems, cleanId);
      if (match) return match;
    }
  } catch (e) {
    console.error("Failed to load folder items on client:", e);
  }

  return [];
}