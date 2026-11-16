import { API_BASE_URL } from "@/lib/apiClient";
import { createFolderSlug } from "@/lib/slugUtils";
import { DashboardItem } from "@/types";
import type { AppBundleResponse } from "@/lib/layoutService";

export interface FolderResult {
  title: string;
  items: DashboardItem[];
  canonicalSlug: string;
}

export async function getServerHomeLayout(): Promise<DashboardItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/layout?docId=layout`, {
      next: { revalidate: 1800, tags: ["layout"] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success?: boolean; items?: DashboardItem[] };
    return (data.items || []).filter((item) => !item.isHidden);
  } catch (e) {
    console.error("Failed to fetch server home layout:", e);
    return [];
  }
}

export async function getServerFolderData(rawIdentifier: string): Promise<FolderResult> {
  const identifier = decodeURIComponent(rawIdentifier).trim();

  try {
    const res = await fetch(`${API_BASE_URL}/api/resolve/${encodeURIComponent(identifier)}`, {
      next: { revalidate: 1800, tags: ["layout"] },
    });
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
          items: (data.children || []).filter((it) => !it.isHidden),
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
      const items = (directData.items || []).filter((it) => !it.isHidden);
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

export async function getServerAppBundle(): Promise<AppBundleResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/app-bundle`, {
      next: { revalidate: 1800, tags: ["layout", "bundle"] },
    });
    if (!res.ok) return null;
    return (await res.json()) as AppBundleResponse;
  } catch (e) {
    console.error("Failed to fetch server app bundle:", e);
    return null;
  }
}