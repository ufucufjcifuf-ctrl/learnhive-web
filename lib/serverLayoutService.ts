import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";

export interface FolderResult {
  title: string;
  items: DashboardItem[];
}

// ফায়ারস্টোর লেআউট ট্রি রিকার্সিভলি স্ক্যান করে যেকোনো ফোল্ডার ও তার কনটেন্ট খুঁজে বের করার সার্ভার ইঞ্জিন
async function searchFolderInItems(
  items: DashboardItem[],
  targetId: string
): Promise<FolderResult | null> {
  for (const item of items) {
    const itemId = (item.command || item.id || "").trim();
    const matchesTarget =
      itemId === targetId ||
      item.id === targetId ||
      item.command === targetId ||
      item.slug === targetId;

    if (matchesTarget) {
      // যদি এটি Embedded ফোল্ডার হয়, তার কনটেন্ট রিটার্ন করো
      if (item.embeddedItems && item.embeddedItems.length > 0) {
        return {
          title: item.title,
          items: item.embeddedItems.filter((it) => !it.isHidden),
        };
      }
    }

    // ১. এমবেডেড আইটেমগুলোর ভেতরে রিকার্সিভলি খোঁজা
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const found = await searchFolderInItems(item.embeddedItems, targetId);
      if (found) return found;
    }

    // ২. লিংকড ফোল্ডার হলে ফায়ারস্টোরের সাব-ডকুমেন্ট রিড করে ভেতরে খোঁজা
    if (item.type === "FOLDER" && item.loadType === "LINKED" && item.command) {
      try {
        const linkedSnap = await getDoc(doc(db, "configuration", item.command));
        if (linkedSnap.exists()) {
          const linkedItems = (linkedSnap.data()?.items as DashboardItem[]) || [];

          if (item.command === targetId || item.id === targetId) {
            return {
              title: item.title,
              items: linkedItems.filter((it) => !it.isHidden),
            };
          }

          const foundInLinked = await searchFolderInItems(linkedItems, targetId);
          if (foundInLinked) return foundInLinked;
        }
      } catch (e) {
        console.error("Error searching linked folder on server:", e);
      }
    }
  }

  return null;
}

// হোম লেআউটের জন্য সার্ভার ফাংশন
export async function getServerHomeLayout(): Promise<DashboardItem[]> {
  try {
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rawItems: DashboardItem[] = layoutDoc.data()?.items || [];
      return rawItems.filter((item) => !item.isHidden);
    }
  } catch (e) {
    console.error("Failed to fetch server home layout:", e);
  }
  return [];
}

// যেকেনো ফোল্ডারের জন্য পূর্ণাঙ্গ সার্ভার ডাটা লোডার (জিরো সেশন নির্ভরতা)
export async function getServerFolderData(rawFolderId: string): Promise<FolderResult> {
  const folderId = decodeURIComponent(rawFolderId).trim();

  try {
    // ধাপ ১: মূল লেআউট ডকুমেন্টের গভীরে রিকার্সিভ সার্চ (এমবেডেড ফোল্ডার হ্যান্ডলার)
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rootItems = (layoutDoc.data()?.items as DashboardItem[]) || [];
      const found = await searchFolderInItems(rootItems, folderId);
      if (found) return found;
    }

    // ধাপ ২: সরাসরি ফায়ারস্টোর ডকুমেন্ট চেক (লিংকড ফোল্ডার হ্যান্ডলার)
    const directDoc = await getDoc(doc(db, "configuration", folderId));
    if (directDoc.exists()) {
      const data = directDoc.data();
      const rawItems: DashboardItem[] = data?.items || [];
      return {
        title: data?.title || "Folder Contents",
        items: rawItems.filter((it) => !it.isHidden),
      };
    }
  } catch (err) {
    console.error("Failed to load server folder data:", err);
  }

  return { title: "Folder", items: [] };
}