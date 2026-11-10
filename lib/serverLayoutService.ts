import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";
import { createFolderSlug, extractShortHash } from "@/lib/slugUtils";

export interface FolderResult {
  title: string;
  items: DashboardItem[];
  canonicalSlug: string;
}

// ১০ লেয়ারের গভীর সাব-ফোল্ডারও যেন এক নিমিষে খুঁজে বের করতে পারে এমন রিকার্সিভ সার্চ ইঞ্জিন
async function searchFolderDeeply(
  items: DashboardItem[],
  targetIdentifier: string
): Promise<FolderResult | null> {
  const target = decodeURIComponent(targetIdentifier).trim().toLowerCase();

  for (const item of items) {
    const rawId = (item.command || item.id || "").trim().toLowerCase();
    const cleanSlug = createFolderSlug(item.title, item.command || item.id, item.slug).toLowerCase();
    const customSlug = (item.slug || "").trim().toLowerCase();
    const itemHash = extractShortHash(item.command || item.id);

    // ম্যাচিং চেকার: আইডি, স্লাগ, কাস্টম স্লাগ বা হাইব্রিড হ্যাশ
    const isMatched =
      rawId === target ||
      item.id.toLowerCase() === target ||
      item.command?.toLowerCase() === target ||
      customSlug === target ||
      cleanSlug === target ||
      (target.includes("-") && target.endsWith(`-${itemHash}`));

    // ১. লিংকড ফোল্ডার হলে ফায়ারস্টোরের সাব-ডকুমেন্ট রিড করে ভেতর থেকে ডাটা আনা
    if (item.type === "FOLDER" && item.loadType === "LINKED" && item.command) {
      try {
        const linkedSnap = await getDoc(doc(db, "configuration", item.command));
        if (linkedSnap.exists()) {
          const linkedItems = (linkedSnap.data()?.items as DashboardItem[]) || [];

          if (isMatched) {
            return {
              title: item.title,
              items: linkedItems.filter((it) => !it.isHidden),
              canonicalSlug: cleanSlug,
            };
          }

          const foundInLinked = await searchFolderDeeply(linkedItems, targetIdentifier);
          if (foundInLinked) return foundInLinked;
        }
      } catch (e) {
        console.error("Deep recursive linked search error:", e);
      }
    } else if (isMatched) {
      // 🔥 পারফেক্ট ফিক্স: এমবেডেড ফোল্ডার খালি হলেও যেন তার নিজস্ব আসল টাইটেল প্রদর্শন করে
      return {
        title: item.title,
        items: (item.embeddedItems || []).filter((it) => !it.isHidden),
        canonicalSlug: cleanSlug,
      };
    }

    // ২. এমবেডেড সাব-ফোল্ডারের গভীরে রিকার্সিভলি খোঁজা
    if (item.embeddedItems && item.embeddedItems.length > 0) {
      const found = await searchFolderDeeply(item.embeddedItems, targetIdentifier);
      if (found) return found;
    }
  }

  return null;
}

// হোম লেআউট ফেচ
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

// সার্ভার থেকে ফোল্ডার ডাটা পাওয়ার প্রধান ফাংশন
export async function getServerFolderData(rawIdentifier: string): Promise<FolderResult> {
  const identifier = decodeURIComponent(rawIdentifier).trim();

  try {
    // ধাপ ১: মূল লেআউট ট্রির সব শাখা-প্রশাখা স্ক্যান
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rootItems = (layoutDoc.data()?.items as DashboardItem[]) || [];
      const found = await searchFolderDeeply(rootItems, identifier);
      if (found) return found;
    }

    // ধাপ ২: সরাসরি ফায়ারস্টোর ডকুমেন্ট চেক (লিংকড ফোল্ডার)
    const directDoc = await getDoc(doc(db, "configuration", identifier));
    if (directDoc.exists()) {
      const data = directDoc.data();
      const rawItems: DashboardItem[] = data?.items || [];
      const title = data?.title || "Folder Contents";
      const cleanSlug = createFolderSlug(title, identifier);
      return {
        title,
        items: rawItems.filter((it) => !it.isHidden),
        canonicalSlug: cleanSlug,
      };
    }
  } catch (err) {
    console.error("Failed to load server folder data:", err);
  }

  return { title: "Folder", items: [], canonicalSlug: identifier };
}