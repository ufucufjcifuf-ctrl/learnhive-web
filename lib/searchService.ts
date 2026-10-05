import { DashboardItem } from "@/types";

export interface RankedSearchResult {
  item: DashboardItem;
  score: number;
}

// অ্যান্ড্রয়েড সার্চ অ্যালগরিদমের হুবহু সংস্করণ
export function searchItemsWithRanking(
  items: DashboardItem[],
  query: string
): DashboardItem[] {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();

  const ranked: RankedSearchResult[] = items.map((item) => {
    let score = 0;
    const title = (item.title || "").toLowerCase();
    const sub = (item.subtitle || "").toLowerCase();

    // টাইটেলের শুরুতে মিললে +১০০
    if (title.startsWith(q)) {
      score += 100;
    } else if (title.includes(q)) {
      // টাইটেলের ভেতরে মিললে +৮০
      score += 80;
    }

    // সাবটাইটেলে মিললে +৫০
    if (sub.includes(q)) {
      score += 50;
    }

    return { item, score };
  });

  // স্কোর অনুযায়ী বড় থেকে ছোট সাজানো
  return ranked
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}