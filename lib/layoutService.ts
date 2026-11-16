import { apiFetch } from "@/lib/apiClient";
import { seedAssetImagesCache } from "@/lib/imageService";
import {
  computeDeterministicHash,
  createExamSlug,
  createFolderSlug,
  createNoteSlug,
  extractLegacyShortHash,
} from "@/lib/slugUtils";
import { AppMainConfig, DashboardItem, PremiumConfig } from "@/types";

export interface AppBundleResponse {
  success: boolean;
  contentVersion: number;
  mainConfig: AppMainConfig;
  premiumConfig: PremiumConfig;
  homeItems: DashboardItem[];
  linkedFolders: Record<string, DashboardItem[]>;
  searchIndex?: DashboardItem[];
  assetMap: Record<string, string>;
}

const BUNDLE_CACHE_KEY = "learnhive_app_bundle_v2";
let inflightBundle: Promise<AppBundleResponse | null> | null = null;
let lastBundleFetchMs = 0;

export function cacheEmbeddedTree(_items?: DashboardItem[]): void {
  // Handled centrally by /api/app-bundle cache
}

function flattenSearchableTree(
  homeItems: DashboardItem[],
  linkedFolders: Record<string, DashboardItem[]>
): DashboardItem[] {
  const seen = new Set<string>();
  const flat: DashboardItem[] = [];

  const walk = (list: DashboardItem[]) => {
    for (const item of list) {
      if (item.isHidden || seen.has(item.id)) continue;
      seen.add(item.id);
      flat.push(item);
      if (item.embeddedItems && item.embeddedItems.length > 0) {
        walk(item.embeddedItems);
      }
    }
  };

  walk(homeItems);
  for (const [scope, items] of Object.entries(linkedFolders)) {
    if (scope !== "contact") {
      walk(items);
    }
  }

  return flat;
}

export async function getAppBundle(forceRefresh = false): Promise<AppBundleResponse | null> {
  if (typeof window !== "undefined" && !forceRefresh && Date.now() - lastBundleFetchMs < 60_000) {
    const raw = localStorage.getItem(BUNDLE_CACHE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as AppBundleResponse;
      } catch {
        // Continue to network fetch
      }
    }
  }

  if (inflightBundle && !forceRefresh) return inflightBundle;

  inflightBundle = apiFetch<AppBundleResponse>("/api/app-bundle", { cache: "no-store" })
    .then((bundle) => {
      if (bundle && bundle.success && typeof window !== "undefined") {
        lastBundleFetchMs = Date.now();
        try {
          localStorage.setItem(BUNDLE_CACHE_KEY, JSON.stringify(bundle));
        } catch {
          // Ignore quota error
        }
        if (bundle.assetMap) {
          seedAssetImagesCache(bundle.assetMap);
        }
      }
      return bundle;
    })
    .catch((err) => {
      console.error("Failed to fetch app bundle:", err);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(BUNDLE_CACHE_KEY);
        if (raw) {
          try {
            return JSON.parse(raw) as AppBundleResponse;
          } catch {
            return null;
          }
        }
      }
      return null;
    })
    .finally(() => {
      inflightBundle = null;
    });

  return inflightBundle;
}

export async function getCachedHomeLayout(): Promise<DashboardItem[]> {
  const bundle = await getAppBundle();
  if (bundle?.homeItems) {
    return bundle.homeItems.filter((it) => !it.isHidden);
  }
  try {
    const res = await apiFetch<{ success: boolean; items: DashboardItem[] }>("/api/layout?docId=layout");
    return (res.items || []).filter((it) => !it.isHidden);
  } catch {
    return [];
  }
}

export async function getAllSearchableItems(): Promise<DashboardItem[]> {
  const bundle = await getAppBundle();
  if (bundle) {
    if (bundle.searchIndex && bundle.searchIndex.length > 0) {
      return bundle.searchIndex.filter((it) => !it.isHidden);
    }
    return flattenSearchableTree(bundle.homeItems || [], bundle.linkedFolders || {});
  }
  return getCachedHomeLayout();
}

export async function getPublicConfigs(): Promise<{
  main: AppMainConfig;
  premium: PremiumConfig;
}> {
  try {
    const res = await apiFetch<{ success: boolean; main: AppMainConfig; premium: PremiumConfig }>(
      "/api/config/public"
    );
    return { main: res.main || {}, premium: res.premium || {} };
  } catch {
    const bundle = await getAppBundle();
    return {
      main: bundle?.mainConfig || {},
      premium: bundle?.premiumConfig || {
        instructions: "",
        whatsappNumber: "",
        facebookLink: "",
        packages: [],
      },
    };
  }
}

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

export async function getFolderItems(folderId: string): Promise<DashboardItem[]> {
  if (!folderId) return [];
  const cleanId = folderId.trim();

  const bundle = await getAppBundle();
  if (bundle) {
    if (bundle.linkedFolders?.[cleanId]) {
      return bundle.linkedFolders[cleanId].filter((it) => !it.isHidden);
    }
    const inHome = findFolderInList(bundle.homeItems || [], cleanId);
    if (inHome) return inHome;
    for (const list of Object.values(bundle.linkedFolders || {})) {
      const found = findFolderInList(list, cleanId);
      if (found) return found;
    }
  }

  try {
    const res = await apiFetch<{ success: boolean; items: DashboardItem[] }>(
      `/api/layout?docId=${encodeURIComponent(cleanId)}`
    );
    return (res.items || []).filter((it) => !it.isHidden);
  } catch {
    return [];
  }
}

export async function findItemDeeply(identifier: string): Promise<DashboardItem | null> {
  const target = decodeURIComponent(identifier).trim().toLowerCase();
  if (!target) return null;

  const bundle = await getAppBundle();
  if (bundle) {
    const matchInList = (list: DashboardItem[]): DashboardItem | null => {
      for (const it of list) {
        const rawId = (it.command || it.id || "").trim();
        const customSlug = (it.slug || "").trim().toLowerCase();
        const folderSlug = createFolderSlug(it.title, rawId, it.slug).toLowerCase();
        const examSlug = createExamSlug(it.title, rawId, it.slug).toLowerCase();
        const noteSlug = createNoteSlug(it.title, rawId, it.slug).toLowerCase();
        const detHash = computeDeterministicHash(rawId);
        const legHash = extractLegacyShortHash(rawId);

        if (
          rawId.toLowerCase() === target ||
          it.id.toLowerCase() === target ||
          (it.command && it.command.toLowerCase() === target) ||
          customSlug === target ||
          folderSlug === target ||
          examSlug === target ||
          noteSlug === target ||
          (target.includes("-") && (target.endsWith(`-${detHash}`) || target.endsWith(`-${legHash}`)))
        ) {
          return it;
        }
      }
      return null;
    };

    const flattened = flattenSearchableTree(bundle.homeItems || [], bundle.linkedFolders || {});
    const hit = matchInList(flattened);
    if (hit) return hit;

    if (bundle.linkedFolders?.contact) {
      const hitContact = matchInList(bundle.linkedFolders.contact);
      if (hitContact) return hitContact;
    }
  }

  try {
    const res = await apiFetch<{ success: boolean; item: DashboardItem }>(
      `/api/resolve/${encodeURIComponent(identifier)}`
    );
    return res.item || null;
  } catch {
    return null;
  }
}