import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardItem } from "@/types";

export async function getServerHomeLayout(): Promise<DashboardItem[]> {
  try {
    const layoutDoc = await getDoc(doc(db, "configuration", "layout"));
    if (layoutDoc.exists()) {
      const rawItems: DashboardItem[] = layoutDoc.data()?.items || [];
      return rawItems.filter((item) => !item.isHidden);
    }
  } catch (e) {
    console.error("Failed to fetch server layout:", e);
  }
  return [];
}