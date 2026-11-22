import { API_BASE_URL } from "@/lib/apiClient";
import { createFolderSlug } from "@/lib/slugUtils";
import { DashboardItem } from "@/types";

export interface FolderResult {
  title: string;
  items: DashboardItem[];
  canonicalSlug: string;
}

export interface SitemapIndexItem {
  id: string;
  title: string;
  type: string;
  command: string;
  slug: string | null;
  timestamp: number;
}

async function getServerAssetMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/media/assets`, {
      next: { revalidate: 1800, tags: ["layout", "media"] },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      images?: { imageName?: string; imageUrl?: string }[];
    };
    const map: Record<string, string> = {};
    for (const img of data.images || []) {
      if (img.imageName && img.imageUrl) {
        map[img.imageName.trim().toLowerCase()] = img.imageUrl.trim();
      }
    }
    return map;
  } catch {
    return {};
  }
}

function resolveServerIconUrl(
  rawIcon: string | null | undefined,
  assetMap: Record<string, string>
): string | null {
  if (!rawIcon) return rawIcon ?? null;
  const trimmed = rawIcon.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/media/")) return `${API_BASE_URL}${trimmed}`;
  if (trimmed.startsWith("media/")) return `${API_BASE_URL}/${trimmed}`;
  const mapped = assetMap[trimmed.toLowerCase()];
  if (mapped) {
    if (mapped.startsWith("/media/")) return `${API_BASE_URL}${mapped}`;
    if (mapped.startsWith("media/")) return `${API_BASE_URL}/${mapped}`;
    return mapped;
  }
  return trimmed;
}

function hydrateItemsAssets(
  items: DashboardItem[],
  assetMap: Record<string, string>
): DashboardItem[] {
  return items
    .filter((item) => !item.isHidden)
    .map((item) => ({
      ...item,
      iconUrl: resolveServerIconUrl(item.iconUrl, assetMap),
      embeddedItems: item.embeddedItems
        ? hydrateItemsAssets(item.embeddedItems, assetMap)
        : item.embeddedItems,
    }));
}

export async function getServerHomeLayout(): Promise<DashboardItem[]> {
  try {
    const [res, assetMap] = await Promise.all([
      fetch(`${API_BASE_URL}/api/layout?docId=layout`, {
        next: { revalidate: 1800, tags: ["layout"] },
      }),
      getServerAssetMap(),
    ]);
    if (!res.ok) return [];
    const data = (await res.json()) as { success?: boolean; items?: DashboardItem[] };
    return hydrateItemsAssets(data.items || [], assetMap);
  } catch (e) {
    console.error("Failed to fetch server home layout:", e);
    return [];
  }
}

export async function getServerFolderData(rawIdentifier: string): Promise<FolderResult> {
  const identifier = decodeURIComponent(rawIdentifier).trim();

  try {
    const [res, assetMap] = await Promise.all([
      fetch(`${API_BASE_URL}/api/resolve/${encodeURIComponent(identifier)}`, {
        next: { revalidate: 1800, tags: ["layout"] },
      }),
      getServerAssetMap(),
    ]);

    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        canonicalSlug?: string;
        item?: DashboardItem;
        children?: DashboardItem[];
      };
      if (data.item) {
        return {
          title: data.item.title || "Folder",
          items: hydrateItemsAssets(data.children || [], assetMap),
          canonicalSlug:
            data.canonicalSlug ||
            createFolderSlug(data.item.title, data.item.command || data.item.id, data.item.slug),
        };
      }
    }

    const directRes = await fetch(
      `${API_BASE_URL}/api/layout?docId=${encodeURIComponent(identifier)}`,
      { next: { revalidate: 1800, tags: ["layout"] } }
    );
    if (directRes.ok) {
      const directData = (await directRes.json()) as { items?: DashboardItem[] };
      const items = hydrateItemsAssets(directData.items || [], assetMap);
      if (items.length > 0) {
        return {
          title: "Folder Contents",
          items,
          canonicalSlug: createFolderSlug("folder", identifier),
        };
      }
    }
  } catch (err) {
    console.error("Failed to load server folder data:", err);
  }

  return { title: "Folder", items: [], canonicalSlug: identifier };
}

export async function getServerSitemapIndex(): Promise<SitemapIndexItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sitemap-index`, {
      next: { revalidate: 1800, tags: ["layout"] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: SitemapIndexItem[] };
    return data.items || [];
  } catch (e) {
    console.error("Failed to fetch server sitemap index:", e);
    return [];
  }
}