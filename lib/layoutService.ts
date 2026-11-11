import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";
import { createFolderSlug, createExamSlug, createNoteSlug, extractShortHash } from "@/lib/slugUtils";

const CACHE_KEY = "mcqhub_cached_layout";
const VERSION_KEY = "mcqhub_content_version";

export function cacheEmbeddedTree(items?: DashboardItem[]): void {
  // নো-অপ ফাংশন (ব্যাকওয়ার্ড কম্প্যাটিবিলিটির জন্য)
}

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

// ফোল্ডারের আইটেম খোঁজার রিকার্সিভ হেল্পার
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

// কন্টাক্ট পেজ বা ক্লায়েন্ট ফোল্ডার লোডার
export async function getFolderItems(folderId: string): Promise<DashboardItem[]> {
  if (!folderId) return [];
  const cleanId = folderId.trim();

  try {
    const folderDoc = await getDoc(doc(db, "configuration", cleanId));
    if (folderDoc.exists()) {
      const items: DashboardItem[] = folderDoc.data()?.items || [];
      return items.filter((it) => !it.isHidden);
    }

    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: DashboardItem[] = JSON.parse(cached);
        const match = findFolderInList(parsed, cleanId);
        if (match) return match;
      }
    }

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

// 🔥 যেকোনো স্লাগ বা আইডি দিয়ে লিংকড ফোল্ডারের গভীরেও আসল আইটেম খুঁজে বের করার ইউনিভার্সাল হেল্পার
export async function findItemDeeply(identifier: string): Promise<DashboardItem | null> {
  const target = decodeURIComponent(identifier).trim().toLowerCase();

  const scanItemsAsync = async (list: DashboardItem[]): Promise<DashboardItem | null> => {
    for (const it of list) {
      const rawId = (it.command || it.id || "").trim().toLowerCase();
      const customSlug = (it.slug || "").trim().toLowerCase();
      const folderSlug = createFolderSlug(it.title, it.command || it.id, it.slug).toLowerCase();
      const examSlug = createExamSlug(it.title, it.command || it.id, it.slug).toLowerCase();
      const noteSlug = createNoteSlug(it.title, it.command || it.id, it.slug).toLowerCase();
      const hash = extractShortHash(it.command || it.id);

      if (
        rawId === target ||
        it.id.toLowerCase() === target ||
        it.command?.toLowerCase() === target ||
        customSlug === target ||
        folderSlug === target ||
        examSlug === target ||
        noteSlug === target ||
        (target.includes("-") && target.endsWith(`-${hash}`))
      ) {
        return it;
      }

      // ১. এমবেডেড সাব-আইটেম স্ক্যান
      if (it.embeddedItems && it.embeddedItems.length > 0) {
        const found = await scanItemsAsync(it.embeddedItems);
        if (found) return found;
      }

      // ২. লিংকড ফোল্ডারের ভেতরের ফায়ারস্টোর সাব-ডকুমেন্ট স্ক্যান (যাতে সরাসরি শেয়ার করা লিঙ্ক মিস না হয়)
      if (it.type === "FOLDER" && it.loadType === "LINKED" && it.command) {
        try {
          const subDoc = await getDoc(doc(db, "configuration", it.command));
          if (subDoc.exists()) {
            const subItems: DashboardItem[] = subDoc.data()?.items || [];
            const foundInSub = await scanItemsAsync(subItems);
            if (foundInSub) return foundInSub;
          }
        } catch (err) {
          console.error("Linked folder deep scan error:", err);
        }
      }
    }
    return null;
  };

  // প্রথমে লোকাল ক্যাশ থেকে স্ক্যান
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: DashboardItem[] = JSON.parse(cached);
        const match = await scanItemsAsync(parsed);
        if (match) return match;
      } catch (e) {}
    }
  }

  // ফায়ারবেস মেইন লেআউট থেকে স্ক্যান
  try {
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rootItems: DashboardItem[] = layoutDoc.data()?.items || [];
      return await scanItemsAsync(rootItems);
    }
  } catch (e) {}

  return null;
}